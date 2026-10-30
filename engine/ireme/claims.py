"""Typed claim compiler and deterministic renderer (EP-07).

The model proposes only schema-conformant `claim-proposal` objects (fact references and
a relation code). Every number in report prose is produced here from resolved facts with
fixed rounding; model-authored prose is scanned and rejected if it contains any numeral.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

from . import contracts
from .provenance import FactStore


class ClaimRejected(ValueError):
    def __init__(self, code: str, detail: str):
        super().__init__(f"{code}: {detail}")
        self.code, self.detail = code, detail


@dataclass(frozen=True)
class Scope:
    geography_id: str
    period: str
    allowed_comparators: frozenset = frozenset({"RW"})   # e.g. national benchmark geography ids
    audience: str = "analyst"


@dataclass
class StudyRegistry:
    approved: dict = field(default_factory=dict)   # study_id -> {"design": ..., "approved_by": ...}

    def approve(self, study_id: str, design: str, approved_by: str):
        if not approved_by:
            raise ValueError("study approval needs a named methodological reviewer")
        self.approved[study_id] = {"design": design, "approved_by": approved_by}


RELIABILITY_CAVEAT = {
    "reliable": "",
    "use_with_caution": " (use with caution: moderate sampling precision)",
    "unreliable": " (UNRELIABLE estimate: not suitable for publication)",
    "not_estimable": " (not estimable)",
}
LABEL = {"percent": "%", "pp": " percentage points", "currency": "", "count": ""}


def fmt(v: float, unit: str) -> str:
    # Fixed deterministic rounding: 1 decimal place, half-up away from zero, no binary-float surprises
    q = math.floor(abs(v) * 10 + 0.5 + 1e-9) / 10
    s = f"{math.copysign(q, v):.1f}"
    return s + LABEL.get(unit, f" {unit}")


def _fact(store: FactStore, fid: str) -> dict:
    f = store.calculated.get(fid)
    if f is None:
        raise ClaimRejected("FACT_NOT_FOUND", fid)
    if not store.validated(fid):
        raise ClaimRejected("FACT_NOT_VALIDATED", f"{fid} lacks an independent scientific validation")
    return f


def compile_claim(proposal: dict, store: FactStore, scope: Scope, studies: StudyRegistry,
                  comparisons: dict | None = None, contrasts=None) -> dict:
    """Validate and render one claim. Raises ClaimRejected with a stable code."""
    try:
        contracts.validate("claim-proposal", proposal)
    except contracts.ContractViolation as e:
        raise ClaimRejected("SCHEMA_VIOLATION", "; ".join(e.errors)) from e
    facts = [_fact(store, fid) for fid in proposal["fact_ids"]]
    ctype, rel = proposal["claim_type"], proposal["relation"]

    for f in facts:
        in_scope = f["geography_id"] == scope.geography_id
        if not in_scope and not (ctype == "comparison" and f["geography_id"] in scope.allowed_comparators):
            raise ClaimRejected("FACT_GEOGRAPHY_MISMATCH",
                                f"{f['fact_id']} is {f['geography_id']}, report scope is {scope.geography_id}")
    if ctype == "comparison":
        if len(facts) != 2:
            raise ClaimRejected("COMPARISON_NEEDS_TWO_FACTS", str(len(facts)))
        a, b = facts
        if a["geography_id"] != scope.geography_id:
            a, b = b, a
        if a["geography_id"] != scope.geography_id:
            raise ClaimRejected("COMPARISON_LACKS_SCOPE_FACT", scope.geography_id)
        for k in ("indicator_id", "definition_version", "unit", "period", "sample_unit"):
            if a[k] != b[k]:
                raise ClaimRejected("INCOMPARABLE_FACTS", f"{k}: {a[k]} vs {b[k]}")
        if a["period"] != scope.period:
            raise ClaimRejected("FACT_PERIOD_MISMATCH", f"{a['period']} vs scope {scope.period}")
        diff = a["point_estimate"] - b["point_estimate"]          # unrounded
        try:
            contrast = contrasts.evaluate(store, a['fact_id'], b['fact_id']) if contrasts is not None else None
        except (ValueError, KeyError) as error:
            raise ClaimRejected('INVALID_CONTRAST_EVIDENCE', str(error)) from error
        truth = "above" if diff > 0 else "below" if diff < 0 else "approximately_equal"
        significant = contrast is not None and contrast['significant']
        if rel in ("above", "below") and rel != truth:
            raise ClaimRejected("RELATION_CONTRADICTS_DATA", f"proposed {rel}, data {truth}")
        if rel == "approximately_equal" and (contrast is None or not contrast['equivalent']):
            raise ClaimRejected("EQUIVALENCE_NOT_ESTABLISHED", "validated contrast and registered equivalence margin required")
        if rel not in ('above', 'below', 'approximately_equal'):
            raise ClaimRejected('COMPARISON_RELATION_INVALID', rel)
        subj = f"{a['geography_id']}'s {a['indicator_id'].replace('_', ' ')}"
        ref = f"{b['geography_id']}'s {fmt(b['point_estimate'], b['unit'])}"
        if rel in ("above", "below") and contrast is None:
            text = (f"{subj} is numerically {rel} {ref} ({fmt(a['point_estimate'], a['unit'])}); "
                    "joint-design uncertainty has not been validated, so statistical significance is not established.")
            qual = 'uncertainty_not_evaluated'
        elif rel in ("above", "below") and not significant:
            text = (f"{subj} is numerically {rel} {ref} ({fmt(a['point_estimate'], a['unit'])}), but the "
                    f"difference is not statistically distinguishable under the validated joint survey design.")
            qual = "not_distinguishable"
        elif rel in ("above", "below"):
            text = f"{subj} ({fmt(a['point_estimate'], a['unit'])}) is {rel} {ref}; the gap exceeds sampling error."
            qual = "observational_difference"
        else:
            text = f"{subj} ({fmt(a['point_estimate'], a['unit'])}) is approximately equal to {ref}."
            qual = "approximately_equal"
        used = [a, b] + ([store.calculated[contrast['contrast_fact_id']]] if contrast else [])
    elif ctype == "causal_effect":
        sid = proposal.get("study_id")
        if not sid or sid not in studies.approved:
            raise ClaimRejected("CAUSAL_NOT_ESTABLISHED", "no approved identification design for this claim")
        f = facts[0]
        text = f"In approved study {sid} ({studies.approved[sid]['design']}), {f['indicator_id'].replace('_', ' ')} is {fmt(f['point_estimate'], f['unit'])}."
        qual, used = "causal_approved_study", facts
    elif ctype in ("descriptive", "uncertainty", "association", "trend", "limitation"):
        if ctype == "association" and rel not in ("association", "not_applicable", "unknown"):
            raise ClaimRejected("ASSOCIATION_RELATION_INVALID", rel)
        for f in facts:
            if f["period"] != scope.period and ctype != "trend":
                raise ClaimRejected("FACT_PERIOD_MISMATCH", f"{f['fact_id']} is {f['period']}, scope {scope.period}")
        f = facts[0]
        if ctype == "trend":
            if len(facts) < 2 or len({x["period"] for x in facts}) != len(facts):
                raise ClaimRejected("TREND_NEEDS_DISTINCT_PERIODS", "")
            first, last = sorted(facts, key=lambda x: x["period"])[0], sorted(facts, key=lambda x: x["period"])[-1]
            d = last["point_estimate"] - first["point_estimate"]
            truth = "increased" if d > 0 else "decreased" if d < 0 else "approximately_equal"
            if rel in ("increased", "decreased") and rel != truth:
                raise ClaimRejected("RELATION_CONTRADICTS_DATA", f"proposed {rel}, data {truth}")
            text = (f"Between {first['period']} and {last['period']} {f['indicator_id'].replace('_', ' ')} "
                    f"{truth.replace('_', ' ')} from {fmt(first['point_estimate'], first['unit'])} to "
                    f"{fmt(last['point_estimate'], last['unit'])}; this is a descriptive change, not a causal one.")
            qual = "descriptive_noncausal"
        else:
            text = f"{f['geography_id']}: {f['indicator_id'].replace('_', ' ')} is {fmt(f['point_estimate'], f['unit'])} ({f['period']})."
            qual = proposal["qualification_code"] if ctype == "limitation" else "descriptive_noncausal"
            if ctype == "association":
                text += " This is an association and does not show cause."
        used = facts
    else:  # pragma: no cover
        raise ClaimRejected("UNSUPPORTED_CLAIM_TYPE", ctype)

    caveats = sorted({RELIABILITY_CAVEAT[f["reliability"]] for f in used if RELIABILITY_CAVEAT[f["reliability"]]})
    text += "".join(caveats)
    if comparisons is not None:
        for eid in proposal["evidence_ids"]:
            if eid not in comparisons:
                raise ClaimRejected("EVIDENCE_NOT_FOUND", eid)
    return {"claim_id": proposal["claim_id"], "section": proposal["section"], "text": text,
            "fact_ids": [f["fact_id"] for f in used], "evidence_ids": list(proposal["evidence_ids"]),
            "qualification_code": qual, "reliability": sorted({f["reliability"] for f in used}),
            "numbers": [{"fact_id": f["fact_id"], "display": fmt(f["point_estimate"], f["unit"])} for f in used],
            "rendered_by": "claims.compile_claim/1"}


# ---- residual model-authored prose ------------------------------------------------------------------
NUMBER_WORDS = ("zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|"
                "sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|"
                "thousand|million|billion|half|third|quarter|double|triple|dozen|percent|per cent|tenfold")
_NUM = re.compile(rf"(\d|\b(?:{NUMBER_WORDS})\b)", re.IGNORECASE)


def scan_prose(text: str) -> list[str]:
    """Return numeral/number-word hits in free text. Any hit means the text cannot be published:
    narrative prose may reference facts only through claim placeholders {claim:ID}."""
    return [m.group(0) for m in _NUM.finditer(text)]


def assemble_narrative(template: str, rendered: dict) -> str:
    """template contains {claim:ID} placeholders and numeral-free connective prose."""
    hits = scan_prose(re.sub(r"\{claim:[A-Za-z0-9_.\-]+\}", "", template))
    if hits:
        raise ClaimRejected("UNBOUND_NUMBER_IN_PROSE", f"numeric tokens outside claims: {hits[:5]}")

    def sub(m):
        cid = m.group(1)
        if cid not in rendered:
            raise ClaimRejected("CLAIM_NOT_FOUND", cid)
        return rendered[cid]["text"]

    return re.sub(r"\{claim:([A-Za-z0-9_.\-]+)\}", sub, template)


INJECTION_PATTERNS = [
    r"ignore (all |any )?(previous|prior|above) (instructions|prompts?)", r"disregard .{0,40}(instructions|rules)",
    r"you are now", r"system prompt", r"set .{0,40}(poverty|rate|value).{0,20}(to|=)", r"override .{0,30}(policy|gate)",
    r"</?(system|assistant|tool)>", r"reveal .{0,30}(key|secret|password)",
]


def quarantine_untrusted(text: str) -> dict:
    """External document text is DATA. Returns the text wrapped as inert data plus injection findings;
    callers must never give such text tool permissions or place it in the instruction channel."""
    found = [p for p in INJECTION_PATTERNS if re.search(p, text, re.IGNORECASE)]
    return {"role": "untrusted_data", "text": text, "injection_suspected": bool(found), "matched": found,
            "tool_permissions": []}
