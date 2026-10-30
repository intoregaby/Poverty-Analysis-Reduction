"""Version precedence, conflict detection, tolerance registration, honest roll-ups, citation
read-status and dataset licence checks (EP-05/06/08)."""
from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date


def resolve_official(facts: list[dict]) -> dict:
    """Group official facts by (indicator, geography, period, population, unit). Newest publication_date
    wins and older ones are superseded; equal-date disagreements are a conflict for a human, never averaged."""
    groups = defaultdict(list)
    for f in facts:
        groups[(f["indicator_id"], f["geography_id"], f["period"], f["population"], f["unit"])].append(f)
    chosen, superseded, conflicts = {}, [], []
    for key, fs in groups.items():
        fs = sorted(fs, key=lambda f: date.fromisoformat(f["publication_date"]), reverse=True)
        top = [f for f in fs if f["publication_date"] == fs[0]["publication_date"]]
        if len({f["point_estimate"] for f in top}) > 1:
            conflicts.append({"key": key, "official_fact_ids": [f["official_fact_id"] for f in top],
                              "values": sorted(f["point_estimate"] for f in top)})
            continue
        chosen[key] = fs[0]
        superseded += [f["official_fact_id"] for f in fs[1:]]
    return {"chosen": chosen, "superseded": superseded, "conflicts": conflicts}


@dataclass
class ToleranceRegistry:
    rules: dict = field(default_factory=dict)

    def register(self, indicator_id: str, decimals_published: int, approved_by: str) -> float:
        if not approved_by:
            raise ValueError("tolerance registration needs a named approver")
        tol = 0.5 * 10 ** (-decimals_published)        # half a unit in the last published place
        self.rules[indicator_id] = {"decimals": decimals_published, "tolerance": tol, "approved_by": approved_by}
        return tol

    def tolerance_for(self, indicator_id: str) -> float:
        if indicator_id not in self.rules:
            raise KeyError(f"no registered tolerance for {indicator_id}: refusing ad-hoc tolerance")
        return self.rules[indicator_id]["tolerance"]


STATUSES = ("externally_matched", "external_mismatch", "not_comparable", "retrieval_failed", "reference_not_found",
            "source_conflict", "self_match_rejected")


def summarize(comparisons: list[dict], total_claims: int) -> dict:
    """Roll-up that distinguishes 'could not be read' from 'not published' and accounts for every claim."""
    counts = Counter(c["status"] for c in comparisons)
    unchecked = total_claims - len(comparisons)
    verified = counts.get("externally_matched", 0)
    headline = (f"{verified} of {total_claims} figures independently matched published NISR tables; "
                f"{counts.get('external_mismatch', 0)} differ; {counts.get('not_comparable', 0)} not comparable; "
                f"{counts.get('retrieval_failed', 0)} could not be checked because the source could not be read; "
                f"{counts.get('reference_not_found', 0)} have no published counterpart; {unchecked} not attempted.")
    return {"counts": {s: counts.get(s, 0) for s in STATUSES}, "not_attempted": unchecked, "verified": verified,
            "total": total_claims, "headline": headline,
            "release_blocking": counts.get("external_mismatch", 0) + counts.get("self_match_rejected", 0) > 0,
            "all_accounted_for": sum(counts.values()) + unchecked == total_claims}


def build_references(sources: list[dict]) -> dict:
    """Only sources actually read (retrieved and text extracted) may be cited as evidence."""
    consulted = [s for s in sources if s.get("read_status") == "read"]
    unconsulted = [{"source_id": s["source_id"], "reason": s.get("read_status", "unknown")}
                   for s in sources if s.get("read_status") != "read"]
    return {"consulted": consulted, "not_consulted": unconsulted}


def assert_citable(source_id: str, references: dict) -> None:
    if source_id not in {s["source_id"] for s in references["consulted"]}:
        raise ValueError(f"source {source_id} was not consulted; it cannot be cited as evidence")


@dataclass
class LicenceRegistry:
    licences: dict = field(default_factory=dict)

    def grant(self, dataset_id: str, purposes: set, expires: str, holder: str):
        self.licences[dataset_id] = {"purposes": set(purposes), "expires": date.fromisoformat(expires), "holder": holder}

    def check(self, dataset_id: str, purpose: str, today: date) -> None:
        lic = self.licences.get(dataset_id)
        if lic is None:
            raise PermissionError(f"no licence recorded for dataset {dataset_id}")
        if today > lic["expires"]:
            raise PermissionError(f"licence for {dataset_id} expired {lic['expires']}")
        if purpose not in lic["purposes"]:
            raise PermissionError(f"licence for {dataset_id} does not permit '{purpose}'")
