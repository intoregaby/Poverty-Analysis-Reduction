"""Where a district differs most from Rwanda, measured against survey uncertainty. Aggregate-only.

This ranks signals by how far the district is from the national value relative to the district's standard error. It shows where the
district stands out; it does not show what causes poverty, and it never recommends an intervention.
"""

from __future__ import annotations

import math

from .trends import PUBLISHED_NATIONAL

STANDS_OUT = 2.0
POSSIBLE = 1.0

# key in analysis["national"], reliability indicator name, label, which direction is worse, note
SIGNALS = (
    ("poverty", "Poverty", "Poverty rate", "higher", "Share of people below the January 2024 poverty line."),
    ("extreme_poverty", "Extreme poverty", "Extreme poverty rate", "higher", "Share of people below the food poverty line."),
    ("vup_among_poor", "VUP participation among poor households", "Poor households reporting VUP participation", "lower",
     "Reported participation in any VUP module. It is not payment receipt or eligibility, so a low figure is not proof of a coverage gap."),
    ("grid_connection", "Grid electricity connection", "Households with grid electricity", "lower", "Includes households that also use solar; excludes solar-only."),
    ("health_insurance", "Current health insurance", "People with current health insurance", "lower", "Mostly community health insurance (Mutuelle de Santé)."),
)
CANNOT_TELL = [
    "What causes poverty here. The measured factors are associations, and most of the gap is usually not explained by them.",
    "Which intervention would work or whether a programme is delivered well. That needs delivery and cost evidence the survey does not hold.",
    "Anything about households not in the survey; district samples are a few hundred households.",
]


def z_worse(value: float, reference: float, se: float, worse: str) -> float | None:
    """Standard errors by which the district is worse than the reference; negative means better."""
    if se is None or se <= 0 or not math.isfinite(se):
        return None
    difference = value - reference
    return round((difference if worse == "higher" else -difference) / se, 2)


def tier(z: float | None, grade: str) -> str:
    if z is None:
        return "context"
    if grade in ("Low reliability", "Suppressed"):
        return "possible" if z >= POSSIBLE else "in_line"
    if z <= -STANDS_OUT:
        return "better"
    return "stands_out" if z >= STANDS_OUT else "possible" if z >= POSSIBLE else "in_line"


def signal_rows(analysis: dict) -> list[dict]:
    reliability = {item["indicator"]: item for item in (analysis.get("reliability") or {}).get("indicators", [])}
    national = analysis["national"]
    rows = []
    for key, indicator, label, worse, note in SIGNALS:
        entry = reliability.get(indicator)
        if not entry or entry.get("estimate_pct") is None or national.get(key) is None:
            continue
        value, reference = entry["estimate_pct"], national[key]
        z = z_worse(value, reference, entry.get("se_points"), worse)
        grade = entry["grade"]
        rows.append({"id": key, "label": label, "district_pct": value, "rwanda_pct": reference, "difference_points": round(value - reference, 1), "worse_when": worse,
                     "z": z, "ci_lower": entry.get("ci_lower"), "ci_upper": entry.get("ci_upper"), "sample": entry.get("sample"), "reliability": grade,
                     "tier": tier(z, grade), "note": note, "source": "NISR EICV7 2023/24 microdata"})
    return rows


def access_row(access: dict | None) -> dict | None:
    """Published FinScope 2024 district figures: share of adults using no formal product. Uncertainty is approximated from the rebuilt estimate."""
    if not access or access.get("status") != "Completed" or not access.get("published_district") or not access.get("published_national"):
        return None
    district, national = access["published_district"], access["published_national"]
    value = round(district["informal_only"] + district["excluded"], 1)
    reference = round(national["informal_only"] + national["excluded"], 1)
    estimate = access["selected"]["strands"]
    n_eff = None
    p = (estimate["informal_only"]["pct"] + estimate["excluded"]["pct"]) / 100
    se_pts = max(estimate["informal_only"]["se_points"], estimate["excluded"]["se_points"])
    if 0 < p < 1 and se_pts > 0:
        n_eff = p * (1 - p) / (se_pts / 100) ** 2
    q = value / 100
    se = 100 * math.sqrt(q * (1 - q) / n_eff + (0.5 / math.sqrt(3) / 100) ** 2) if n_eff else None
    z = z_worse(value, reference, se, "higher")
    return {"id": "formal_access", "label": "Adults not served by any formal provider", "district_pct": value, "rwanda_pct": reference, "difference_points": round(value - reference, 1),
            "worse_when": "higher", "z": z, "ci_lower": None, "ci_upper": None, "sample": access["selected"]["sample_adults"], "reliability": "Approximate",
            "tier": tier(z, "Approximate"), "note": "Informal only plus excluded, from NISR's published FinScope 2024 district figures (whole numbers); the margin is approximated.",
            "source": "NISR FinScope 2024 published district figures"}


