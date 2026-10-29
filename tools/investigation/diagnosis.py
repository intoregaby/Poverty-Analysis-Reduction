"""Turn driver estimates into a ranked, source-linked diagnosis with explicit evidence grades and open research requests."""

from __future__ import annotations

from .knowledge import LIBRARY
from .sources import evidence_source

CAUSAL_STATUS = "Adjusted association. A causal effect is not identified by this survey; the mechanism below is a hypothesis to confirm."


def _source_links(ids: list[str], register: dict) -> list[dict]:
    known = {item["id"]: item for item in register["sources"]}
    links = []
    for source_id in ids:
        item = known.get(source_id)
        if item:
            verified = item["status"] == "Completed" or bool(item.get("cached_evidence"))
            links.append({"id": source_id, "title": item["title"], "publisher": item["publisher"], "url": item.get("original_url") or item["url"],
                          "tier": item.get("tier", 1), "reachable": verified})
    return links


def _concentration(profile: list[dict], group_id: str) -> dict | None:
    candidates = [row for row in profile if row["group"] == group_id and row["status"] == "Estimated" and (row.get("risk_ratio") or 0) > 1]
    return max(candidates, key=lambda row: row.get("share_of_district_poor_pct") or 0) if candidates else None


def _sentence(district: str, group: dict, drivers: dict, concentration: dict | None) -> str:
    gap = drivers["gap_points"]
    side = "above" if gap >= 0 else "below"
    points = abs(group["contribution_points"])
    text = (f"{group['label']} lines up with {points:.1f} percentage points (95% interval {group['ci_lower']:.1f} to {group['ci_upper']:.1f}) "
            f"of {district}'s {abs(gap):.1f}-point gap {side} Rwanda, after the other measured factors are held fixed.")
    if concentration:
        text += (f" {concentration['share_of_district_poor_pct']:.0f}% of the district's poor people live in {concentration['phrase']}, "
                 f"where poverty is {concentration['poverty_with_pct']:.0f}% against {concentration['poverty_without_pct']:.0f}% elsewhere in the district.")
    return text


