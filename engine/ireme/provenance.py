"""Origin-separated fact stores and the self-match prohibition (W1).

A calculated fact and an official fact come from different origin types with different
artifact hashes. `compare` refuses to create `externally_matched` unless every semantic
match flag is true, the origins are independent, extraction is table-verified and the
difference is within a REGISTERED tolerance. Flags are *derived* from the two records,
never taken from a caller-supplied boolean.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from . import contracts


class OriginViolation(ValueError):
    pass


@dataclass
class FactStore:
    calculated: dict = field(default_factory=dict)
    official: dict = field(default_factory=dict)
    verdicts: dict = field(default_factory=dict)

    def add_calculated(self, fact: dict) -> dict:
        contracts.validate("calculated-fact", fact)
        self.calculated[fact["fact_id"]] = dict(fact)
        return fact

    def add_official(self, fact: dict) -> dict:
        contracts.validate("official-fact", fact)
        if fact["origin_artifact_hash"] in {f["origin_artifact_hash"] for f in self.calculated.values()}:
            raise OriginViolation("official fact reuses a computed artifact hash: refusing to store (self-match)")
        self.official[fact["official_fact_id"]] = dict(fact)
        return fact

    def add_verdict(self, verdict: dict) -> dict:
        contracts.validate("scientific-verdict", verdict)
        self.verdicts[verdict["verdict_id"]] = dict(verdict)
        return verdict

    def validated(self, fact_id: str) -> bool:
        f = self.calculated.get(fact_id)
        v = self.verdicts.get(f["scientific_verdict_id"]) if f else None
        return bool(v and v["decision"] == "independently_validated" and v["reviewer_independence"]
                    and v["fact_id"] == fact_id)


def compare(store: FactStore, equivalences, fact_id: str, official_fact_id: str, tolerance: float,
            reviewer_id: str, comparison_id: str | None = None) -> dict:
    """Return an `official-comparison` record with a derived status.

    `equivalences` is a semantics.EquivalenceRegistry: concept/method comparability must be a
    reviewed declaration there, so two equal numbers for different concepts never match."""
    calc = store.calculated.get(fact_id)
    off = store.official.get(official_fact_id)
    cid = comparison_id or f"cmp-{fact_id}-{official_fact_id}"
    if calc is None or off is None:
        return _record(cid, fact_id, official_fact_id, "reference_not_found", {}, 0.0, tolerance, reviewer_id,
                       "calculated or official fact absent")
    eq = equivalences.lookup(calc, off)
    flags = {
        "concept_match": eq is not None,
        "geography_match": calc["geography_id"] == off["geography_id"],
        "population_match": eq is not None and calc["sample_unit"] == eq.population == off["population"],
        "unit_match": eq is not None and calc["unit"] == eq.unit == off["unit"],
        "period_match": calc["period"] == off["period"],
        "method_match": eq is not None and bool(eq.method_note),
        "origins_independent": calc["origin_type"] == "computed_microdata"
        and off["origin_type"] == "independent_official_document"
        and calc["origin_artifact_hash"] != off["origin_artifact_hash"]
        and calc["dataset_sha256"] != off["source_sha256"],
    }
    diff = calc["point_estimate"] - off["point_estimate"]
    if not flags["origins_independent"]:
        status, note = "self_match_rejected", "origins not independent"
    elif off["extraction_status"] != "table_verified":
        status, note = "not_comparable", "official figure extraction not table_verified"
    elif not all(flags.values()):
        status, note = "not_comparable", "differs in: " + ", ".join(k for k, v in flags.items() if not v)
    elif abs(diff) <= tolerance:
        status, note = "externally_matched", ""
    else:
        status, note = "external_mismatch", ""
    return _record(cid, fact_id, official_fact_id, status, flags, diff, tolerance, reviewer_id, note)


def _record(cid, fid, oid, status, flags, diff, tol, reviewer, note):
    rec = {"comparison_id": cid, "fact_id": fid, "official_fact_id": oid, "status": status,
           "concept_match": flags.get("concept_match", False), "geography_match": flags.get("geography_match", False),
           "population_match": flags.get("population_match", False), "unit_match": flags.get("unit_match", False),
           "period_match": flags.get("period_match", False), "method_match": flags.get("method_match", False),
           "origins_independent": flags.get("origins_independent", False), "difference": diff,
           "registered_tolerance": tol, "reviewer_id": reviewer, "notes": note}
    return contracts.validate("official-comparison", rec)
