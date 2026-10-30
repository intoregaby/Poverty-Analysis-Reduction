# IREME INSIGHT — COMPLETE RESEARCH-GRADE ENGINEERING KIT
**Edition:** Full-scope reference architecture and engineering handoff | **Date:** 2026-10-30
**Status:** DESIGN / IMPLEMENTATION SPECIFICATION, NOT A DEPLOYED OR CERTIFIED ENGINE

## Mission
Build a national-to-district statistical intelligence and evidence-to-action platform for Rwanda. It shall ingest governed data, reproduce complex-survey estimands, compare official publications by identical statistical meanings, investigate multiple explanations, evaluate potential interventions, and publish reproducible, disclosure-safe outputs after machine and human review. The complete target is **not an MVP and not hackathon-limited**. Delivery can be incremental without reducing the target.

## Read these in order
1. `00_START_HERE/OPERATING_PRINCIPLES.md` — ten non-negotiable rules, truth statuses and release semantics.
2. `02_ARCHITECTURE/MASTER_ARCHITECTURE.md` — system context, subsystems and all data planes.
3. `02_ARCHITECTURE/mermaid/` — source Mermaid diagrams (render with Mermaid-capable editors).
4. `03_STATISTICAL_SCIENCE/` — scientific methods and reproducibility rules.
5. `04_EVIDENCE_INTELLIGENCE/` and `05_AI_INTELLIGENCE/` — evidence/LLM behavior contracts.
6. `06_DEEP_INVESTIGATION/` — district investigation, causal analysis and action evaluation.
7. `07_SECURITY_GOVERNANCE/`, `08_PLATFORM_ENGINEERING/` — secure production system.
8. `09_MACHINE_CONTRACTS/` — JSON Schemas and example contract payloads.
9. `10_VERIFICATION_TESTS/` — acceptance tests, failure injection and machine-contract smoke test.
10. `11_CLAUDE_CODE_IMPLEMENTATION/` — ready-to-use Claude Code instructions, architectural decisions, work packages, Done criteria.
11. `01_CURRENT_STATE_AUDIT/` — Claude Code's original audit, included unmodified as source evidence.
12. `12_OFFICIAL_REFERENCES/` — verified external documentation pointers and interpretation warnings.

## In scope (full target)
- Production multiuser RBAC/ABAC, sensitive data isolation, OIDC, durable investigation orchestration and horizontally scalable workers.
- EICV7 and historical EICV harmonized comparisons, FinScope, authorized programme data, geography and scenario modelling.
- Survey-aware estimators (person/household, weights, strata, clusters), uncertainty, model diagnostics, decomposition, geospatial analysis and independently maintained scientific validators.
- Publication-independent official reference extraction, document versioning, table-cell provenance, definition-aware comparisons and conflict handling.
- AI planning, hypothesis generation, claim-bound interpretation, interventions and policy research through a single multi-provider gateway (Groq, NVIDIA, Ollama Cloud, Local Ollama).
- Research governance, statistical analyst review, immutable evidence and output manifests, transparent limitations, accessibility and multilingual reporting.
- Maps, Excel with native charts, PDF, HTML, dashboards and action-plan monitoring; verified data API.

## Out of scope for automatic authority
- AI cannot decide statistical truth, approve a source's authority on its own, modify survey estimates, authorize publication, prescribe beneficiaries or transfer programme money. These require validated computation, explicit policy, review and separate transactional controls.

## Clarifications
- **Zero tolerance** means *zero knowingly released critical errors or unsupported claims*. It cannot mean zero survey sampling uncertainty or zero software defects.
- The content under `09_MACHINE_CONTRACTS/` is a **starter contract baseline**, not a complete production implementation; all module source code is to be built and independently tested.
- Some architecture choice records are **proposals**; perform proof-of-concept tests before procurement or lock-in.
- Prior ZIP download failure was a UI transfer problem, not an indicator of the file contents. This package includes standalone documents and a verified ZIP.

## Existing project anchors
React `src/pages/DistrictInvestigation.jsx` → Vite `tools/investigation/vite-api.mjs` → Python `tools/investigation/engine.py` and `analysis.py`, `context.py`, `drivers.py`, `verification.py` → Node `ai-report.mjs`, `reportChecks.js`, `llm.mjs`. Audited as of commit `919a77e` plus uncommitted edits on 2026-10-29. The previous implementation is a local dev tool, not this proposed architecture.
