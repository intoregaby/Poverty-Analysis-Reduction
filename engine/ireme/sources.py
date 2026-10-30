"""Official-source retrieval with a hash-verified on-disk cache (EP-05).

Outcomes are explicit and never collapse into "not published":
  retrieved_live | served_from_cache | retrieval_timeout | retrieval_failed_no_cache | cache_corrupt | blocked_url
A live failure falls back to the cache written by `put` (W5), but only after its SHA-256 and byte
length are re-verified against the sidecar manifest (EVD-11)."""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .urlguard import UrlRejected, check_url


class FetchTimeout(TimeoutError):
    pass


@dataclass(frozen=True)
class Retrieval:
    source_id: str
    status: str
    content: bytes | None
    sha256: str | None
    detail: str = ""
    from_cache: bool = False


class SourceCache:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _paths(self, source_id: str):
        safe = "".join(c for c in source_id if c.isalnum() or c in "-_.")
        if safe != source_id or not safe or safe.startswith("."):
            raise ValueError(f"unsafe source id {source_id!r}")
        return self.root / f"{safe}.bin", self.root / f"{safe}.manifest.json"

    def put(self, source_id: str, content: bytes, url: str, release_version: str | None = None) -> dict:
        blob, man = self._paths(source_id)
        manifest = {"source_id": source_id, "url": url, "sha256": hashlib.sha256(content).hexdigest(),
                    "bytes": len(content), "release_version": release_version}
        blob.write_bytes(content)
        man.write_text(json.dumps(manifest, sort_keys=True), encoding="utf-8")
        return manifest

    def get_verified(self, source_id: str):
        """(content, manifest) | None if absent. Raises ValueError if present but corrupt."""
        blob, man = self._paths(source_id)
        if not blob.exists() or not man.exists():
            return None
        manifest = json.loads(man.read_text(encoding="utf-8"))
        data = blob.read_bytes()
        if len(data) != manifest["bytes"] or hashlib.sha256(data).hexdigest() != manifest["sha256"]:
            raise ValueError(f"cache entry {source_id} failed hash verification")
        return data, manifest


def retrieve(source_id: str, url: str, cache: SourceCache, fetch: Callable[[str], bytes],
             allowed_hosts: set[str], resolver=None) -> Retrieval:
    try:
        kw = {"resolver": resolver} if resolver else {}
        check_url(url, allowed_hosts, **kw)
    except UrlRejected as e:
        return Retrieval(source_id, "blocked_url", None, None, str(e))
    try:
        data = fetch(url)
        cache.put(source_id, data, url)
        return Retrieval(source_id, "retrieved_live", data, hashlib.sha256(data).hexdigest())
    except FetchTimeout as e:
        live_status, detail = "retrieval_timeout", str(e) or "timeout"
    except Exception as e:  # noqa: BLE001
        live_status, detail = "retrieval_failed_no_cache", f"{type(e).__name__}: {e}"
    try:
        hit = cache.get_verified(source_id)
    except ValueError as e:
        return Retrieval(source_id, "cache_corrupt", None, None, f"live fetch failed ({detail}); {e}")
    if hit is None:
        return Retrieval(source_id, live_status, None, None, detail)
    data, manifest = hit
    return Retrieval(source_id, "served_from_cache", data, manifest["sha256"],
                     f"live fetch failed ({detail}); verified cache used", from_cache=True)
