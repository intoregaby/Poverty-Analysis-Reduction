"""Content-addressed artifact storage with explicit outage semantics (EP-13/OPS-09).

Report bytes and raw evidence are stored by SHA-256, written atomically and re-verified on read.
A failed write never leaves a partial object behind and surfaces as `ObjectStoreUnavailable`
so callers can leave the workflow in its previous state instead of recording a completed side
effect. The local filesystem adapter is what a deployment replaces with its encrypted object
store; the interface and failure contract stay the same.
"""
from __future__ import annotations

import hashlib
import os
import secrets
import time
from pathlib import Path
from typing import Callable


class ObjectStoreUnavailable(RuntimeError):
    """Retryable infrastructure failure: nothing was committed."""


class ObjectIntegrityError(RuntimeError):
    """Stored bytes no longer match their content address."""


def _atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(f".{path.name}.{secrets.token_hex(6)}.tmp")
    try:
        temp.write_bytes(data)
        os.replace(temp, path)
    finally:
        if temp.exists():
            temp.unlink(missing_ok=True)


class ContentAddressedStore:
    def __init__(self, root, max_attempts: int = 3, clock: Callable[[], float] = time.time,
                 writer: Callable[[Path, bytes], None] | None = None):
        if max_attempts < 1:
            raise ValueError("max_attempts must be positive")
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.max_attempts = max_attempts
        self.clock = clock
        self._writer = writer or _atomic_write

    def _path(self, sha256: str, namespace: str) -> Path:
        if not namespace or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-_" for c in namespace):
            raise ValueError("unsafe object namespace")
        if len(sha256) != 64 or any(c not in "0123456789abcdef" for c in sha256):
            raise ValueError("content address must be a full lowercase SHA-256")
        return self.root / namespace / sha256

    def put(self, content: bytes, namespace: str = "objects", content_type: str = "application/octet-stream") -> dict:
        """Store bytes atomically. Existing identical content is verified, never rewritten."""
        if not isinstance(content, (bytes, bytearray)):
            raise TypeError("object content must be bytes")
        data = bytes(content)
        sha = hashlib.sha256(data).hexdigest()
        target = self._path(sha, namespace)
        if target.exists():
            self._verify(target, sha, len(data))
            return {"sha256": sha, "bytes": len(data), "namespace": namespace,
                    "content_type": content_type, "created": False}
        error: Exception | None = None
        for _attempt in range(self.max_attempts):
            try:
                self._writer(target, data)
                self._verify(target, sha, len(data))
                return {"sha256": sha, "bytes": len(data), "namespace": namespace,
                        "content_type": content_type, "created": True}
            except OSError as exc:                       # transport/disk outage: retry the whole object
                error = exc
                target.unlink(missing_ok=True)
        raise ObjectStoreUnavailable(f"object store unavailable after {self.max_attempts} attempts: {error}") from error

    def get(self, sha256: str, namespace: str = "objects") -> bytes:
        target = self._path(sha256, namespace)
        try:
            data = target.read_bytes()
        except FileNotFoundError:
            raise KeyError(sha256) from None
        if hashlib.sha256(data).hexdigest() != sha256:
            raise ObjectIntegrityError(f"object {sha256} failed its content-address check")
        return data

    def exists(self, sha256: str, namespace: str = "objects") -> bool:
        return self._path(sha256, namespace).exists()

    def _verify(self, path: Path, sha256: str, size: int) -> None:
        data = path.read_bytes()
        if len(data) != size or hashlib.sha256(data).hexdigest() != sha256:
            raise ObjectIntegrityError(f"object {sha256} failed its content-address check")