def progress_row(trends: dict | None, district: str) -> dict | None:
    """Fall in poverty since 2016/17 on NISR's modelled series, against Rwanda's 12.4-point fall."""
    if not trends or trends.get("status") != "Completed":
        return None
    row = next((item for item in trends["new_series"] if item["district"] == district), None)
    if not row:
        return None
    national_fall = round(PUBLISHED_NATIONAL["EICV5_modelled"] - PUBLISHED_NATIONAL["EICV7"], 1)
    fall = row["decrease_points"]
    return {"id": "poverty_progress", "label": "Fall in poverty since 2016/17", "district_pct": fall, "rwanda_pct": national_fall, "difference_points": round(fall - national_fall, 1), "worse_when": "lower",
            "z": None, "tier": "context", "reliability": "Published", "sample": None,
            "note": f"NISR's modelled 2016/17 rate ({row['eicv5_modelled_pct']}%) against EICV7 ({row['eicv7_published_pct']}%). NISR publishes no district interval, so this is shown for context and not ranked.",
            "source": "NISR EICV7 Poverty Profile, Annex B"}


def measured_row(diagnosis: dict | None, drivers: dict | None) -> dict | None:
    if not drivers or drivers.get("explained_excl_markers_share_pct") is None:
        return None
    ranked = (diagnosis or {}).get("ranked_drivers") or []
    lens = drivers.get("consumption_view")
    living = None if not lens else {
        "shortfall_points": lens["shortfall_points"], "spending_difference_pct": lens["spending_difference_pct"],
        "explained_excl_markers_share_pct": lens["explained_excl_markers_share_pct"], "explained_share_pct": lens["explained_share_pct"],
        "living_standards_out_of_sample_r_squared": lens["explainability"]["living_standards_out_of_sample_r_squared"],
        "poverty_status_out_of_sample_r_squared": lens["explainability"]["poverty_status_out_of_sample_r_squared"]}
    return {"explained_share_pct": drivers["explained_excl_markers_share_pct"], "gap_points": drivers["gap_points"], "unexplained_points": drivers["unexplained_points"],
            "strongest_factor": ranked[0]["label"] if ranked else None, "strongest_points": ranked[0]["contribution_points"] if ranked else None, "living_standards": living}


def reading(district: str, rows: list[dict], measured: dict | None, context: list[dict]) -> tuple[str, list[str]]:
    standing = [row for row in rows if row["tier"] == "stands_out"]
    possible = [row for row in rows if row["tier"] == "possible"]
    standing.sort(key=lambda row: -row["z"])
    possible.sort(key=lambda row: -row["z"])
    flags = []
    if standing:
        lead = "; ".join(f"{row['label'].lower()} ({row['district_pct']}% against {row['rwanda_pct']}% in Rwanda)" for row in standing[:3])
        headline = f"{district} differs most clearly from Rwanda on {lead}."
    elif possible:
        headline = f"{district} shows no measure that is clearly worse than Rwanda; the closest to it is {possible[0]['label'].lower()}."
    else:
        headline = f"{district} is not clearly worse than Rwanda on any measure checked here."
    if measured and measured["explained_share_pct"] < 30:
        flags.append(f"Measured household factors explain only {measured['explained_share_pct']:.0f}% of the poverty gap, so the main cause is not visible in this survey.")
        living = measured.get("living_standards")
        if living and living["explained_excl_markers_share_pct"] is not None and abs(living["shortfall_points"]) >= 2:
            flags.append(f"They line up with {living['explained_excl_markers_share_pct']:.0f}% of the district's difference in typical spending ({living['explained_share_pct']:.0f}% counting signs of deprivation), which is a steadier measure than whether a household is just above or below the poverty line. "
                         f"Even so, household factors predict only about {100 * living['poverty_status_out_of_sample_r_squared']:.0f}% of the variation in who is poor for households they have not seen.")
    slow = next((row for row in context if row["id"] == "poverty_progress" and row["difference_points"] <= -6), None)
    if slow:
        flags.append(f"Poverty fell {slow['district_pct']} points since 2016/17 against {slow['rwanda_pct']} in Rwanda. NISR publishes no district interval, so check whether this district's reduction is clear before reading it as slow progress.")
    if any(row["id"] == "vup_among_poor" and row["tier"] in ("stands_out", "possible") for row in rows):
        flags.append("A low VUP figure is reported participation, not receipt or eligibility; check delivery records before treating it as a gap.")
    return headline, flags


def build_profile(analysis: dict, drivers: dict | None, diagnosis: dict | None, access: dict | None, trends: dict | None) -> dict:
    district = analysis["district"]
    rows = signal_rows(analysis)
    extra = access_row(access)
    if extra:
        rows.append(extra)
    context = [row for row in (progress_row(trends, district),) if row]
    measured = measured_row(diagnosis, drivers)
    headline, flags = reading(district, rows, measured, context)
    ordered = sorted(rows, key=lambda row: -(row["z"] if row["z"] is not None else -99))
    return {
        "district": district, "headline": headline, "flags": flags,
        "stands_out": [row for row in ordered if row["tier"] == "stands_out"], "possible": [row for row in ordered if row["tier"] == "possible"],
        "in_line": [row for row in ordered if row["tier"] == "in_line"], "better": [row for row in ordered if row["tier"] == "better"], "context": context, "measured_factors": measured,
        "method": ("Each signal compares the district with Rwanda. z is the difference divided by the district's standard error, counted in the direction that is worse: "
                   f"{STANDS_OUT:g} or more stands out, {POSSIBLE:g} to {STANDS_OUT:g} is possible, below {POSSIBLE:g} is in line, and {STANDS_OUT:g} or more in the better direction is better than Rwanda. Signals with low reliability cannot stand out. "
                   "This ranks where the district differs; it does not show causes."),
        "cannot_tell": CANNOT_TELL,
    }
