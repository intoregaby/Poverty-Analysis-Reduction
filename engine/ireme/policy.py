"""Evidence-to-action governance (EP-10/12): hypotheses, intervention options, cost provenance,
programme boundary, preregistration, abstention and dissemination control."""
from __future__ import annotations

import math
from dataclasses import dataclass, field

from . import contracts

DESIGN_GRADE = {"randomised_trial": ("strong", "identified"), "regression_discontinuity": ("strong", "identified"),
                "difference_in_differences": ("moderate", "identified"), "instrumental_variable": ("moderate", "identified"),
                "matching_or_regression": ("limited", "association_only"), "cross_sectional_association": ("limited", "association_only"),
                "qualitative": ("limited", "not_established"), "expert_opinion": ("unknown", "not_established"),
                "untested": ("unknown", "not_established")}


class PolicyViolation(PermissionError):
    pass


# ---- competing hypotheses retained (POL-02) -----------------------------------------------------------------------------
@dataclass
class HypothesisRegistry:
    items: dict = field(default_factory=dict)

    def add(self, hid: str, statement: str, proposed_by: str):
        self.items[hid] = {"statement": statement, "status": "open", "evidence_for": [], "evidence_against": [],
                           "history": [("open", proposed_by, None)]}

    def set_status(self, hid: str, status: str, by: str, evidence_ids: list[str] | None = None):
        if status not in ("open", "supported", "weakened", "rejected", "inconclusive"):
            raise ValueError(status)
        if status in ("supported", "weakened", "rejected") and not evidence_ids:
            raise PolicyViolation(f"moving hypothesis {hid} to '{status}' requires linked evidence")
        h = self.items[hid]
        h["status"] = status
        (h["evidence_against"] if status in ("weakened", "rejected") else h["evidence_for"]).extend(evidence_ids or [])
        h["history"].append((status, by, list(evidence_ids or [])))

    def delete(self, hid: str):
        raise PolicyViolation("hypotheses are never deleted; mark rejected with evidence")

    def ranked(self) -> list[dict]:
        order = {"supported": 0, "open": 1, "inconclusive": 2, "weakened": 3, "rejected": 4}
        return [dict(id=k, **{x: v[x] for x in ("statement", "status")}) for k, v in
                sorted(self.items.items(), key=lambda kv: order[kv[1]["status"]])]


# ---- evidence labelling (POL-01/03) ------------------------------------------------------------------------------------------
def describe_evidence(design: str, claimed_label: str) -> dict:
    if design not in DESIGN_GRADE:
        raise ValueError(design)
    grade, causal = DESIGN_GRADE[design]
    allowed = {"trial result": design == "randomised_trial", "causal effect": causal == "identified",
               "association": True, "unclear": True}
    if not allowed.get(claimed_label, False):
        raise PolicyViolation(f"'{claimed_label}' is not supported by a '{design}' design")
    return {"evidence_grade": grade, "causal_status": causal}


# ---- cost provenance (POL-04) ------------------------------------------------------------------------------------------------------
@dataclass
class CostModel:
    lines: list = field(default_factory=list)

    def add(self, label: str, amount: float, kind: str, source_id: str | None):
        if kind not in ("measured_budget", "estimate"):
            raise ValueError(kind)
        if kind == "measured_budget" and not source_id:
            raise PolicyViolation(f"cost line '{label}' labelled as an actual budget has no source document")
        self.lines.append({"label": label, "amount": amount, "kind": kind, "source_id": source_id})

    def status(self) -> str:
        if not self.lines:
            return "unknown"
        return "validated" if all(l["kind"] == "measured_budget" for l in self.lines) else "estimated"

    def trace(self) -> list[dict]:
        return [dict(l, label=l["label"] if l["kind"] == "measured_budget" else l["label"] + " (ESTIMATE, not an actual budget)")
                for l in self.lines]


# ---- programme boundary (POL-05) ----------------------------------------------------------------------------------------------------------------
FORBIDDEN_ACTIONS = {"initiate_payment", "approve_beneficiary", "allocate_benefit", "transfer_funds", "enrol_household"}
FORBIDDEN_FIELDS = {"national_id", "phone", "account_number", "payment_amount", "beneficiary_id", "mobile_money_id"}


def research_action(action: str) -> str:
    if action in FORBIDDEN_ACTIONS:
        raise PolicyViolation(f"'{action}' is an operational programme action; analysis may only recommend research follow-up")
    return action


def assert_aggregate_only(columns) -> None:
    bad = sorted(set(columns) & FORBIDDEN_FIELDS)
    if bad:
        raise PolicyViolation(f"operational/beneficiary fields may not enter the analytic store: {bad}")


# ---- preregistration (POL-06) -------------------------------------------------------------------------------------------------------------------
@dataclass
class Preregistry:
    studies: dict = field(default_factory=dict)

    def register(self, study_id: str, primary_outcome: str, analysis_plan: str, registered_at: float, by: str):
        if study_id in self.studies:
            raise PolicyViolation("a registration is immutable")
        self.studies[study_id] = {"primary_outcome": primary_outcome, "plan": analysis_plan, "at": registered_at, "by": by}

    def declare_success(self, study_id: str, outcome: str, data_access_at: float) -> bool:
        r = self.studies.get(study_id)
        if r is None:
            raise PolicyViolation("no preregistration: results are exploratory, not a success claim")
        if r["at"] >= data_access_at:
            raise PolicyViolation("registration was made after data access")
        if outcome != r["primary_outcome"]:
            raise PolicyViolation(f"'{outcome}' was not the preregistered primary outcome '{r['primary_outcome']}'")
        return True


