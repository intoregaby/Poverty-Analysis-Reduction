"""Report repository with backend release authorisation, expiring revocable signed links
and superseded-version handling (EP-08 / EP-14 boundary).

There is exactly one path to bytes: `fetch(token)` for a signed link, or `export(...)` for an
authenticated principal. Both call `_authorise`, which re-reads the report status and the
revocation list on every request -- a link never outlives a revocation or a newer version."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass, field
from typing import Callable

from . import contracts, release_gate


class AccessDenied(PermissionError):
    def __init__(self, code: str, detail: str = ""):
        super().__init__(f"{code}: {detail}" if detail else code)
        self.code = code


@dataclass
class Principal:
    user_id: str
    roles: frozenset
    districts: frozenset = frozenset()     # empty means no district restriction for admin/national roles
    tenant: str = "nisr"


@dataclass
class ReportRepository:
    signing_key: bytes
    clock: Callable[[], float] = time.time
    reports: dict = field(default_factory=dict)       # (report_id, version) -> record
    current: dict = field(default_factory=dict)       # report_id -> current version
    revoked_tokens: set = field(default_factory=set)

    def __post_init__(self):
        if not isinstance(self.signing_key, (bytes, bytearray)) or len(self.signing_key) < 32:
            raise ValueError("signing key must be >= 32 random bytes supplied by the deployment")

    # ---- lifecycle --------------------------------------------------------------------------
    def create(self, document: dict, ast: dict, author_id: str, geography: str, tenant: str = "nisr") -> dict:
        contracts.validate("report-document", document)
        key = (document["report_id"], document["report_version"])
        if key in self.reports:
            raise ValueError("report version already exists and is immutable")
        rec = {"document": dict(document), "ast": ast, "ast_sha256": contracts.canonical_hash(ast),
               "author": author_id, "geography": geography, "tenant": tenant, "status": "draft", "signatures": []}
        self.reports[key] = rec
        return rec

    def approve(self, report_id: str, version: str, checks: dict, flags: set, signatures: list) -> release_gate.Decision:
        rec = self.reports[(report_id, version)]
        if contracts.canonical_hash(rec["ast"]) != rec["ast_sha256"]:
            return release_gate.Decision("deny", ("AST changed after freezing",))
        d = release_gate.evaluate(checks, flags, signatures, rec["author"])
        rec["status"] = {"publish": "approved", "restricted_draft": "restricted_draft", "deny": "qa_failed"}[d.status]
        if d.status == "publish":
            rec["signatures"] = list(signatures)
            old = self.current.get(report_id)
            if old and old != version:
                self.reports[(report_id, old)]["status"] = "superseded"
            self.current[report_id] = version
        return d

    def revoke(self, report_id: str, version: str, by: Principal) -> None:
        if "release_reviewer" not in by.roles:
            raise AccessDenied("FORBIDDEN", "revocation requires release_reviewer")
        self.reports[(report_id, version)]["status"] = "revoked"

    # ---- access ---------------------------------------------------------------------------
    def _authorise(self, report_id: str, version: str, principal: Principal | None, via_token: bool):
        rec = self.reports.get((report_id, version))
        if rec is None:
            raise AccessDenied("NOT_FOUND")
        if principal is not None:
            if principal.tenant != rec["tenant"]:
                raise AccessDenied("NOT_FOUND", "cross-tenant")          # indistinguishable from absent
            if principal.districts and rec["geography"] not in principal.districts:
                raise AccessDenied("FORBIDDEN", "district scope")
        st = rec["status"]
        if st == "superseded":
            raise AccessDenied("SUPERSEDED", f"newer version {self.current.get(report_id)} exists")
        if st == "revoked":
            raise AccessDenied("REVOKED")
        if st != "approved":
            raise AccessDenied("NOT_RELEASED", f"status is {st}")
        if contracts.canonical_hash(rec["ast"]) != rec["ast_sha256"]:
            raise AccessDenied("INTEGRITY", "AST hash mismatch")
        return rec

    def export(self, report_id: str, version: str, principal: Principal, fmt: str, renderer: Callable) -> bytes:
        rec = self._authorise(report_id, version, principal, via_token=False)
        return renderer(rec["ast"], fmt)

    def sign_url(self, report_id: str, version: str, principal: Principal, ttl_s: int = 900) -> str:
        self._authorise(report_id, version, principal, via_token=False)
        payload = {"r": report_id, "v": version, "exp": self.clock() + ttl_s, "jti": secrets.token_hex(8),
                   "sub": principal.user_id, "tenant": principal.tenant}
        body = base64.urlsafe_b64encode(json.dumps(payload, sort_keys=True).encode()).decode().rstrip("=")
        sig = hmac.new(self.signing_key, body.encode(), hashlib.sha256).hexdigest()
        return f"{body}.{sig}"

    def _parse(self, token: str) -> dict:
        try:
            body, sig = token.rsplit(".", 1)
            want = hmac.new(self.signing_key, body.encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(sig, want):
                raise AccessDenied("BAD_SIGNATURE")
            return json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        except AccessDenied:
            raise
        except Exception as e:  # noqa: BLE001
            raise AccessDenied("BAD_TOKEN") from e

    def fetch(self, token: str, renderer: Callable, fmt: str = "html") -> bytes:
        p = self._parse(token)
        if p["jti"] in self.revoked_tokens:
            raise AccessDenied("TOKEN_REVOKED")
        if self.clock() > p["exp"]:
            raise AccessDenied("TOKEN_EXPIRED")
        rec = self._authorise(p["r"], p["v"], None, via_token=True)
        if rec["tenant"] != p["tenant"]:
            raise AccessDenied("NOT_FOUND")
        return renderer(rec["ast"], fmt)

    def revoke_token(self, token: str, by: Principal) -> None:
        if not ({"release_reviewer", "admin"} & set(by.roles)):
            raise AccessDenied("FORBIDDEN")
        self.revoked_tokens.add(self._parse(token)["jti"])

    def fetch_unsigned(self, report_id: str, version: str, renderer: Callable, fmt: str = "html") -> bytes:
        """Any route addressed by guessable ids with no credential."""
        raise AccessDenied("UNAUTHENTICATED", "unsigned report access is not permitted")