def diagnose(analysis: dict, drivers: dict, register: dict) -> dict:
    district = drivers["district"]
    groups = {item["id"]: item for item in drivers["groups"]}
    profile = drivers["profile"]
    ranked = []
    for group_id in drivers["ranked_drivers"]:
        group = groups[group_id]
        if group["grade"] == "Not established" or abs(group["contribution_points"]) < 0.25:
            continue
        knowledge = LIBRARY[group_id]
        concentration = _concentration(profile, group_id)
        ranked.append({
            "id": group_id, "rank": len(ranked) + 1, "label": group["label"], "role": group["role"],
            "contribution_points": group["contribution_points"], "ci": [group["ci_lower"], group["ci_upper"]],
            "sign_stability": group["sign_stability"], "grade": group["grade"],
            "finding": _sentence(district, group, drivers, concentration),
            "concentration": {key: concentration[key] for key in ["label", "phrase", "poverty_with_pct", "poverty_without_pct", "share_of_district_poor_pct", "poor_people_with", "sample_with"]} if concentration else None,
            "mechanism_hypothesis": knowledge["mechanism"], "causal_status": CAUSAL_STATUS,
            "confirm_with": knowledge["confirm_with"], "response_families": knowledge["response_families"],
            "evidence_needed": knowledge["evidence_needed"], "sources": _source_links(knowledge["sources"], register),
            "variables": [{"label": v["label"], "contribution_points": v["contribution_points"]} for v in sorted(group["variables"], key=lambda v: -abs(v["contribution_points"])) if abs(v["contribution_points"]) >= 0.05],
        })
    counterweights = [{"id": item["id"], "label": item["label"], "contribution_points": item["contribution_points"], "ci": [item["ci_lower"], item["ci_upper"]],
                       "grade": item["grade"]} for item in (groups[g] for g in drivers["protective_factors"]) if item["grade"] != "Not established" and item["role"] != "marker"]
    markers = [{"id": item["id"], "label": item["label"], "contribution_points": item["contribution_points"], "grade": item["grade"]}
               for item in (groups[g] for g in drivers["marker_groups"]) if item["grade"] != "Not established"]
    gap = drivers["gap_points"]
    share = drivers["explained_excl_markers_share_pct"]
    share_all = drivers["explained_share_pct"]
    if share is None:
        reading = f"{district} is within 2 points of Rwanda, so there is no meaningful gap to decompose. Use the concentrations below to see who is poor."
    elif share >= 60:
        reading = f"Measured household and access factors line up with {share:.0f}% of the gap ({share_all:.0f}% counting signs of deprivation). The ranked drivers are a reasonable starting diagnosis."
    elif share >= 30:
        reading = f"Measured household and access factors line up with {share:.0f}% of the gap ({share_all:.0f}% counting signs of deprivation). Treat the ranked drivers as partial and investigate the rest."
    else:
        reading = f"Measured household and access factors line up with only {share:.0f}% of the gap ({share_all:.0f}% counting signs of deprivation such as durable goods, which are partly a result of poverty). Most of the difference comes from factors this survey does not capture, so local investigation matters more than the ranked list."
    top = ranked[0] if ranked else None
    if top and share is not None and share < 30:
        headline = (f"Only {share:.0f}% of {district}'s {abs(gap):.1f}-point difference from Rwanda is explained by measured household factors. "
                    f"Strongest measured factor: {top['label'].lower()} ({top['contribution_points']:+.1f} points, {top['grade'].lower()}).")
    elif top:
        headline = f"Strongest measured driver in {district}: {top['label'].lower()} ({top['contribution_points']:+.1f} points, {top['grade'].lower()})."
    else:
        headline = f"No measured factor group clearly explains {district}'s difference from Rwanda."

    requests = []
    for item in ranked[:3]:
        for question in item["confirm_with"][:2]:
            requests.append({"topic": item["label"], "question": question, "why": f"Needed to test the hypothesis that {item['label'].lower()} contributes to poverty here.",
                             "kind": "Confirm a driver", "owner": "Analyst with the responsible institution"})
    if share is not None and share < 60:
        requests.append({"topic": "Unexplained gap", "question": f"What local conditions not in EICV7 (markets, land, shocks, programme delivery) differ in {district}?",
                         "why": f"{abs(drivers['unexplained_points']):.1f} of {abs(gap):.1f} points are not explained by measured factors.", "kind": "Close an evidence gap", "owner": "Analyst with district officials"})
    for item in drivers["not_measured"][:3]:
        requests.append({"topic": "Not measured", "question": item, "why": "Listed as unmeasured; it could change the diagnosis.", "kind": "Close an evidence gap", "owner": "NISR or data owner"})
    unreachable = [source["title"] for source in register["sources"] if source["status"] != "Completed" and not source.get("cached_evidence") and source.get("tier", 1) <= 2]
    if unreachable:
        requests.append({"topic": "Source access", "question": f"Retrieve {len(unreachable)} registered source(s) that could not be reached on this run.",
                         "why": "; ".join(unreachable[:4]), "kind": "Close an evidence gap", "owner": "Analyst"})
    for position, item in enumerate(requests, start=1):
        item["id"] = f"R{position}"
        item["status"] = "Open"

    concentrations = [row for row in profile if row["status"] == "Estimated" and (row.get("risk_ratio") or 0) >= 1.2 and (row.get("share_of_district_poor_pct") or 0) >= 20]
    concentrations = sorted(concentrations, key=lambda row: -(row.get("share_of_district_poor_pct") or 0))[:6]
    return {
        "district": district, "headline": headline, "reading": reading, "ranked_drivers": ranked, "counterweights": counterweights,
        "signs_of_deprivation": markers, "concentrations": concentrations, "research_requests": requests,
        "place_effect": drivers["place_effect"], "causal_status": CAUSAL_STATUS, "grading_rule": "Strong: the 95% bootstrap interval excludes zero, the sign holds in 95% of replicates and the contribution is at least 1 point. Moderate: interval excludes zero but the contribution is smaller or less stable. Not established: interval includes zero or the sign flips in more than 10% of replicates.",
        "source_checks": cross_checks(analysis, register), "national_context": national_context(register),
    }


def national_context(register: dict) -> list[dict]:
    source = evidence_source(register, "worldbank-wdi")
    return source.get("indicators", []) if source else []


def cross_checks(analysis: dict, register: dict) -> list[dict]:
    checks = []
    for indicator in national_context(register):
        if indicator["code"] == "SI.POV.NAHC":
            ours = analysis["national"]["poverty"]
            agrees = abs(indicator["value"] - ours) <= 0.15
            checks.append({"claim": "National poverty rate", "ours": ours, "external": indicator["value"], "external_year": indicator["year"], "source": "World Bank WDI (SI.POV.NAHC)",
                           "agrees": agrees, "note": "Independent source matches the figure calculated from EICV7 microdata." if agrees else "The World Bank series differs from the microdata figure. Check vintage and method before relying on either."})
        if indicator["code"] == "EG.ELC.ACCS.ZS":
            ours = analysis["national"]["grid_connection"]
            checks.append({"claim": "National electricity access", "ours": ours, "external": indicator["value"], "external_year": indicator["year"], "source": "World Bank WDI (EG.ELC.ACCS.ZS)",
                           "agrees": None, "note": "Definitions differ: the survey figure counts grid connection only, while the World Bank series includes off-grid solar. They are not expected to match."})
    return checks
