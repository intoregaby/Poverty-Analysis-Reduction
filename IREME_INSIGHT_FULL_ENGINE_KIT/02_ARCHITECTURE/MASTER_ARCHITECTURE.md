# Master architecture — Ireme Insight full-scale statistical intelligence platform
This is the **future target system**, not the existing local engine. Refer to the 12 Mermaid diagrams in `mermaid/` for printable dependencies and workflows.

## Control plane vs scientific data plane vs AI plane
1. **Access/control plane:** OIDC, roles, policy engine, user permissions, workflow authorization, data contracts, release approval, provenance/audit ledger.
2. **Data stewardship:** source agreements, automated file quality, immutable storage, survey registry, indicator semantic ontology, geographic crosswalk, catalog, contracts and versioning.
3. **Statistical computing:** primary survey-aware estimators; independent scientific validator; advanced decomposition, causal methods, sensitivity analysis, geospatial and uncertainty; validated facts ledger.
4. **Official reference evidence:** source crawler with allowlist and manual approval; retriever and content hash; PDF/XLSX/API extraction; table-cell human/automated QA; semantic mapping; external comparison records.
5. **AI-assisted research:** bounded research planner, hypothesis matrix, challenge/reviewer roles, citation-based retrieval, capability/privacy-aware model router, structured outputs, deterministic claim compiler.
6. **Evidence-to-action:** needs prioritization, programme logic models, feasible intervention research, equity, budgets as estimates, decision logs, monitoring and causal impact evaluation designs; no unsupported causal assertion.
7. **Publication:** immutable report AST, release gate, human approval, versioned PDF/HTML/XLSX/JSON and accessible local-language versions.
8. **Platform/SRE:** durable orchestrator, workloads, queues, Postgres, object storage, secret store, telemetry, DR, CI/CD, security and data-residency controls.

## Ownership & service boundaries
| Bounded context | Primary owner | Invariant | Exposed contracts |
|---|---|---|---|
| Data catalog and licensing | Data steward | source use permitted and versioned | DatasetSnapshot, LicensePolicy, IndicatorDefinition |
| Statistics | Senior survey statistician | correct estimand & variance | Estimate, Reliability, TestRun |
| Independent validator | Independent science review team | no shared estimator logic | Recalculation, ScientificVerdict |
| Official references | Evidence librarian | independent official origin & source hash | SourceArtifact, OfficialFact, Comparison |
| AI orchestration | AI platform engineer | controlled inputs & typed output | TaskRequest, ClaimProposal, ProviderTrace |
| Research investigation | Research lead | alternative hypotheses and uncertainty | InvestigationPlan, HypothesisEvidence, InterventionOption |
| Publication | Publication officer | immutable approved versions | ReportDocument, ReleaseDecision, Artifact |
| Security & privacy | Privacy/security lead | no unauthorized disclosure or actions | AccessDecision, ExportPermission, PolicyEvaluation |
| Delivery platform | SRE | retry, idempotency, observability | WorkflowEvent, JobStatus, Incident |

## Primary execution path: acyclic evidence graph
Dataset snapshot -> Semantic contract -> Primary estimate + separate reference estimate -> Scientific reconciliation -> CalculatedFact registry. Independently: Official document -> table extraction -> OfficialFact. CalculatedFact and OfficialFact -> Semantic match -> Comparison verdict. From validated facts and comparisons -> AI claim proposals -> deterministic claim rendering -> policy QA -> signed human approval -> canonical report snapshot -> exports. Feedback creates a **new versioned workflow**, not a cyclic dependency or in-place mutation of facts.

## Specialized intelligence capabilities
- Poverty: FGT0/1/2; extreme poverty; distribution/inequality; subgroup/domain reliability; policy-relevant uncertainty.
- Money: FinScope access strand, usage and barriers; definition/source separation from EICV; no invalid cross-survey person-level joins.
- Service: electricity grid vs lighting source explicitly distinguished, water/sanitation, insurance, education, livelihoods, VUP survey participation versus administrative eligibility.
- Space: Rwanda administrative boundary versions, district and sector metadata, geospatial joins, spatial uncertainty, map classification and suppression; avoid inference below survey design reliability.
- Time: historical EICV modelling comparability and uncertainty, timestamps and survey wave mappings.
- Causal and predictive: DAGs, sensitivity, difference-in-differences when valid, propensity/experimental designs, backtesting and external validation; observational associations are not intervention effects.
- Human review: approvals must be by people with explicit authority and be reversible by recall/supersession with immutable audit history.

## Critical negative paths (must be diagrammed and tested)
- Network outage -> verified on-disk cache if hash proven and still suitable, otherwise retrieval_failed, not no-publication.
- Source compares with itself -> provenance assertion fails and blocks comparison.
- Model invents a number -> schema or claim compiler fails, never renders a fake statistic.
- Raw data appears in hosted provider payload -> policy denies before any network call.
- Invalid SE -> statistical review failure even when point estimate matches official rounded rate.
- Superseded official table -> later report is revalidated and previous release marked superseded with link, not silently mutated.
- Model unavailable -> deterministic narrative or explicitly incomplete analysis; release still subject to all gates.

## Recommended interfaces
- `/v1/investigations` start, inspect, resume, cancel, lineage, compare, hypotheses.
- `/v1/facts/{id}` immutable estimate facts; `/v1/evidence/{id}` permitted official references.
- `/v1/reports/{id}/review` approve/reject, `/v1/reports/{id}/exports/{format}` authorized exports.
- `/v1/providers/health` admin-only sanitized capability summary; no credentials.
- All writes use idempotency keys, explicit authenticated principal, trace id, audit event and field-level authorization.

## Design verification
Every architecture box maps to an implementation owner, actual files, API schema, conformance tests and a release blocker, not just a diagram. `11_CLAUDE_CODE_IMPLEMENTATION/` contains the mandatory handoff and task breakdown. Do not call the platform certified until production-grade scientific, security and disaster-recovery tests execute successfully.
