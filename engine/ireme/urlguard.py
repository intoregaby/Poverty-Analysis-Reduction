"""SSRF guard for official-source retrieval (PRIV-09): https only, host allowlist, every resolved
address must be public, and each redirect hop is re-checked by calling check_url again."""
from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlsplit


class UrlRejected(ValueError):
    pass


def default_resolver(host: str) -> list[str]:
    return sorted({i[4][0] for i in socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)})


def check_url(url: str, allowed_hosts: set[str], resolver=default_resolver) -> str:
    parts = urlsplit(url)
    if parts.scheme != "https":
        raise UrlRejected(f"scheme '{parts.scheme}' not allowed")
    if parts.username or parts.password:
        raise UrlRejected("credentials in URL")
    host = (parts.hostname or "").lower().rstrip(".")
    if not host:
        raise UrlRejected("no host")
    try:
        addrs = [str(ipaddress.ip_address(host))]
        literal = True
    except ValueError:
        literal = False
    if not any(host == h or host.endswith("." + h) for h in allowed_hosts):
        raise UrlRejected(f"host '{host}' not in allowlist")
    if not literal:
        addrs = resolver(host)
    if not addrs:
        raise UrlRejected("host does not resolve")
    for a in addrs:
        ip = ipaddress.ip_address(a)
        mapped = getattr(ip, "ipv4_mapped", None)
        if mapped is not None:
            ip = mapped
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            raise UrlRejected(f"resolves to non-public address {a}")
    return url
