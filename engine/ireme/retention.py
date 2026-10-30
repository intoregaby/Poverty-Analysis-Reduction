"""Dataset retention enforcement on top of the immutable catalog (PRIV-15).

A dataset revision may carry a retention end. Once that instant is reached the catalog refuses
to authorise *any* use of the dataset, and the API records the denied attempt. Enforcement is
evaluated against the request clock, never cached, so an expired licence cannot remain usable
through a long-lived process.
"""
from __future__ import annotations

from datetime import datetime, timezone


class RetentionExpired(PermissionError):
    pass


def retention_end(dataset: dict):
    value = dataset.get("retention_expires_at")
    return datetime.fromisoformat(value.replace("Z", "+00:00")) if value else None


def enforce(dataset: dict, at: datetime | None = None) -> None:
    end = retention_end(dataset)
    if end is None:
        return
    at = at or datetime.now(timezone.utc)
    if at.tzinfo is None:
        raise ValueError("retention evaluation requires a timezone")
    if at >= end:
        raise RetentionExpired("Dataset retention period has expired")