# ---- abstention (POL-08) ----------------------------------------------------------------------------------------------------------------------------
def min_detectable_effect(n_per_arm: int, sd: float, deff: float = 1.0, alpha_z: float = 1.96, power_z: float = 0.8416) -> float:
    return (alpha_z + power_z) * sd * math.sqrt(2 * deff / n_per_arm)


def programme_inference_allowed(n_per_arm: int, sd: float, deff: float, expected_effect: float) -> dict:
    mde = min_detectable_effect(n_per_arm, sd, deff)
    ok = expected_effect >= mde
    return {"allowed": ok, "mde": mde, "decision": None if ok else "investigate_more",
            "message": None if ok else f"underpowered: smallest detectable effect {mde:.3g} exceeds the expected {expected_effect:.3g}; abstaining"}


# ---- intervention options (POL-03/04/07) ----------------------------------------------------------------------------------------------------------------
def build_option(option_id, district_id, problem_fact_ids, name, design, label, cost: CostModel, equity_risks, owner,
                 monitoring_plan_id, underserved_areas_excluded=()) -> dict:
    ev = describe_evidence(design, label)
    risks = list(equity_risks)
    for a in underserved_areas_excluded:
        risks.append(f"intervention scope excludes underserved area: {a}")
    if not risks:
        raise PolicyViolation("an equity analysis (who benefits / who is excluded) is mandatory; none supplied")
    cs = cost.status()
    if ev["evidence_grade"] in ("unknown",) or not problem_fact_ids:
        decision = "investigate_more"
    elif ev["causal_status"] != "identified":
        decision = "pilot_and_evaluate"
    elif cs != "validated":
        decision = "pilot_and_evaluate"
    else:
        decision = "consider_scale"
    if underserved_areas_excluded and decision == "consider_scale":
        decision = "pilot_and_evaluate"
    opt = {"option_id": option_id, "district_id": district_id, "problem_fact_ids": list(problem_fact_ids),
           "intervention_name": name, "evidence_grade": ev["evidence_grade"], "causal_status": ev["causal_status"],
           "cost_status": cs, "equity_risks": risks, "implementation_owner": owner, "monitoring_plan_id": monitoring_plan_id,
           "decision": decision, "assumptions": [l["label"] for l in cost.trace() if l["kind"] == "estimate"]}
    return contracts.validate("intervention-option", opt)


# ---- dissemination (POL-09) ------------------------------------------------------------------------------------------------------------------------------
def dissemination_label(report_status: str, audience: str) -> str:
    if report_status == "published":
        return "official"
    if audience == "public":
        raise PolicyViolation("an unreleased recommendation cannot be disseminated to the public")
    return "DRAFT - not official; for internal review only"


# ---- monitoring design (EP-12) -----------------------------------------------------------------------------------------------------------------------------
MONITORING_DESIGNS = {"randomised_trial", "comparison_group", "interrupted_time_series", "pre_post_observational"}


@dataclass(frozen=True)
class MonitoringPlan:
    """A measurable plan: baseline with source, comparison strategy, date and success criteria.

    A plan is mandatory before `consider_scale`; pre/post-only designs are recorded as
    non-causal so movement is never reported as a programme effect.
    """

    plan_id: str
    metrics: tuple
    baselines: dict               # metric -> {"value": float, "source_id": str, "period": str}
    design: str
    comparison: str
    evaluation_date: str          # ISO date
    success_criteria: dict        # metric -> {"direction": "above"|"below", "threshold": float}
    cost_denominator: str

    def validate(self) -> dict:
        from datetime import date

        if not self.plan_id or not self.cost_denominator.strip():
            raise PolicyViolation("a monitoring plan needs an identity and an explicit cost denominator")
        if not self.metrics:
            raise PolicyViolation("a monitoring plan needs at least one metric")
        if self.design not in MONITORING_DESIGNS:
            raise PolicyViolation("unknown monitoring design")
        if not self.comparison.strip():
            raise PolicyViolation("a comparison/control strategy is required")
        try:
            date.fromisoformat(self.evaluation_date)
        except (TypeError, ValueError):
            raise PolicyViolation("evaluation date must be an ISO date") from None
        for metric in self.metrics:
            baseline = self.baselines.get(metric)
            if not baseline or not baseline.get("source_id") or baseline.get("value") is None:
                raise PolicyViolation(f"metric '{metric}' needs a sourced baseline, not an invented one")
            criterion = self.success_criteria.get(metric)
            if not criterion or criterion.get("direction") not in ("above", "below"):
                raise PolicyViolation(f"metric '{metric}' needs an explicit success/failure criterion")
        causal = "not_established" if self.design == "pre_post_observational" else "designed_comparison"
        return {"plan_id": self.plan_id, "design": self.design, "metrics": list(self.metrics),
                "cost_denominator": self.cost_denominator, "comparison": self.comparison,
                "evaluation_date": self.evaluation_date, "causal_status": causal,
                "uses_before_after_as_causal": False,
                "warning": None if causal != "not_established" else
                           "before/after movement alone is not a causal programme result"}


def require_monitoring(option: dict, plan: MonitoringPlan | None) -> dict:
    """Scale recommendations need a complete, registered monitoring plan; others may proceed with a warning."""
    if option.get("decision") == "consider_scale":
        if plan is None or plan.plan_id != option.get("monitoring_plan_id"):
            raise PolicyViolation("consider_scale requires the registered monitoring plan for this option")
        return plan.validate()
    return plan.validate() if plan else {"plan_id": option.get("monitoring_plan_id"), "state": "not_supplied"}
