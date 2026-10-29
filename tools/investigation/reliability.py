"""Design-based reliability checks for calculated district indicators. Aggregate-only."""

from __future__ import annotations

import math

import pandas as pd

from .context import design_variance

MIN_SAMPLE = 30
CAUTION_RSE = 0.15
UNRELIABLE_RSE = 0.30
RULE = ("Application rule, not an NISR standard: fewer than 30 valid records is suppressed; relative standard error above 30% is low "
        "reliability and above 15% is use-with-caution. Intervals use ultimate-cluster Taylor linearization on clust and strata_id with normal 1.96 limits.")


def domain_ratio(frame: pd.DataFrame, domain: pd.Series, included: pd.Series, valid: pd.Series, weight: str) -> dict | None:
    """Weighted share with a design-based standard error; the full survey is kept for domain variance."""
    weights = pd.to_numeric(frame[weight], errors="coerce").astype("float64")
    if weights.isna().any() or (weights <= 0).any():
        raise ValueError("Survey weights must be finite, positive, and present for every record")
    counted = (domain & valid.fillna(False)).astype(float)
    total = float((weights * counted).sum())
    if total <= 0:
        return None
    hit = included.fillna(False).astype(float)
    estimate = float((weights * counted * hit).sum() / total)
    influence = weights * counted * (hit - estimate) / total
    return {"estimate": estimate, "se": math.sqrt(design_variance(frame, influence)), "n": int(counted.sum())}


def grade(estimate: float | None, se: float | None, n: int) -> str:
    if estimate is None or se is None or n < MIN_SAMPLE:
        return "Suppressed"
    if estimate <= 0:
        return "Use with caution" if se > 0 else "Reliable"
    rse = se / estimate
    return "Low reliability" if rse > UNRELIABLE_RSE else "Use with caution" if rse > CAUTION_RSE else "Reliable"


def indicator_entry(label: str, result: dict | None, published: float | None = None) -> dict:
    if result is None:
        return {"indicator": label, "grade": "Suppressed", "sample": 0, "note": "No valid records."}
    estimate, se, n = result["estimate"], result["se"], result["n"]
    entry = {"indicator": label, "estimate_pct": round(100 * estimate, 1), "se_points": round(100 * se, 3),
             "ci_lower": round(max(0.0, 100 * (estimate - 1.96 * se)), 1), "ci_upper": round(min(100.0, 100 * (estimate + 1.96 * se)), 1),
             "relative_se_pct": round(100 * se / estimate, 1) if estimate > 0 else None, "sample": n, "grade": grade(estimate, se, n)}
    if published is not None:
        entry["published_pct"] = published
        entry["matches_published"] = abs(entry["estimate_pct"] - published) < 0.05
    return entry


def assess_district(poverty: pd.DataFrame, housing: pd.DataFrame, persons: pd.DataFrame, participants: set, district: str) -> dict:
    """Intervals and reliability grades for the selected district's calculated indicators."""
    design = housing[["hhid", "strata_id"]].merge(poverty[["hhid", "clust"]], on="hhid", validate="one_to_one")
    if design[["strata_id", "clust"]].isna().any().any():
        raise ValueError("Reliability checks require complete strata and cluster fields")
    grid_yes = ["Yes on grid", "Yes both on grid  and from solar"]
    grid_all = grid_yes + ["Yes from solar", "No"]
    house = housing.merge(design[["hhid", "clust"]], on="hhid", validate="one_to_one")
    people = persons.merge(design, on="hhid", validate="many_to_one")
    poor_frame = poverty.merge(design[["hhid", "strata_id"]], on="hhid", validate="one_to_one")
    poor_frame["vup"] = poor_frame.hhid.isin(participants)
    everyone = pd.Series(True, index=poor_frame.index)
    entries = [
        indicator_entry("Poverty", domain_ratio(poor_frame, poor_frame.district == district, poor_frame.pov_jan == "Poor", everyone, "pop_wt")),
        indicator_entry("Extreme poverty", domain_ratio(poor_frame, poor_frame.district == district, poor_frame.epov_jan == "Extreme Poor", everyone, "pop_wt")),
        indicator_entry("VUP participation among poor households", domain_ratio(poor_frame, poor_frame.district == district, poor_frame.vup, poor_frame.pov_jan == "Poor", "weight")),
        indicator_entry("Grid electricity connection", domain_ratio(house, house.district == district, house.s5cq14.isin(grid_yes), house.s5cq14.isin(grid_all), "weight")),
        indicator_entry("Current health insurance", domain_ratio(people, people.district == district, people.s3q2 == "Yes", people.s3q2.isin(["Yes", "No"]), "weight")),
    ]
    return {"district": district, "indicators": entries, "rule": RULE,
            "summary": {grade_name: sum(1 for item in entries if item["grade"] == grade_name) for grade_name in ["Reliable", "Use with caution", "Low reliability", "Suppressed"]}}


def reconcile_national(national: dict, published: dict[str, float]) -> list[dict]:
    """Compare every calculated national rate with every published reference, rather than stopping at the first mismatch."""
    return [{"indicator": key, "calculated": national.get(key), "published": value, "matches": national.get(key) == value} for key, value in published.items()]
