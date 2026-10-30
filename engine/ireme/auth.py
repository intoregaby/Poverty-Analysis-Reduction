"""JWT authentication and authorization for the governed API.

Issuer, audience and JWKS URL are deployment configuration, never request fields.
Only server-managed app_metadata grants roles/scopes. Hosted identity-provider
configuration, revocation infrastructure and penetration tests remain required.
"""
from dataclasses import dataclass
import json
import re
import threading
import time
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

import jwt


class AuthenticationError(PermissionError):
    pass


class IdentityProviderUnavailable(RuntimeError):
    pass


class AuthorizationError(PermissionError):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def fetch_jwks(url):
    try:
        with build_opener(NoRedirect()).open(Request(url, headers={'Accept': 'application/json'}), timeout=10) as response:
            body = response.read(256001)
            if len(body) > 256000:
                raise ValueError('JWKS too large')
            return json.loads(body)
    except Exception:
        raise IdentityProviderUnavailable('Identity-provider keys unavailable') from None


@dataclass(frozen=True)
class Principal:
    subject: str
    tenant: str
    roles: frozenset
    districts: frozenset
    national_scope: bool
    assurance: str
    expires_at: int


class TokenVerifier:
    def __init__(self, issuer, audience, jwks_url, fetch=fetch_jwks, cache_seconds=60, clock=time.monotonic):
        issuer_url, key_url = urlsplit(issuer), urlsplit(jwks_url)
        if issuer_url.scheme != 'https' or key_url.scheme != 'https' or not issuer_url.hostname:
            raise ValueError('Configured identity endpoints must use HTTPS')
        if issuer_url.netloc != key_url.netloc or any(p.username is not None or p.password is not None
                or p.fragment or p.query for p in (issuer_url, key_url)):
            raise ValueError('JWKS must belong to the configured identity authority')
        if not audience or not 0 < cache_seconds <= 300:
            raise ValueError('Audience and bounded key-cache lifetime required')
        self.issuer, self.audience, self.url = issuer, audience, jwks_url
        self.fetch, self.ttl, self.clock = fetch, cache_seconds, clock
        self.keys, self.loaded, self.last_refresh = {}, -float('inf'), -float('inf')
        self.lock = threading.Lock()

    def _key(self, kid, algorithm):
        with self.lock:
            now = self.clock()
            stale = now - self.loaded >= self.ttl
            unknown = (kid, algorithm) not in self.keys
            if stale and now - self.last_refresh < 5:
                raise IdentityProviderUnavailable('Identity-provider key refresh temporarily unavailable')
            if stale or (unknown and now - self.last_refresh >= 5):
                self.last_refresh = now
                document = self.fetch(self.url)
                entries = document.get('keys', [])
                if not entries or len(entries) > 32:
                    raise IdentityProviderUnavailable('Invalid identity-provider key set')
                keys, seen = {}, set()
                try:
                    for value in entries:
                        key_id = value['kid']
                        if key_id in seen:
                            raise ValueError('duplicate key identifier')
                        seen.add(key_id)
                        alg = value.get('alg') or {'RSA': 'RS256', 'EC': 'ES256'}.get(value.get('kty'))
                        if alg not in ('RS256', 'ES256') or value.get('use', 'sig') != 'sig':
                            continue
                        if 'key_ops' in value and 'verify' not in value['key_ops']:
                            continue
                        key = jwt.PyJWK.from_dict(value, algorithm=alg).key
                        if alg == 'RS256' and key.key_size < 2048:
                            raise ValueError('RSA key too small')
                        if alg == 'ES256' and key.curve.name != 'secp256r1':
                            raise ValueError('ES256 requires P-256')
                        keys[(key_id, alg)] = key
                except Exception:
                    raise IdentityProviderUnavailable('Invalid identity-provider key set') from None
                self.keys, self.loaded = keys, now
            if (kid, algorithm) not in self.keys:
                raise AuthenticationError('Unrecognized signing key')
            return self.keys[(kid, algorithm)]

    def verify(self, authorization):
        if not isinstance(authorization, str) or not authorization.startswith('Bearer ') or len(authorization) > 16384:
            raise AuthenticationError('Bearer authentication required')
        token = authorization[7:]
        try:
            header = jwt.get_unverified_header(token)
            if header.get('crit') or header.get('jku') or header.get('x5u'):
                raise AuthenticationError('Unsupported token header extension')
            kid, algorithm = header.get('kid'), header.get('alg')
            if algorithm not in ('RS256', 'ES256') or not isinstance(kid, str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,128}', kid):
                raise AuthenticationError('Invalid token header')
            key = self._key(kid, algorithm)
            payload = jwt.decode(token, key, algorithms=[algorithm], issuer=self.issuer, audience=self.audience,
                options={'require': ['exp', 'iat', 'sub', 'iss', 'aud'], 'strict_aud': True}, leeway=0)
            if not isinstance(payload['sub'], str) or not payload['sub']:
                raise ValueError('Missing subject')
            if type(payload['exp']) is not int or type(payload['iat']) is not int or payload['exp'] <= payload['iat']:
                raise ValueError('Invalid token lifetime')
            metadata = payload.get('app_metadata', {})
            tenant = metadata.get('tenant_id')
            if not isinstance(tenant, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', tenant):
                raise ValueError('Tenant assignment required')
            roles = metadata.get('roles', [metadata['role']] if 'role' in metadata else [])
            districts = metadata.get('districts', [])
            if not isinstance(roles, list) or not isinstance(districts, list) or not all(isinstance(x, str) and x for x in roles + districts):
                raise ValueError('Invalid permission scopes')
            return Principal(payload['sub'], tenant, frozenset(roles), frozenset(districts),
                             metadata.get('national_scope') is True, payload.get('aal', 'aal1'), payload['exp'])
        except (AuthenticationError, IdentityProviderUnavailable):
            raise
        except Exception:
            raise AuthenticationError('Invalid or expired bearer token') from None


PERMISSIONS = {
    'investigation:create': {'nisr_analyst', 'platform_admin'},
    'investigation:read': {'nisr_analyst', 'platform_admin', 'gov_district', 'statistical_reviewer', 'privacy_reviewer', 'release_reviewer'},
    'report:review': {'statistical_reviewer', 'privacy_reviewer', 'release_reviewer'},
    'report:publish': {'publication_authority'},
    'provider:health': {'platform_admin'},
}


def authorize(principal, action, tenant, district=None, author=None):
    if principal.expires_at <= time.time():
        raise AuthorizationError('Session expired')
    if principal.tenant != tenant:
        raise AuthorizationError('Resource unavailable')
    if action not in PERMISSIONS or not principal.roles.intersection(PERMISSIONS[action]):
        raise AuthorizationError('Permission denied')
    if district is not None and not principal.national_scope and district not in principal.districts:
        raise AuthorizationError('District scope denied')
    if action in ('report:review', 'report:publish'):
        if principal.assurance != 'aal2':
            raise AuthorizationError('Elevated authentication required')
        if author is None or principal.subject == author:
            raise AuthorizationError('Independent reviewer required')
    return principal
