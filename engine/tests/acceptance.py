"""Marks a test as evidence for one or more acceptance-matrix scenarios.

    @acceptance("SCI-01", evidence="synthetic")
    def test_weighted_headcount(self): ...

`evidence` is "synthetic" (hand-computed fixture) or "real" (licensed/official data
or live service). Scenarios that the registry flags as `real_evidence_required`
are only satisfied by a passing test declared with evidence="real".
"""
from __future__ import annotations

from typing import Callable


def acceptance(*scenario_ids: str, evidence: str = "synthetic") -> Callable:
    if evidence not in ("synthetic", "real"):
        raise ValueError(evidence)

    def deco(fn: Callable) -> Callable:
        existing = list(getattr(fn, "_acceptance", []))
        existing.extend((sid, evidence) for sid in scenario_ids)
        fn._acceptance = existing
        return fn

    return deco
