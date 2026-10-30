"""Independent statistical validation gate (EP-04): compares a primary estimate with a
reference from a DIFFERENT code path, for both point estimate and SE, using
pre-registered tolerances loaded from the kit policy file (never relaxed per test)."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import math

import yaml

TOLERANCE_FILE = Path(__file__).resolve().parents[2] / "IREME_INSIGHT_FULL_ENGINE_KIT" / "09_MACHINE_CONTRACTS" / "policies" / "statistical_tolerances.yaml"


def load_tolerances(path: Path = TOLERANCE_FILE) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


@dataclass(frozen=True)
class Reference:
    point: float
    se: float
    code_path: str       # e.g. "python-jackknife", "r-survey"; must differ from the primary path
    source: str          # "computed" | "hard_coded_constant" | "published_document"


@dataclass(frozen=True)
class Verdict:
    status: str          # validated | mismatch | blocked
    reasons: tuple
    point_diff: float | None = None
    se_diff: float | None = None


def cross_validate(primary_point: float, primary_se: float, primary_code_path: str, ref: Reference,
                   tier: str = "fixture_only", scale: float = 100.0) -> Verdict:
    """tier 'fixture_only' uses the registered fixture tolerances; 'production' is blocked until a
    survey statistician approves tolerances (policy file `production.approved`)."""
    tol = load_tolerances()
    if tier not in ("fixture_only", "production"):
        return Verdict("blocked", ("unknown validation tier",))
    values = (primary_point, primary_se, ref.point, ref.se, scale)
    if any(not isinstance(v, (int, float)) or not math.isfinite(v) for v in values):
        return Verdict("blocked", ("estimates, standard errors and scale must be finite numbers",))
    if primary_se < 0 or ref.se < 0 or scale <= 0:
        return Verdict("blocked", ("standard errors must be nonnegative and scale positive",))
    if tier == "production" and not tol["production"].get("approved"):
        return Verdict("blocked", ("production tolerances not approved by survey statistician",))
    if tier == "production":  # pragma: no cover - requires approved production tolerances
        raise NotImplementedError("production tolerance lookup requires approved per-indicator entries")
    if ref.source != "computed":
        return Verdict("blocked", (f"reference source '{ref.source}' is not an independent computation",))
    if ref.code_path == primary_code_path:
        return Verdict("blocked", ("reference shares the primary code path: not independent",))
    pt_tol = tol["fixture_only"]["weighted_rate_absolute_percent_points"]
    se_tol = tol["fixture_only"]["standard_error_absolute_percent_points"]
    pd = abs(primary_point - ref.point) * scale
    sd = abs(primary_se - ref.se) * scale
    reasons = []
    if pd > pt_tol:
        reasons.append(f"point estimate differs by {pd:.3e} pp > {pt_tol}")
    if sd > se_tol:
        reasons.append(f"standard error differs by {sd:.3e} pp > {se_tol}")
    return Verdict("mismatch" if reasons else "validated", tuple(reasons), pd, sd)
