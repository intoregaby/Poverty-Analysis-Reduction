"""One-off generator for docs/implementation/registry.json.

The registry holds the *definition* of what must be verified (requirements, the 95
acceptance scenarios, audit defects, workstreams, blockers, required approvals).
It deliberately holds NO pass/fail verdicts for acceptance scenarios: those are
derived by scripts/verify_engine_completion.py from executed tests.
Re-running this script preserves hand-maintained sections (decisions, blockers,
requirement notes) by merging on id.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "IREME_INSIGHT_FULL_ENGINE_KIT"
OUT = ROOT / "docs" / "implementation" / "registry.json"

WORKSTREAMS = [
    ("EP-01", "Current code mapping, audit baseline, test harness", [], "Architect"),
    ("EP-02", "Semantic indicator registry, dataset licensing, immutable catalog", ["EP-01"], "Data steward"),
    ("EP-03", "Primary survey estimation hardening", ["EP-02"], "Survey statistician"),
    ("EP-04", "Independent scientific reference (R/second code path)", ["EP-02"], "Independent statistics lead"),
    ("EP-05", "Official reference acquisition and verified cache", ["EP-01"], "Evidence engineer"),
    ("EP-06", "Structured XLSX/PDF extraction, semantics, conflict", ["EP-02", "EP-05"], "Evidence steward"),
    ("EP-07", "Typed claim and deterministic renderer", ["EP-03", "EP-04"], "AI/data quality engineer"),
    ("EP-08", "Backend release policy and approvals", ["EP-04", "EP-06", "EP-07"], "Governance engineer"),
    ("EP-09", "Multi-provider AI gateway with Ollama", ["EP-07"], "AI engineer"),
    ("EP-10", "Research agent planner and hypothesis registry", ["EP-04", "EP-06", "EP-09"], "Research engineer"),
    ("EP-11", "Decomposition, causal, predictive and spatial lab", ["EP-03", "EP-04"], "Scientific team"),
    ("EP-12", "Intervention research/evaluation and programme boundary", ["EP-10", "EP-11"], "Policy research lead"),
    ("EP-13", "Production secure API, durable workflow, data store", ["EP-01", "EP-02"], "Platform team"),
    ("EP-14", "One report AST + PDF/HTML/XLSX exports", ["EP-07", "EP-08"], "Reporting lead"),
    ("EP-15", "Privacy, security, observability, incident recovery", ["EP-13", "EP-14"], "Security/SRE"),
    ("EP-16", "All-district / national acceptance and continuous validation", [f"EP-{i:02d}" for i in range(3, 16)], "QA and scientific leads"),
]

DOMAIN_WORKSTREAM = {
    "SCI": ["EP-03", "EP-04", "EP-11"],
    "EVD": ["EP-05", "EP-06"],
    "AI": ["EP-07", "EP-09"],
    "PRIV": ["EP-08", "EP-15"],
    "OPS": ["EP-13", "EP-14", "EP-15"],
    "POL": ["EP-10", "EP-11", "EP-12"],
}

AUDIT_DEFECTS = [
    ("W1", "Critical", "Self-comparison counted as verified match (verification.modelled_claim)", "EVD-01"),
    ("W2", "Critical", "Report/export proceed after total failure of official-source verification", "PRIV-04"),
    ("W3", "High", "AI-text correction introduces new claim / mis-flags true VUP sentence", "AI-01"),
    ("W4", "High", "AI can state unsupported numbers; checks non-blocking", "AI-02"),
    ("W5", "High", "On-disk source cache not used when live fetch fails", "EVD-02"),
    ("W6", "High", "No runtime independent statistical validation", "SCI-09"),
    ("W7", "High", "Equivalent-definition decisions are hand flags", "EVD-06"),
    ("W8", "High", "Partial complex-survey inference (no FPC, singleton abort)", "SCI-05"),
    ("W9", "Medium", "Inconsistent/duplicated multi-LLM provider logic", "AI-12"),
    ("W10", "Medium", "Weak narrative/external-evidence reproducibility", "AI-18"),
    ("W11", "Medium", "Source failures invisible in headline and citations", "EVD-13"),
    ("W12", "Medium", "Reliability/uncertainty absent from AI digest", "AI-08"),
    ("W13", "Medium", "District scale-out limited by dev-server design", "OPS-13"),
    ("W14", "Medium", "Weak runtime auditability", "OPS-15"),
    ("W15", "Medium", "No authentication/authorisation on engine routes", "PRIV-07"),
    ("W16", "Low", "Documentation and metadata drift", "OPS-10"),
    ("W17", "Low", "Stage structure inconsistencies", "OPS-01"),
]

BLOCKERS = [
    {"id": "BLK-R", "title": "R runtime not installed", "detail": "Rscript is not on PATH; the kit requires an independent R code path (SCI-09/10). Install R + survey package or document an ADR for a second independently-owned Python path.", "status": "open", "blocks": ["SCI-09", "SCI-10", "SCI-19"]},
    {"id": "BLK-PROVIDERS", "title": "No provider credentials verified", "detail": "GROQ_API_KEY / NVIDIA / OLLAMA_API_KEY and a local Ollama daemon are required for live provider tests; only adapter contract tests can run without them.", "status": "open", "blocks": ["AI-12", "AI-13", "AI-14", "AI-16"]},
    {"id": "BLK-NISR", "title": "Official NISR reference artefacts and permissions", "detail": "EP-16 cannot pass without actual NISR publication artefacts, dataset licences and permissions (kit WORK_BREAKDOWN).", "status": "open", "blocks": ["EVD-04", "EVD-05", "EVD-16", "SCI-11"]},
    {"id": "BLK-APPROVALS", "title": "Human reviewer sign-offs", "detail": "Statistical, privacy and release reviewers must sign; tolerances for production need survey-statistician approval.", "status": "open", "blocks": ["APPROVALS"]},
    {"id": "BLK-INFRA", "title": "Production infrastructure", "detail": "Managed Postgres, encrypted object store, OIDC IdP and deployed SLO evidence require infrastructure and credentials not present in this workspace.", "status": "open", "blocks": ["OPS-08", "OPS-09", "PRIV-13"]},
]

REAL_EVIDENCE_REQUIRED = [
    "SCI-09", "SCI-10", "SCI-11", "SCI-16", "SCI-20", "EVD-04", "EVD-05", "EVD-14", "EVD-16", "EVD-17",
    "AI-12", "AI-13", "AI-14", "AI-16", "OPS-05", "OPS-08", "OPS-09", "OPS-13", "PRIV-13",
]

APPROVALS = [
    {"id": "APR-STAT", "role": "statistical_reviewer", "scope": "production tolerances and independent validation"},
    {"id": "APR-PRIV", "role": "privacy_reviewer", "scope": "disclosure control and DPIA"},
    {"id": "APR-RELEASE", "role": "release_reviewer", "scope": "release gate and publication policy"},
]


def main() -> None:
    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    old_notes = {r["id"]: r.get("notes", "") for r in old.get("requirements", [])}
    with (KIT / '10_VERIFICATION_TESTS' / 'ACCEPTANCE_MATRIX.csv').open(encoding='utf-8') as matrix:
        rows = list(csv.DictReader(matrix))
    assert len(rows) == 95, len(rows)
    scenarios = [
        {
            "id": r["test_id"],
            "domain": r["domain"],
            "name": r["name"],
            "fixture": r["failure_injection_or_fixture"],
            "expected": r["expected_result"],
            "tier": r["test_tier"],
            "workstreams": DOMAIN_WORKSTREAM[r["domain"]],
        }
        for r in rows
    ]
    requirements = [
        {"id": ws[0], "kind": "workstream", "title": ws[1], "depends_on": ws[2], "owner_role": ws[3],
         "notes": old_notes.get(ws[0], "")}
        for ws in WORKSTREAMS
    ]
    defects = [
        {"id": d[0], "severity": d[1], "title": d[2], "regression_scenario": d[3]} for d in AUDIT_DEFECTS
    ]
    def preserve(section, generated):
        by_id = {item['id']: item for item in old.get(section, [])}
        return [{**by_id.get(item['id'], {}), **item} for item in generated]

    reg = {
        **old,
        "schema": "ireme-implementation-registry/1",
        "scenario_count_required": 95,
        "workstream_dependency_order": [w[0] for w in WORKSTREAMS],
        "requirements": preserve('requirements', requirements),
        "scenarios": preserve('scenarios', scenarios),
        "audit_defects": preserve('audit_defects', defects),
        "engine_author": "claude-code",
        "real_evidence_required": REAL_EVIDENCE_REQUIRED,
        "blockers": old.get("blockers") or BLOCKERS,
        "required_approvals": APPROVALS,
        "decisions": old.get("decisions", []),
    }
    OUT.write_text(json.dumps(reg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(scenarios)} scenarios)")


if __name__ == "__main__":
    main()
