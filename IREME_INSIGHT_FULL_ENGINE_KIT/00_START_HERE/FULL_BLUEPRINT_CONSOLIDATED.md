# IREME INSIGHT — COMPLETE FULL-SCALE AI ENGINE BLUEPRINT

**Engineering specification, not a running/certified product.**

This single-file alternative contains the key architecture, science, AI, security, workflows, implementation rules and official reference guidance. The ZIP includes all 14 editable Mermaid diagrams, 9 JSON schemas, 95 planned acceptance scenarios, source audit, executable policy smoke tests and original v6 reference.



---

# Part 1: `00_START_HERE/README.md`

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


---

# Part 2: `00_START_HERE/OPERATING_PRINCIPLES.md`

# System invariants and release rules

## The 15 non-negotiable invariants
**P01 Origin separation:** `computed_estimate` comes from executable raw-data calculation. `reference_estimate` comes from a separately captured official table. Never use one record to populate both values. Origin hashes and extraction steps must differ.

**P02 Typed estimands:** Every measure specifies numerator, denominator, unit, universe, weighting variable, stratum, PSU, geography, time window, transform, exclusions, and missing-value behavior. If any mandatory field is unknown, status = `definition_incomplete`.

**P03 Scientific independence:** Headline estimates and SEs must be checked by a separately maintained reference implementation (e.g. R `survey`). Independence requires separate estimator code, separate fixtures, independently reviewed mapping, and no imports of the primary estimator's computational helpers.

**P04 Semantics before numbers:** Values are comparable only after matching concept, population, unit, reference time, methodology, and spatial boundary. Matching decimal values with different meanings are not validation.

**P05 No fabricated certainty:** Confidence intervals, sampling error, model fit, missing evidence, design limitations and assumptions are explicit. `unknown` is a valid scientific output.

**P06 Exact claim binding:** Models suggest typed claim IDs and evidence IDs, never editable numerical sentences. Numeric prose, directionality and uncertainty are rendered from approved facts by deterministic templates.

**P07 Correct source statuses:** A network timeout is `retrieval_failed`; a genuinely missing published indicator is `reference_not_found_after_completed_search`; unpublished or definition-mismatched estimates are not called externally verified.

**P08 All outputs from one canonical report version:** HTML, PDF, XLSX, JSON, charts, translations and sharing endpoints must render the same frozen data and quality status.

**P09 Fail closed on critical defects:** `critical` => no approved publication, no public export, no stale signed link; restricted diagnostic drafts are permitted only for authorized reviewers with explicit warnings.

**P10 Security before AI routing:** Classify data and sanitize or aggregate before provider selection; do not send beneficiary records, unapproved microdata, row-level content, secrets, or unsuppressed small cells to hosted LLMs.

**P11 Explicit uncertainty-sensitive decisions:** No automated programme benefit eligibility, payments, sanctions or individual recommendations from probabilistic or correlational analysis. Require lawful, separately authorized programme decision controls.

**P12 Immutable lineage:** Preserve dataset hash, dataset license/access policy, code commit, container digest, config schema version, estimator version, random seed, reference document hash, tool/model ID, digest/prompt hash, QA decisions and reviewer signatures in append-only events.

**P13 Idempotent durable execution:** Every side-effecting stage has a stable idempotency key; retry behavior must not duplicate reports, costs, approvals, notifications or beneficiary operations.

**P14 No model-to-model truth by consensus:** Agreement between Groq, NVIDIA and Ollama is not statistical verification. LLMs can propose critiques only; deterministic verifiers and qualified analysts decide acceptance.

**P15 Policy as code:** Release decision computed on backend against versioned policies; no UI badge, user role, client export route, model prompt or retry can override it.

## Exact status vocabulary
- Estimate: `calculated`, `independently_validated`, `validation_failed`, `insufficient_data`, `methodology_review_required`.
- Official comparison: `externally_matched`, `external_mismatch`, `not_comparable`, `retrieval_failed`, `reference_not_found`, `source_conflict`, `not_required_for_original_analysis`.
- Claim: `proposed`, `validated`, `rejected`, `needs_human_review`.
- Report: `draft`, `restricted_draft`, `qa_failed`, `awaiting_review`, `approved`, `published`, `superseded`, `revoked`.
- Document: `discovered`, `downloaded`, `parsed`, `table_verified`, `cited`, `unavailable`, `superseded`.

## Decision matrix
| Situation | Statistical result | Narrative | Official publication |
|---|---|---|---|
| Source retrieval timeout, valid independent estimator | internally validated with limitation | allowed as restricted draft with disclosed status | cannot label externally matched; required external-evidence policy may hold approval |
| Self-comparison or mismatched provenance | invalid verification result | reject assertion of verification | BLOCK |
| Typed claim has incorrect unit/direction | reject claim | return to structured regeneration or human edit | BLOCK if unresolved |
| Independent estimator disagreement outside precommitted tolerance | validation failed | only technical diagnostic, no conclusion | BLOCK |
| Two authenticated official publications conflict | source conflict | both values and dates can be described with context in restricted draft | REVIEW |
| Critical disclosure risk | confidential input held; do not call remote model | redact/suppress | BLOCK until remediated |
| No official published comparator for original model | internally validated, not externally matched | cautious original finding, not verification claim | possible after methodology review per risk policy |

## Mathematical honesty
Causal methods must state identifiability assumptions. Uncertainty intervals depend on assumptions and cannot guarantee truth. Statistical quality certification is a project-specific review result, not a governmental endorsement.


---

# Part 3: `00_START_HERE/DECISION_RECORDS.md`

# Architecture decision records — proposed; validate before adoption
| ADR | Decision | Reason | Alternatives and trigger to revisit |
|---|---|---|---|
| ADR-001 | Python FastAPI for engine API and science orchestration adapters | Strong Python integration, OpenAPI contract support | Node backend if team chooses a clean service split; reassess auth/performance |
| ADR-002 | Durable workflow engine such as Temporal | Reliable long investigations, retries, approvals | DB-backed job queue if audited implementation meets retry and recovery guarantees |
| ADR-003 | PostgreSQL for metadata, provenance and policy | Transactions, RLS options, structured audit queries | Dedicated catalog if corpus scale demands |
| ADR-004 | Object storage for immutable snapshots, references, exports | Content hashing, retention, large files | On-prem encrypted object store for data residency |
| ADR-005 | Python primary estimator + separate R survey verification | Supports scientific independence | Other independently maintained methods after validation |
| ADR-006 | Canonical report JSON with deterministic renderer | No AI-typed numeric claims | AST and templates must evolve with multilingual/accessibility needs |
| ADR-007 | Provider-neutral hosted/local LLM gateway | Capability-based routing without source lock-in | Providers and models are runtime-configured and benchmarked |
| ADR-008 | OIDC identity + policy-based RBAC and ABAC | Fine-grained analyst/programme/public boundaries | Choose identity provider based on deployment authority |
| ADR-009 | Certified publication requires explicit human approval | High-stakes statistical policy output | Role-dependent dual signoff where warranted |
| ADR-010 | Separately owned programme operations and payments | Prevent statistical AI from causing direct financial transactions | Explicitly audited integration for authorised aggregate programme monitoring |

## Nonfunctional objectives (starting acceptance targets, not observed performance)
- Availability: define separately per user-facing API and asynchronous jobs; start design target 99.9% monthly for API, failover/drill-tested.
- Evidence auditability: 100% of published numerical claims must resolve to immutable fact IDs and, where required, official reference IDs.
- Privacy: 0 unauthorized hosted model payloads or public sensitive-cell disclosures in injection tests.
- Scientific: 100% of headline indicators pass independent estimators and pre-registered tests or are blocked.
- Recovery: full retry/restart tests preserve lineage and avoid duplicate releases.
- Performance: establish SLOs after benchmarking realistic data and expected concurrent investigations; do not invent a guaranteed investigation completion time.


---

# Part 4: `02_ARCHITECTURE/MASTER_ARCHITECTURE.md`

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


---

# Part 5: `02_ARCHITECTURE/DIAGRAMS_GUIDE.md`

# Mermaid diagrams

There are **14 independently editable Mermaid source files** in `mermaid/`. Use VS Code Mermaid preview, GitHub Markdown fenced Mermaid or official Mermaid Live Editor. These are text-based architecture specifications, not screenshots.

- `01_MASTER_PLATFORM.mmd`
- `02_INVESTIGATION_SEQUENCE.mmd`
- `03_INDEPENDENT_SCIENCE.mmd`
- `04_OFFICIAL_SOURCE_PIPELINE.mmd`
- `05_SEMANTIC_MATCHING.mmd`
- `06_AI_GATEWAY.mmd`
- `07_CLAIM_TO_REPORT.mmd`
- `08_DEEP_DISTRICT_INVESTIGATION.mmd`
- `09_EVIDENCE_TO_ACTION.mmd`
- `10_PRIVACY_TRUST_ZONES.mmd`
- `11_PRODUCTION_DEPLOYMENT.mmd`
- `12_FAILURE_RECOVERY.mmd`
- `13_REPORT_STATE_MACHINE.mmd`
- `14_LINEAGE_AND_ENTITY_GRAPH.mmd`

**Validation:** A lightweight structural check is supplied; it is not the official Mermaid parser. If Mermaid CLI is available, run it on every diagram before approving deliverables. The diagrams show target architecture, not current implementation.


---

# Part 6: `03_STATISTICAL_SCIENCE/SURVEY_ESTIMATION_SPEC.md`

# Scientific estimator contract — EICV / survey datasets

## Primary rule: define estimand BEFORE calculating
`IndicatorDefinition` contains numerator event, eligible universe, unit, household/person weights, strata, PSU, reference period, missingness and geographic domain. Derivation is approved by survey statistician and linked to NISR methodology.

### Headcount and ratio measures
For an eligible indicator with person weights `w_i` and poverty flag `y_i in {0,1}`, estimate `p_hat=sum(w_i*y_i)/sum(w_i)` using eligible population and an approved weight. Do not silently substitute household weights for a person-level poverty headcount. National includes district; for district–national variance include covariance via joint survey design, not independent-sample subtraction. Counts use documented population total and count uncertainty; never manufacture counts from unverified denominators.

### Poverty depth and severity
For welfare `c_i`, line `z>0`, define `g_i=max(0,(z-c_i)/z)`. FGT(alpha) = `sum(w_i*g_i**alpha)/sum(w_i)` for alpha 1 and 2; FGT0 uses poverty classification. Check welfare scale, adult-equivalence convention, temporal deflation, poverty line and sampling unit with NISR documentation. Do not treat models using different EICV methodologies as direct trends.

### Complex-survey variance
Compute design-based Taylor linearization for ratios, mean and proportion, using actual strata and PSU IDs. Singleton stratum handling must follow documented NISR design or a statistically reviewed alternative; do not invent PSU duplicates. Distinguish with/without-replacement and finite population correction depending on known design. Degrees of freedom, interval method and effective sample sizes shall be stored and surfaced. Domain estimation must retain full design information (not naively subset sample before variance if inappropriate). Cross-estimator differences use the covariance of the full vector.

### Reliability policy
Require: estimate, standard_error if estimable, CI level and bounds, design degrees of freedom, n observations, n independent PSUs, n strata, effective n, relative SE or CV when meaningful, flags for small domain/suppression, and statistical design notes. Classification is configurable, tested, and DOES NOT silently convert unreliable estimates into precise numbers. For values near zero use suitable absolute-precision checks instead of blindly dividing by zero. All reliability warnings are mandatory in LLM digest and canonical report.

### Indicators, start registry
| Concept | Proper denominator | Major failure to guard |
|---|---|---|
| Poverty rate | persons represented by approved population weights | household count called people count |
| Extreme poverty | people using current wave's compatible poverty definition | different poverty line/welfare convention |
| Grid connection | households, based on explicit grid variable mapping | confused with electricity as lighting source |
| VUP participation of poor households | sampled poor households under precisely approved component rules | participation confused with eligibility/coverage |
| Health insurance coverage | persons currently covered (definition/year) | household vs individual mix |
| Financial inclusion | FinScope-defined population (adults/individuals as specified) | join FinScope to EICV at person level without linkage |

### Statistical test suite
- Hand-calculated tiny fixtures including missingness, zero weights, two strata, multi-PSU and domain subsets.
- Independent Python primary vs R survey reference by both point estimate and design-based SE (the reference must load *raw* fixture inputs, not primary intermediate predictions).
- National–district difference with nonzero covariance and intentionally wrong independence assumption.
- Headcount boundary cases (0%, 100%), all-missing denominator (blocked), singleton strata (explicit reviewed behavior), suppression.
- Variance reference from official NISR where available, separate from independent recalculation.
- Metamorphic tests: row reordering, multiplicative weight scaling, duplicate-record rejection, labels and unit substitutions.

### Tolerance rule
Tolerance is **pre-registered per indicator, quantity and precision** in `tolerances.yaml`; e.g. decimal-rounding agreement for one-decimal published percentages must use the official rounding convention and source precision. Independent software equivalence may use tight absolute and relative tolerances justified on numeric conditioning. No global `0.1` tolerance across rates, standard errors, counts, or model outputs. If observed difference crosses a registered threshold, status `validation_failed`, explain mismatch and block approval. Do not loosen tolerance to make tests pass.

### Production recipe
1. Validate dataset/license/hash and version.
2. Load approved columns via indicator mapping and validate join cardinality.
3. Calculate point estimate and design-based uncertainty.
4. Independently recalculate with separate implementation/fixture.
5. Record both computed digests and pre-registered difference threshold.
6. Resolve disagreements or mark invalid; only after this create a frozen `CalculatedFact`.
7. Compare against official publications *independently* in evidence plane.


---

# Part 7: `03_STATISTICAL_SCIENCE/ADVANCED_MODELS_AND_CAUSAL_INFERENCE.md`

# Advanced scientific modelling, competing explanations and causal safeguards

## Scientific tiers
1. **Descriptive:** certified weighted rates, geography and trend under harmonized definitions.
2. **Associational:** adjusted regressions, Oaxaca-Blinder, partial correlations, robustness, heterogeneity; labelled noncausal.
3. **Predictive:** out-of-time and geographic holdouts, drift and calibration, stability, subgroup performance, misclassification and fairness; predicted risks never used alone for individual benefit decisions.
4. **Causal evaluation:** only when identification strategy is defensible; registration of estimand, DAG, assumptions, comparison groups, assignment mechanism, falsification, negative controls, sensitivity and uncertainty. If assumptions cannot be defended, abstain from causal claims.

## Decomposition review contract
- Register outcome and link function (e.g. weighted linear probability model), reference coefficients, covariate selection and grouping, missingness/imputation and survey weighting.
- District is part of Rwanda overall: investigate reference contamination and sensitivity to alternate reference choices; clearly state why modelled decomposition is **not a cause attribution**.
- Store total difference, explained and unexplained parts, group shares, bootstrap specification, confidence intervals, seed, resampling unit, sampling design and exact numeric reconciliation.
- Refit entire pipeline in each bootstrap replicate; check convergence, singularity, imputation effects, outcome bound and sign stability.
- Compare full sample vs held-out/alternative models, consumption-based comparisons and contextual threats; retain null or counterintuitive results.

## Responsible predictive and spatial analytics
- Exclude administrative target leakage, future features and post-treatment variables.
- Use spatial block cross-validation for spatially autocorrelated patterns; map observed data with uncertainty and suppression. Do not pretend census-like precision from small survey district cells.
- Forecasts require model backtesting, scenario ranges, distribution shift thresholds, reference baseline and revision conditions.
- Scenario simulation is **conditional**, not an official forecast or evidence that a programme will cause a reduction.

## Causal policy methods (select as applicable, not automatically)
- Randomized trials when ethically designed and properly authorized.
- Difference-in-differences with parallel trends checks and adequate comparison groups.
- Regression discontinuity where thresholds, manipulation and support assumptions are tested.
- Instrumental variables only with plausible exclusion and relevance analysis.
- Synthetic controls where sufficient donor pool and preperiod fit exist.
- Interrupted time series with seasonality/autocorrelation and concurrent shock review.
- Target-trial emulation or matching with explicit confounders and sensitivity to unmeasured confounding.

## Study register
A protocol has `study_id`, question, hypothesis, estimand, eligible datasets, design, identifying assumptions, analysis plan, preregistration timestamp, review, power/precision, endpoints, subgroup rules, correction for multiplicity, privacy plan and deviations. Require independent research review for causal conclusions. Never say an Oaxaca-Blinder contribution is a proven effect of adding a service.

## Equity, interventions and monitoring
For each programme option define target population, delivery owner, theory of change, eligibility source, constraints, rough budget assumption vs validated budget, potential spillovers and harms, equity tradeoffs, outcomes, counterfactual/evaluation design, data collection schedule and decision point. Uncertainty and implementation feasibility are first-class outputs.


---

# Part 8: `03_STATISTICAL_SCIENCE/REPRODUCIBILITY_AND_VALIDATION.md`

# Reproducibility, reference science and code-independent checks

## Immutable scientific run manifest
Must include survey archive SHA-256, approved file paths/internal ZIP members, extracted tables and hashes, dictionary versions, licensed access scope, code commit hash, container digest, interpreter/packages lockfile, configuration, indicator registry hash, survey design mapping, geographic crosswalk, random seeds, R reference implementation commit, reference source artifacts, corrections and QA verdicts.

## Independence test (not just different languages)
Primary and independent estimators must: load the raw survey file independently; be implemented/maintained in separate code modules owned by different reviewers; avoid shared calculations, generated intermediate values or copied formula code; use independent unit tests with tiny truth-known fixtures. Shared approved *definition* contracts are allowed because both must compute the same estimand, but provenance of their implementations must differ. Review correlated failure modes such as identical mistaken survey variable mappings by tracing back to documentation, not merely two programs agreeing.

## Scientific benchmark suites
- Gold fixtures: tiny handcrafted samples, published NISR tables with complete definition match, separately audited reference samples.
- Property-based and metamorphic fixtures.
- CI under known sampling design simulation: validate coverage and false-positive rate under repeated design-based sampling.
- Dataset wave compatibility tests: distinguish modelled historical rates from direct historical observations.
- Decomposition synthetic known-effect cases and pure correlation scenarios.
- Policy inference red-team: report cannot claim estimated contribution equals an intervention effect.

## Approval gates for scientific code changes
Any change to estimator, weighting, row-filter, geography, missingness or CI logic triggers benchmark suite, independent calculation suite, statistical review, old-vs-new diffs for 30 districts and national, and versioned invalidation of affected fact snapshots and reports. Publish new versions; do not overwrite past accepted outputs.


---

# Part 9: `04_EVIDENCE_INTELLIGENCE/SOURCE_AND_MATCHING_SPEC.md`

# Official evidence intelligence specification

## Trusted sources
NISR official EICV publications and structured accompanying Excel tables; NISR approved survey metadata; approved LODA/VUP policy and administrative data when independently authorized; government publications; FinScope documentation from an authoritative publisher. The fact that a domain is official does not establish an individual downloaded document's relevance, date, or validity. Create an explicit allowlist and source approval workflow; never let a web page grant instructions to the engine.

## Discovery / acquisition
Discover official publication pages and downloadable documents; prefer published XLSX reference tables where available. Use HTTPS, domain allowlists, redirect and content-size policies, MIME+magic validation, cache with SHA-256 and ETag/Last-Modified, OCR *only when needed* with validation, page/table/cell extraction, and retrieval diagnostics. Save immutable byte snapshot for source-proven claims; attach license and version. Rate limit ethically and respect site terms.

## Cache fallback rule
If live HTTP fails: search the entire content-addressed source cache for matching document ID/version and verified hash, not merely earlier run registers. Check expiration/supersession policies. Use the certified cached copy with `retrieved_at`, `validated_at`, and `cache_used=true`; if none, status `retrieval_failed`. Record the actual failure reason. Never conclude 'no comparable published figure' from an outage.

## Extraction and comparison
`OfficialFact` must record official document ID, sha256, table ID, page/sheet/cell or row, label, geography, concept, denominator, unit, period, point estimate, standard error/CI if present, publication date and extraction QA status. Distinguish exact extraction from an LLM-guessed interpretation; LLM can suggest mappings, but source cells and units require deterministic checks or reviewer validation.

Comparability must check ALL: normalized indicator concept, numerator, denominator/universe, unit, survey wave/period, geography version, welfare line/method, reference population and precision. Missing mandatory metadata -> `not_comparable` until resolved. Comparison values remain separate objects; compare using precision-specific tolerance and preserve differences. Match may be `externally_matched` only if computational and reference `origin_artifact_hash` differ and neither source was copied from the other.

## Version and conflict rules
- Source identity = canonical official organization + document stable ID + release version + content hash; same URL can serve changed bytes.
- Do not silently prefer the newest file if official correction is ambiguous. Record release notes, recency, declared supersession and reviewer decision.
- When official publications disagree, store a conflict object with both source facts and block automatic verified status.
- Reference provenance status: `cited_read`, `listed_unread`, `retrieval_failed`, `superseded`, `conflicted`; citations to unread sources are not evidence of a figure.

## Claim summary counts
Show separate counts: `eligible_matches`, `matched`, `mismatched`, `not_comparable`, `retrieval_failed`, `reference_not_found`, `original_analysis`, `unattempted`. Denominator counts must equal detailed rows; never announce '1/15 matches' when the one match is a copied official value.

## Kamonyi required negative fixtures
- 20/24 URLs fail; valid cache exists; correct cache retrieval or explicitly incomplete evidence.
- A NISR modelled 2016/17 value copied as both internal and official -> reject external match.
- Grid *connection* vs electricity for lighting -> not comparable until a documented equivalence exists.
- VUP poor-household participation vs official programme administrative eligibility -> not comparable.
- Published district confidence interval exists but extractor misses it -> false negative test must surface coverage gap.


---

# Part 10: `04_EVIDENCE_INTELLIGENCE/SEMANTIC_CATALOG_AND_DATA_LINEAGE.md`

# Statistical semantics, ontology, geography and end-to-end lineage

## Machine-enforced indicator definition
Key `(concept_id, definition_version, survey_wave, universe, weight_scheme, geography_version, period, method)` determines whether two statistics have comparable semantics. Explicitly model `person` vs `household` and programme participation vs eligibility and programme receipt. A technical definition is immutable; corrections require a new version, migration review and a recomputation plan.

## Data lineage entities
`SourceDataset -> RawFile -> ExtractedTable -> JoinedAnalysisFrame -> EstimatorRun -> CalculatedFact -> ScientificVerdict -> OfficialComparison -> Claim -> ReportVersion -> PublishedArtifact -> DashboardWidget`. Each edge includes input hash, transformation code version, timestamp, principal, and approved license. Keep lineage queryable both forward (what reports were affected by a dataset change?) and backward (what created this cell?).

## Geographic crosswalk
Use Rwanda's official district IDs, names and boundaries with an effective date. Store mappings for boundary changes, unavailable sector detail, source coverage and spatial join confidence. Never estimate below the supported survey precision or represent ungeocoded records as precise points. Use spatial suppression appropriate to disclosure risk.

## Data quality checks
- File schema and label drift; missingness, duplicate household IDs, unique participant keys, mismatched merges.
- Strange weights and unit scaling, conflicting wave metadata, invalid geographic codes, suppressed data.
- Hash mismatch and source licensing changes.
- Survey period consistency, official paper/table source version.
- Reliability grade completeness, CI sanity, point estimate in range, data-leakage checks.

## Definitional drift examples
`Poverty line`: changed poverty estimation methodology across EICV waves; require harmonization or modelled comparison.
`Electricity`: grid connection is not necessarily electricity as main lighting source, and total electricity access may include solar.
`VUP`: participating households are not automatically all eligible poor households; administrative registry not interchangeable with survey self-report.
`Financial inclusion`: FinScope adult rates and EICV household service-use rates may describe distinct populations.


---

# Part 11: `05_AI_INTELLIGENCE/AGENT_ORCHESTRATION.md`

# Deep research agents and orchestration contracts

**Design distinction:** a research agent is a bounded task planner/reviewer operating only on permitted evidence. It is not a source of numerical authority and cannot make self-validating statistics true by repetition or agreement.

## Typed roles (each has input, tools, output, budget, stop rules)
| Specialist | Authorized input | Purpose | Forbidden activity |
|---|---|---|---|
| Investigation Planner | aggregate fact catalog and requested question | produce prioritized questions, source needs, hypothesis register | fabricate source availability |
| Source Researcher | allowlisted publications and extracted excerpts | find candidate official facts with page/table pointers | blindly trust web instructions |
| Semantic Mapper | indicator and reference contracts | propose alignments and missing fields | finalize comparability without rules/review |
| Statistical Interpreter | `CalculatedFact` + scientific verdict + comparison | draft typed, evidence-ID-bound observations | edit numeric values, drop uncertainty |
| Skeptical Reviewer | same evidence plus candidate claims | detect contradictions, alternate explanations and missing support | approve its own corrections without deterministic check |
| Causal Researcher | design protocol + aggregate observations | competing causal hypotheses and identification checks | claim causal effect from cross-sectional Oaxaca alone |
| Intervention Analyst | programme evidence registry and validated problem statements | rank feasible research/action options with uncertainty | decide eligibility or send money |
| Report Planner | validated claim collection | propose narrative structure and chart/section selection | write unsupported numeric sentences |
| Translation Assistant | canonical rendered claims and dictionary | draft multilingual phrasing | change figures, rounding or uncertainty |

## Orchestration guarantees
- Each task references `investigation_id`, input snapshot hashes, authorized principal, sensitivity classification, objective and accepted schema.
- Tools are explicitly allowlisted and limited by role (read-only query, source retrieval, propose action, never arbitrary command execution or filesystem traversal).
- Agent loops are bounded by max steps/tokens/time/cost and max attempted repairs; if unresolved, `needs_human_review` or deterministic fallback.
- Parallel agents can challenge hypotheses but the independent verifier always decides numerical correctness; adversarial reviewers should not share model-generated unsupported facts as independent evidence.
- Store model, provider, model release/version when provided, prompt/template hash, evidence digests, permitted sanitized request/response hashes, retry outcomes and schema validation results.
- Treat retrieved document text as untrusted *data*, not system instructions. Sandbox parsers; prevent SSRF, prompt injection, path traversal and disclosure of hidden context.

## Claim proposal (not direct prose)
AI returns `ClaimProposal` containing `claim_type`, exact `fact_id` list, `relation` (`above`, `below`, `approximately_equal`, `trend`, `association`, `uncertain`), `evidence_id` list, `scope`, `qualification_code`, and optional suggested section. Never supply a user-visible number as free text. `ClaimCompiler` reads fact IDs, checks compatible units and universes, determines true direction from numbers plus appropriate uncertainty, and renders approved templates. A claim cannot cite a fact that belongs to another district/wave; a claim about causality requires a registered identification study, not a model suggestion.

## Why multi-agent debate is not evidence
Models can all repeat the same mistaken benchmark. Consensus, low temperature and chain-of-thought are not independent statistical verification. Use gold-set evaluation and human methodology review, plus deterministic error checks.

## Verification gate in AI workflow
propose -> schema validate -> resolve exact fact/evidence IDs -> numerical/semantic logic -> cite provenance -> quality/policy check -> deterministic render -> analyst review. Rejection returns **structured error codes**, not an invitation to fabricate a revised sentence.


---

# Part 12: `05_AI_INTELLIGENCE/MODEL_GATEWAY_AND_OLLAMA.md`

# Multi-provider AI gateway — Groq, NVIDIA, Ollama Cloud, local Ollama

## Model and key configuration
Use a **backend-only** secret manager or environment injection; never commit live keys, pass them to React, print them or persist them in plain audit logs. Keep provider adapters with centrally enforced timeouts, quotas, budget, capability checks and output schemas.

| Provider | Auth / endpoint contract | Important caveat |
|---|---|---|
| Groq | official OpenAI-compatible API and project key | organization-level limits apply; extra keys do not manufacture quota |
| NVIDIA | model-specific hosted API; verify at deployment | model availability, data handling and terms vary; no hardcoded model guarantee |
| Ollama Cloud | `https://ollama.com/v1`, `Authorization: Bearer` API key | confirm model ID and supported endpoints dynamically |
| Local Ollama | `http://127.0.0.1:11434/v1` when running locally | local API generally unauthenticated; restrict bind address/firewall; cloud models through local proxy must not be mistaken for local-only processing |

Authoritative Ollama API guidance: https://docs.ollama.com/api/openai-compatibility and https://docs.ollama.com/api/authentication. Cloud API requires a real API key, while OpenAI SDK connections to a local Ollama server may use an ignored placeholder value. Cloud API is only a subset of OpenAI behavior: feature-capability probes are mandatory.

## Allowed model tasks and preference
- `structured_analysis`: only aggregate/suppression-checked facts; use strongest benchmarked model for strict schema accuracy.
- `source_classification`: public documents only, constrained output, no official-truth assignment by model.
- `hypothesis_generation`: aggregate evidence plus limitations, retrievable candidate hypotheses only.
- `translation`: finalized numeric claims rendered from facts; back-translation/quality review of meaning.
- `microdata_processing`: **never hosted**; use deterministic code or approved strictly local execution with data safeguards if necessary.

## Routing policy, in order
1. Enforce data category and authorization before any payload leaves the trusted environment.
2. Determine capability requirements: context, structured JSON, language, vision, latency, tool protocol, residency, privacy, cost.
3. Filter by verified provider policy and supported features; never assume universal support because endpoint resembles OpenAI.
4. Apply empirical task-specific quality benchmarks and availability checks; record chosen version and reason.
5. Rate-limit by real provider/organization quota, respecting 429/Retry-After; do not bypass quotas by rotating keys from the same owner.
6. Call model with bounded retries, jitter, circuit breaker, context limits and graceful degradation.
7. Validate schema and claim bindings; if invalid, retry within budget with structured diagnostics; never accept hallucinated numbers.
8. Exhaustion -> restricted draft with reason, deterministic evidence summary, or human review.

## Operational security
- Cloud endpoints must be outbound-allowlisted and use TLS verification, not disabled certificate checks.
- Local Ollama processes must be restricted to host or authenticated proxy; local server access should not be exposed publicly.
- Secret rotation and revocation, usage audit, cost caps, model deprecation checks and scheduled benchmarks are required.
- Only cloud-approved **aggregate** values with permitted precision and safe group sizes are transmitted. Suppress row-like data, identifiers, small-cell reconstructions, rare-category combinations and user uploads until reviewed.
- Never claim an external provider has zero retention or unrestricted data residency without verifying its current contract.


---

# Part 13: `05_AI_INTELLIGENCE/STRUCTURED_CLAIMS_AND_REPORT_COMPILER.md`

# Typed claims, evidence binding and deterministic narrative compiler

## Problem being eliminated
The audited Kamonyi pipeline used regex text correction that misread `poor households` as the poverty-rate concept and inserted a new poverty statement. The target **must not let the model type arbitrary numerical prose and hope regex later repairs it**.

## Claim resolution algorithm
1. Receive only schema-conformant `ClaimProposal` (no `value` string, no free `numeric_text`).
2. Authorize access to facts by report audience, purpose, geography and sensitivity.
3. Assert `fact_id` exists and is independently validated; resolve source fields from immutable fact registry.
4. Assert same universe, unit, time, geography or registered valid comparison transformation across referenced facts.
5. For `above/below`, compute difference from unrounded values; apply registered uncertainty/comparison significance policy and use language appropriate to evidential strength.
6. Render point estimate and CI from facts with approved rounding rules; preserve reliability label and mandatory warning.
7. For `causal_effect`, require a methodological approval object and linked study; otherwise reject with `CAUSAL_NOT_ESTABLISHED`.
8. Link source table coordinate or original analysis provenance to each numeric sentence; assign citation with read status.
9. Serialize rendered claim into `ReportDocument` AST and run cross-format equivalence checks.

## Example: claim (sanitized, illustrative only)
```json
{
  "claim_id": "c-poverty-compare-kamonyi",
  "claim_type": "comparison",
  "fact_ids": ["fact-kamonyi-pov", "fact-rwanda-pov"],
  "relation": "above",
  "qualification_code": "observational_difference",
  "evidence_ids": ["comparison-kamonyi-pov"],
  "section": "executive_summary"
}
```
The compiled statement is built using resolved estimates and statistical rules; the AI never types `39.7` as authoritative output.

## Narrative risks beyond numerics
- Negative facts, causal implications, unsupported generalizations and missing coverage must be checked using proposition-level review and human sign-off. Schema validation alone cannot guarantee truth of qualitative claims.
- Claims from unsupported explanatory hypotheses must carry labels like `hypothesis_not_confirmed` and cannot be presented as established drivers.
- Translations must use immutable placeholders for facts and independent language review; translation cannot alter the estimate, uncertainty or reference.

## Canonical outputs
`ReportDocument` AST holds normalized section IDs, claim IDs, table/chart spec IDs, policy flags, evidence IDs, preapproved text blocks, glossary, citations, approval signatures, and artifact manifests. Every export uses this same AST, not independent Python/Node/browser report builders. The XLSX contains native chart objects using workbook data references and retains metadata and verification sheet.


---

# Part 14: `06_DEEP_INVESTIGATION/INVESTIGATION_WORKFLOW_AND_HYPOTHESES.md`

# National → district investigation: complete evidence-to-action protocol

## Research stages (all durable, each with a gate)
**S0 Intake and authority:** authorize principal, geographic level, purpose, source permissions, cost budget, data sensitivity and type of output (public statistics vs restricted programme work).

**S1 Investigative framing:** question decomposition, registered estimands, predeclared comparison set, hypotheses and proposed indicators. Record alternative explanations; no post-hoc selection masquerading as prespecified.

**S2 Data readiness:** versioned datasets, dictionary/contract alignment, joins, weights, survey design, reliability/suppression feasibility, geography and periods.

**S3 Core estimates:** poverty, services and money inclusion by correct survey design. Recompute independently, compare SEs, expose invalid domain inferences.

**S4 Official verification:** acquire NISR tables, compare definitions, handle version conflicts, cite exact pages/sheets and classify every claim.

**S5 District diagnosis:** national/province/peer comparison with multiple-comparison control, deprivation profiles, trend harmonization, alternative hypotheses and known confounding. Do not imply that national average is an independent comparison group.

**S6 Deep scientific investigation:** descriptive/associational/causal tier chosen by evidence; decomposition only with limitations, geographic variations and sensitivity analysis. Flag where evidence is insufficient for an answer.

**S7 Intervention evidence:** programme registries, evidence synthesis, known effects under comparable settings, cost assumptions, delivery feasibility, equity, risks, and ability to evaluate. Keep a distinction between supported operational questions and unproven effects.

**S8 Plan and monitoring:** action options, priority rationale, owner, milestones, counterfactual/evaluation method, indicators, safeguards, dependencies and stop/review triggers.

**S9 Publication:** typed claims, QA, security and scientific review, immutable approval, accessible exports and audit logs.

**S10 Follow-through:** monitor outcomes/implementation, compare observed results with preregistered evaluation criteria, reopen investigation when data or publications change. Create a new version, never rewrite past official report.

## Evidence ledger per hypothesis
`hypothesis_id`, competing hypotheses, direction, evidence for, evidence against, data gaps, tests run, adjusted inference, causal identification status, confidence category, reasons not tested, next evidence request. A hypothesis may be `inconclusive`; AI can propose an evidence gathering task but not claim proven causation.

## Stop conditions
Stop escalation when available evidence is exhausted, statistical precision is inadequate, privacy risk too high, external source unavailable and needed, cost/time budget exhausted, or methodology disputed. Return structured report of known facts, unresolved gaps and recommended research; do not silently fill them with AI-generated plausible assertions.

## Concrete Kamonyi pathway
The historical report listed district poverty 39.7%, national 27.4%, grid 29.1%, poor-household VUP 9.2%, decomposition and 20/24 source retrieval failures. Treat these as **audit fixture values only**, not re-certified official results. A new Kamonyi run must independently recompute and verify every relevant measure, reject copied NISR references, propagate uncertainty and prove the false VUP correction is impossible.


---

# Part 15: `06_DEEP_INVESTIGATION/POLICY_PROGRAMMES_AND_MEASUREMENT.md`

# Policy and programme evidence-to-action architecture

## Programme data is governed separately
VUP, Girinka, cooperative jobs/skills, health insurance and cash-transfer programme records are not interchangeable with EICV survey responses. Administrative eligibility and individual transactions stay in separate, explicitly authorized systems. The AI may inspect approved aggregates and suggest questions, not approve beneficiaries, initiate payments or allocate programme benefits.

## Intervention option record
- Targeted district / demographic scope and beneficiary criteria source.
- Diagnosed need and associated uncertainty; competing explanations.
- Intervention category, responsible implementing agency and actual authorization.
- Evidence base quality: trial, quasi-experiment, observational, qualitative, expert consensus, not yet tested.
- Transferability assessment to Rwanda/district, assumptions and expected heterogeneity.
- Costs: measured budget line vs estimated illustrative ranges; fiscal feasibility, funding source and confidence.
- Equity: who benefits, potential exclusion, access barriers and potential harm.
- Policy dependencies, legal/procurement requirements and operational risks.
- Monitoring metrics, baseline, control/comparison strategy, evaluation date and success/failure criteria.

## Action recommendation classes
1. `investigate_more` for unknown causes or missing data.
2. `audit_programme_delivery` when participation appears low but eligibility is unclear.
3. `pilot_and_evaluate` when evidence is suggestive, limited or context-dependent.
4. `consider_scale` only when credible effect evidence, feasibility and authority support it.
5. `do_not_recommend` where evidence contradicts benefits or material adverse risks exist.

## Programme monitoring design
Track coverage, take-up, dropout, time-to-delivery, beneficiary feedback, exclusion risks, outcomes and cost (with source and denominator). Avoid treating before/after movement as a causal programme result without a credible evaluation design. Update action priorities when reliable data or implementation outcomes arrive, with review/versioning.


---

# Part 16: `07_SECURITY_GOVERNANCE/SECURITY_PRIVACY_AND_ACCESS.md`

# Security, privacy and disclosure architecture

## Data trust classifications
- **PUBLIC:** published statistical aggregates already cleared for release.
- **RESTRICTED_AGGREGATE:** approved analysis results that still require minimum cell-size, complementary suppression, differencing-risk and export checks.
- **CONFIDENTIAL_MICRODATA:** individual/household source rows, linkage keys and sensitive fields; never enter hosted LLM requests.
- **BENEFICIARY_OPERATIONAL:** named programme records and finance/insurance status, separate lawful purpose and retention rules.
- **SECRETS:** tokens/keys/passwords/certificates, never within AI prompts or client bundle.

## Enforcement model
OIDC-authenticated users with role + attribute policies (district coverage, dataset license, research purpose, report sensitivity and provenance). Authorized export check must run at API and object download, independent of hidden UI elements. Signed object URLs bound to principal, purpose, version and short expiry; revoke/report supersession invalidates public access where possible. Use encryption at rest/in transit, tenant/project boundaries, audit events, least privilege, MFA for privileged actions and no secrets in logs.

## Disclosure safety
Threshold checks, primary/complementary suppression, rare-category review, reconstruction and differencing attack tests (including repeated query budget), geolocation fuzzing at permitted granularity, output rounding policy and manual disclosure control for high-risk public reports. Treat aggregate values as potentially reidentifying under small groups. Log every permitted aggregate export; public dashboards use published release snapshots only.

## Hosted AI policy
Cloud AI may receive only sanitized, approved aggregate facts and allowable public excerpts, after disclosure tests. Do not accidentally proxy cloud requests through local Ollama in 'local-only' mode. Provider usage terms, retention and regional restrictions require documented approval. Prompt injection in source material must not trigger data transfer, secret access or tool execution.

## Secure SDLC and threat modelling
Threats: SSRF through source URL, PDF parser exploit, malicious Excel formula, prompt injection, malicious archive traversal, token theft, report-link bypass, privilege escalation, data poisoning, stale or replayed approvals, CSRF, webhook forgery, DDoS and cross-tenant query leaks. Mitigate with URL allowlist, sandbox parsers, file scanning, safe spreadsheet formula handling, signed artifacts, schema validation, network egress policy, dependency scanning, SAST/DAST, policy unit/integration tests, and incident runbooks.

## Regulatory note
Do not claim Rwanda law compliance from this document alone. Obtain applicable Rwanda data protection/privacy, survey licensing, institutional approvals and cross-border processing legal review before accepting confidential microdata or operational beneficiary records.


---

# Part 17: `07_SECURITY_GOVERNANCE/QUALITY_RELEASE_AND_HUMAN_APPROVAL.md`

# Quality release gate and human approvals — executable policy specification

## Machine gate evaluation
The backend freezes `ReportDocument` and checks: scientific facts validated; variance and reliability mandatory fields present or explicit reason unestimable; official evidence comparison accurate and source provenance independent; no unresolved critical source conflict; claims fully typed/resolved; charts/exports consistent; suppression and data rights passed; report version links all hashes; expected review signatures present. Gate runs even if Node/React/browser attempts direct export.

## Allowed outcomes
- `restricted_draft`: may show diagnostic findings to authorized investigators with red banners and unresolved errors.
- `qa_failed`: cannot circulate to official/public users; requires remediation and rerun of affected stages.
- `awaiting_review`: all automated critical checks pass, analyst judgment needed.
- `approved`: required reviewers authorized and no expired source/validation conditions.
- `published`: immutable release snapshot and access rights established.
- `superseded`: newer revision exists; old evidence preserved for audit, marked outdated.
- `revoked`: critical defect found postrelease; withdraw access where supported, issue incident and correction notice.

## Human approval levels
1. Statistical-method reviewer — sample design, estimator/uncertainty/model interpretation.
2. Evidence reviewer — official document, comparability/source conflict.
3. Privacy reviewer — aggregate suppression and release audience.
4. Publication authority — final policy language, release scope, legal/institutional conditions.
Roles may be combined for low-risk internal drafts if explicit policy permits; no auto-approval for high-impact public reports or beneficiary-impacting recommendations. The request author cannot satisfy an independence requirement with self-approval.

## Blocking examples
Self-comparison `external_matched`; missing required confidence interval with unsupported 'precise' claim; wrong household/person denominator; cloud disclosure; claim with uncited number; incorrect comparison direction; cached fact changed under a report; report files created independently with conflicting figures; revoked approval signature; modelled historical figure masquerading as observed trend.

## Quality metric dashboards
- Comparable official claim match coverage (excluding original analyses from denominator).
- Retrieval success/cache hit, false-negative table detection, source freshness, source conflicts.
- Independent-statistical agreement and SE coverage test quality.
- Unsupported claim rejection rate, prompted disclosure attempts, quality by model/task/language.
- Report version lineage coverage, release gate bypass attempts, revocations, postrelease corrections, time to detection.


---

# Part 18: `08_PLATFORM_ENGINEERING/PRODUCTION_TOPOLOGY_AND_OPERATIONS.md`

# Production topology, reliability and observability

## Deployment reference (technology choices subject to ADR review)
React frontend -> API ingress/WAF -> FastAPI authenticated API -> authorization/ABAC service -> durable Temporal workflow service -> separate Python statistical workers, R independent validation workers, source-evidence workers, bounded AI gateway workers, report/approval workers. PostgreSQL stores metadata, jobs and policy decisions; encrypted object storage stores original licensed datasets, official documents, evidence snapshots, immutable reports. A model gateway connects to approved remote vendors or an isolated local Ollama cluster. Logs and metrics flow to a protected observability stack.

## Workflow semantics
Each investigation has stable UUID, payload hash, idempotency key, code+data version and retry policy. Workflows model independent scientific calculations and source retrieval as parallel activities, converge on immutable registries, and create new versions for revalidation. Temporary provider failures retry with backoff and circuit breaker; scientific invalidity does NOT retry endlessly. Side effects (export signing, approval notifications) use transactional outbox/idempotent operations. Long tasks heartbeat and checkpoint; use persistent task status and progress events; never rely on in-memory process maps as the source of truth.

## Data storage
PostgreSQL for `investigations`, `stage_events`, `datasets`, `indicator_definitions`, `estimates`, `reference_facts`, `comparisons`, `claim_proposals`, `reports`, `approvals`, `policy_decisions`, `provider_trace_metadata`, `incidents`. Large raw files and reports remain in object storage under content hashes; enforce retention policies and licenses. PostgreSQL access control, migrations, query audit and backups must be tested.

## Monitoring and alerting
Distributed tracing with dataset/run/source/model IDs (never secrets or microdata), spans for every source retrieval and statistical step, provider latency/rate-limit/cost monitoring, release gate outcomes, source freshness, statistical drift and quality regression alerts. Separate infrastructure incident from scientific-method incident and official-publication-change incident. Alert owner and put impacted reports into review or revoked state as appropriate.

## Disaster recovery and rollout
Versioned backups, tested restores, encryption key recovery procedures, infrastructure-as-code, staging canary, rollbacks and worker code-version compatibility. Pin dependency lockfiles and container digests. Run chaos drills: source outage, partial network, worker crash, database failover, provider 429, model retirement, stale reference, data file corruption, object storage unavailable, approval race, revoked report access.

## Scale and resource isolation
Queues segmented by job intensity and data sensitivity; concurrency limits for PDF/Excel parsing, Python/R survey workloads and LLM token budgets; quotas per tenant/team. Avoid allowing one district or noisy actor to starve others. Measure realistic 30-district reprocessing throughput and costs instead of promising a hard time without benchmarks.


---

# Part 19: `08_PLATFORM_ENGINEERING/API_REPORT_AND_EXPORT_CONTRACT.md`

# API, canonical report and export contract

## API conventions
Version prefix `/v1`. OAuth/OIDC bearer token/session with CSRF for cookie auth; authenticated principal and data policy for EVERY request. `Idempotency-Key` for create/retry. Standard errors `{error_code, message, trace_id, retryable, details}` without sensitive content. Pagination, ETags, retry-after, schema version and explicit 202 for running jobs. Record server-side audit event for state-mutating operations.

## Key endpoints (design only)
| Verb/path | Input | Output | Authorization |
|---|---|---|---|
| POST `/v1/investigations` | district, question, purpose, scope | job_id, state | analyst with dataset access |
| GET `/v1/investigations/{id}` | id | stages, warnings, hashes | authorized owner/team |
| POST `/v1/investigations/{id}/resume` | rerun policy | new job/version | investigation manager |
| GET `/v1/investigations/{id}/facts` | permitted filters | certified facts with reliability | dataset and geography permission |
| GET `/v1/evidence/{id}` | official evidence ID | source metadata, table coordinate | license/data policy |
| GET `/v1/reports/{id}` | id/version | canonical report AST | report visibility policy |
| POST `/v1/reports/{id}/review` | approve/reject, reason | decision ID | authorized reviewer with segregation-of-duties rule |
| POST `/v1/reports/{id}/publish` | report version and policy revision | publication event | publication authority |
| GET `/v1/reports/{id}/export?format=pdf` | published version | signed permitted artifact | privacy, report and audience policy |
| GET `/v1/providers/health` | no key values | model capabilities/health | admin only |

## Report AST versioning
`ReportDocument` contains `report_id`, `version`, `investigation_id`, `fact_snapshot_hash`, `comparison_snapshot_hash`, `policy_version`, `sections[]` referencing claim IDs, chart specs referencing fact IDs, references with source read-status and table/page coordinate, glossary, warnings, review decisions, disclosure classification and artifact hashes. No report is approved by mutable live state; report is frozen first, reviewed second.

## Export consistency
Generate PDF/HTML/XLSX/JSON from same report AST via one report service. XLSX uses native data-linked charts and audit metadata sheets, with formulas safe from CSV injection. PDF is searchable, accessible and has embedded indicator/source labels. Public pages cannot show a different number or omit a material uncertainty warning.

## Chat and notebooks
Evidence-bound chat may answer from permitted report/fact IDs; otherwise says no suitable data or proposes an investigation. Actions emitted by chat are suggestions requiring UI confirmation and independent backend authorization. Notebook citations link to versioned reports and facts; stale facts are marked.


---

# Part 20: `09_MACHINE_CONTRACTS/SCHEMAS_README.md`

# Machine contracts and examples
The 9 JSON Schema files are **proposed contracts**, not generated bindings from a working engine. Use JSON Schema Draft 2020-12, version and freeze them in CI. Align auth/runtime semantics in code. All example numeric values are **ILLUSTRATIVE / NOT VERIFIED**, not gold statistical answers.

Schema validation prevents malformed shapes but does not alone verify factual meaning. Additional cross-record policies must check: origin independence; permission and dataset license; CI coherence; reliability; numeric reconciliation; definition compatibility; correct lifecycle; claims rendering; research study authorization; approval roles; report version hashes.

Sample calculated fact intentionally includes a disputed `valid_n` representation to illustrate why schema validation ≠ scientific truth; never use sample data as benchmark.


---

# Part 21: `10_VERIFICATION_TESTS/TEST_STRATEGY.md`

# Scientific, AI, security and operational acceptance strategy

## Test classes
1. **Structural contract:** JSON Schema, API schema compatibility, reference relations, determinism and hash/origin validity.
2. **Scientific gold:** hand-computed fixtures and NISR official values with identical definition; tests of weighted means, covariance, SE, domains, missingness, poverty depth and reliability.
3. **Independence:** primary vs separately owned R implementation, no shared estimator code, pre-registered tolerances and different underlying numerical routines.
4. **Extraction & meaning:** PDF/XLSX table cell extraction, source date/hash, cache fallback, official conflicts, unavailable vs unpublished, grid vs lighting and VUP participation vs eligibility.
5. **AI & claim:** schema fuzzing, unsupported number and causal language, wrong denominator, stale references, hallucinated citations, adversarial prompts, model failover and rate limits.
6. **Data privacy/security:** prohibited microdata egress, small-cell reconstruction, authz bypass, SSRF, malicious PDFs/Excel, secret leakage and signed-link revocation.
7. **End-to-end:** 30 districts and national, parity across JSON/HTML/PDF/XLSX/map and export authorization, source outage, worker crashes, reproducibility and approvals.
8. **Research & policy:** competing hypotheses, causal ID rules, intervention provenance, unsupported benefit claims and programme isolation.
9. **Performance/reliability:** concurrent district runs, peak model quotas, high-latency official sources, backups/restores and version rollbacks.

## Test tiers and status definitions
- `PASS`: test actually executed with retained evidence, reviewer and expected output verified.
- `FAIL`: executed and violated requirement.
- `BLOCKED`: could not execute due to missing environment, license, reference or independent reviewer; state why.
- `NOT RUN`: no execution. No passing inference from a unit test to real-data certification.

## Required acceptance evidence
Every test has ID, preconditions, inputs/version/hashes, operation, expected output, actual output, logs, run timestamps, responsibility and defect link. Real official NISR reference data should be downloaded under valid use policy and immutable hash; do not include restricted survey microdata inside this ZIP.

## Release conditions
Critical tests covering fake verification, independent statistical disagreements, invented numerical claims, disclosure, official source failure and export bypass must all PASS before external report release. Human approval must be valid and not self-signed when independence policy applies.


---

# Part 22: `11_CLAUDE_CODE_IMPLEMENTATION/MASTER_PROMPT.md`

# MASTER IMPLEMENTATION PROMPT FOR CLAUDE CODE

You are the principal engineer and scientific software implementation team for **Ireme Insight**, a full-scale Rwanda statistical intelligence, research and evidence-to-action platform.

## Primary reference and scope
Treat `00_START_HERE/OPERATING_PRINCIPLES.md`, `02_ARCHITECTURE/MASTER_ARCHITECTURE.md`, `09_MACHINE_CONTRACTS/`, and `10_VERIFICATION_TESTS/` as binding target specifications, with explicit recorded changes proposed through ADRs. Read `01_CURRENT_STATE_AUDIT/MASTER-ARCHITECTURE.md`, `10-architectural-weaknesses.md`, `11-kamonyi-execution-trace.md`. Preserve useful existing code; do not label planned features as implemented.

**Never reduce the target to an MVP or hackathon demo.** Order development by dependency and risk, but retain every full-scale workstream in the engineering backlog. Do not claim correctness from passing mocked tests or from LLM agreement.

## First mandatory deliverable: repository gap analysis
1. Inventory current source code, data rights and credentials (only names, never values) and test infrastructure.
2. Create actual code dependency graph, API and data lineage and map each W1–W17 audit defect to owners/tests.
3. Compare current code against every module in target `02_ARCHITECTURE`; mark Implemented / Partial / Missing / Unknown with exact file paths.
4. Write ADRs for major choices and data privacy/legal uncertainties. Do not assume internet or official credentials are available.
5. Establish all necessary environment checks, test fixtures and read-only baseline tests.

## Implementation in capability waves (each ends in executed quality gates)
- **Foundation and trust:** remove self-verification, source cache failure, wrong VUP correction and bypassed export; add immutable fact/reference origins, typed claims and server-side gate.
- **Scientific laboratory:** indicator contracts, primary and independent R estimators, full survey variance checks, decomposition diagnostics, reliable reporting of CI and reference methods.
- **Official evidence platform:** structured XLSX/PDF/API acquisition, table-cell provenance, version/conflict handling, source permissions and semantic comparability.
- **Advanced AI intelligence:** single multi-provider Groq/NVIDIA/Ollama Cloud/Local Ollama gateway, tool permissions, privacy routing, schemas and benchmarked model selection.
- **Deep scientific investigations:** national-to-district, competing hypotheses, harmonized trends, causal feasibility, policy intervention registry and monitoring plans.
- **Platform and governance:** production API, OIDC RBAC/ABAC, durable jobs, Postgres, encrypted object store, threat defence, observability, disaster recovery and approvals.
- **Reporting and operations:** canonical AST, accessible multilingual reports, Excel native charts, audit logs, revocation, all-30-district regressions, performance/security red-team and deployed SLOs.

## Exact behaviour that MUST be demonstrated
- NISR `modelled_claim` never compares a copied official value with itself.
- 20/24 failed sources no longer yields a false verified headline; suitable cache is used and missing evidence is explicitly classified.
- True VUP participation sentence cannot be miscorrected due to poverty keyword regex; AI cannot type new authoritative percentages.
- Reliability, uncertainty and denominator fields must be required in evidence-bound AI digests and report model.
- Independent estimator is independently maintained and checks both point estimate and SE with preapproved tolerances.
- Official comparison is definition-aware and references exact immutable table coordinates.
- All model providers respect source privacy and quota; local-only is truly local, Cloud requires real API keys server-side.
- HTML/PDF/XLSX/chart numbers derive from frozen canonical report, and no unsigned report URL bypasses backend release authorization.

## Coding instructions
Use typed schemas and contract tests. Use transactions and immutable versioned artifact references. Create dedicated policy evaluators, not boolean flags scattered through UI, Python and Node. Add failure injection and red-team fixtures. Reject hidden critical failures. Use structured logs with privacy sanitization. Do not replace robust current scientific code blindly; ensure equivalence and documented migrations.

## Truthful delivery report for EVERY pull request
- Implemented code files and contracts, with tests, unchanged behavior and migration risks.
- Commands actually executed, exit codes and raw logs; mark unexecuted checks as NOT RUN.
- Every acceptance test ID with PASS / FAIL / BLOCKED / NOT RUN; no fabricated PASS.
- Real-data evidence vs synthetic fixture evidence distinguished.
- Remaining gaps, unresolved science methods and human approvals required.
- Recommendation to merge or block, and explicit rollback plan.

## Final acceptance
Do not claim Ireme Insight is 'complete', 'correct', 'certified' or ready for official publication until the entire acceptance matrix is executed successfully against appropriate real datasets and threat scenarios, all residual critical issues are resolved, and authorized statistical/privacy/release reviewers sign off.


---

# Part 23: `11_CLAUDE_CODE_IMPLEMENTATION/WORK_BREAKDOWN_AND_DEPENDENCIES.md`

# Full-scale implementation programme — no scope reduction

## Engineering workstreams and dependency ordering
| ID | Deliverable | Prerequisite | Acceptance evidence | Owner role |
|---|---|---|---|---|
| EP-01 | Current code mapping, audit baseline, test harness | existing repo | proven W1–W17 trace | Architect |
| EP-02 | Semantic indicator registry, dataset licensing, immutable catalog | EP-01 | schema, license and variable fixtures | Data steward |
| EP-03 | Primary survey estimation hardening | EP-02 | design-based survey benchmark | Survey statistician |
| EP-04 | Independent R scientific reference | EP-02 | distinct code, tolerance approval, reproducibility | Independent statistics lead |
| EP-05 | Official reference acquisition and verified cache | EP-01 | outage/corruption tests, source hashes | Evidence engineer |
| EP-06 | Structured XLSX/PDF extraction, semantics, conflict | EP-02, EP-05 | table-coordinate benchmark and source diff | Evidence steward |
| EP-07 | Typed claim and deterministic renderer | EP-03, EP-04 | wrong VUP and unsupported number blocked | AI/data quality engineer |
| EP-08 | Backend release policy and approvals | EP-04, EP-06, EP-07 | no bypass via direct API or signed URLs | Governance engineer |
| EP-09 | Multi-provider AI gateway with Ollama | EP-07 | per-model capability, quota, secret and privacy tests | AI engineer |
| EP-10 | Research agent planner and hypothesis registry | EP-04, EP-06, EP-09 | evidence links, bounded permissions, stop rules | Research engineer |
| EP-11 | Decomposition, causal, predictive and spatial lab | EP-03, EP-04 | method validation, heldout tests, sensitivity | Scientific team |
| EP-12 | Intervention research/evaluation and programme boundary | EP-10, EP-11 | evidence-grade and policy method tests | Policy research lead |
| EP-13 | Production secure API, durable workflow, data store | EP-01, EP-02 | restart/replay auth and scalability tests | Platform team |
| EP-14 | One report AST + PDF/HTML/XLSX exports | EP-07, EP-08 | cross-format value and status equivalence | Reporting lead |
| EP-15 | Privacy, security, observability, incident recovery | EP-13, EP-14 | threat, disclosure, DR, audit tests | Security/SRE |
| EP-16 | All-district / national acceptance and continuous validation | EP-03–EP-15 | full real-data test matrix, signed reviews | QA and scientific leads |

## Work in parallel where safe
Data licensing and indicator contracts should begin while scientific and source retrieval repairs proceed; gateway adapters can be prepared behind disabled flags while claim compiler and privacy policy are built. A parallel model implementation is not accepted as independent science without ownership and code-path independence review.

## Non-negotiable gates between workstreams
- EP-07 cannot publish if EP-04 scientific validator hasn't completed.
- EP-09 cannot use confidential rows and cannot circumvent EP-07 claim compiler.
- EP-14 cannot generate public versions without EP-08 release decision.
- EP-12 intervention effect cannot be called causal without EP-11 approved identification design.
- EP-16 cannot be declared passed without actual NISR reference artefacts and permissions.

## Engineering documentation on completion
ADRs, code/module docs, data contracts, versioned OpenAPI, schema checks, threat model, DPIA/legal review where applicable, runbook, dashboards, reproducibility environment, migrations, test logs, signed acceptance and operations/SLO evidence.


---

# Part 24: `11_CLAUDE_CODE_IMPLEMENTATION/REPOSITORY_MIGRATION_MAP.md`

# Mapping from existing local engine to target architecture
This map is derived from the attached Claude Code audit (commit `919a77e`, 2026-10-29). Re-inspect the latest repository before changing paths.

| Existing module | Current purpose | Target boundary | Migration note |
|---|---|---|---|
| `src/pages/DistrictInvestigation.jsx` | user investigation UI | React client | preserve UX and update to authenticated asynchronous API |
| `tools/investigation/vite-api.mjs` | localhost-only dev middleware | FastAPI or secure service adapter | retire only after feature parity, integration and auth tests |
| `tools/investigation/engine.py` | stage-runner, checkpoints | durable orchestrator + worker adapter | migrate stages with idempotent activities and immutable manifests |
| `analysis.py`, `context.py`, `reliability.py` | weighted estimates and survey variance | primary science service | audit weights, PSUs, strata, domain variance and independent cross-check |
| `drivers.py` | Oaxaca and model analysis | advanced modelling laboratory | revalidate assumptions and uncertainty; isolate causal claims |
| `sources.py` | official PDF retrieval/cache | source evidence service | fix on-disk cache fallback, content hashes and versioning |
| `verification.py` | static regex reference matching | official semantic verification service | prohibit self-match, add authoritative XLSX facts, strict matching |
| `ai.py` | Python LLM reviewer | unified provider gateway | migrate prompts, typed outputs, policy and provenance |
| `llm.mjs`, `ai-report.mjs` | Node Groq/NVIDIA LLM writes | unified provider gateway and report planner | remove duplicated provider logic and free numeric prose |
| `reportChecks.js` | regex correction | deterministic typed claim compiler | replace direction keyword rewrite with fact-ID logic |
| `reports.py`, `reportExport.js` | separate PDF/XLSX/browser outputs | canonical report AST renderer | unify and verify value/metadata equivalence |
| `investigations/runs/*` | JSON checkpoints | durable workflow + audit/provenance database | import as legacy snapshots with explicit uncertified status |
| Supabase chart/USSD functions | separate optional paths | governed API integrations | do not assume already integrated with investigation engine |

## First pull requests
1. W1/W2/W5 verified matching, correct failure statuses and cache fallback.
2. W3/W4/W12 typed facts/claims, report digest and correct uncertainty/reliability propagation.
3. W6/W8 independent scientific contract and sample-design tests.
4. W10/W11/W14 source and model provenance, frozen snapshots and report consistency.
5. W13/W15/W17 production services, authentication, job state and operational audit.
6. W7, W9, W16 evidence semantics, provider orchestration and contract/ADR evolution.

No reduction of full-scope target: these are the dependency-safe first changes, not the total system plan.


---

# Part 25: `11_CLAUDE_CODE_IMPLEMENTATION/DEFINITION_OF_DONE_AND_PR_TEMPLATE.md`

# Definition of Done and pull request evidence template

## PR must provide
- [ ] Change scope and affected `W*` audit weaknesses, with links to relevant code.
- [ ] Public or private data classifications and any egress effects.
- [ ] Backward compatible API / schema migrations or explicit version deprecation.
- [ ] Unit, contract, integration, independent scientific and failure-mode tests as relevant.
- [ ] Statistical estimator definition and tests for changed methods.
- [ ] Reproducibility metadata and immutable source hashes.
- [ ] Attack/abuse case check for ingestion, AI and report export.
- [ ] Executed commands, exit codes and logs. No 'tested' without logs.
- [ ] Rollback and disaster-recovery procedure for stateful changes.
- [ ] Updated Mermaid diagram only when architecture truly changed.
- [ ] Signed scientific and security reviews for restricted-data changes.

## PR report format
`Title, commit, files modified, problem, design decision, tests actually run, tests skipped/blocked, synthetic vs real-data evidence, benchmark deltas, source lookup outcome, security findings, remaining uncertainty, reviewer list, deployment and rollback.`

## DoD for an investigation report
Immutable dataset/code/policy manifest; traceable facts; independent method pass; official comparisons correctly classified; necessary CI/reliability; typed claims; privacy clearance; reviewer authority; frozen AST; identical cross-format numbers; signed artifacts; appropriate audience; operational monitoring link.


---

# Part 26: `12_OFFICIAL_REFERENCES/SOURCES_AND_VERIFICATION_NOTES.md`

# Official technical references and verified public source pointers
Checked against current public documentation on **2026-10-30**. These URLs are *implementation references*, not a claim that any source PDF or Excel file is downloaded into this ZIP.

## Rwanda official publications
- NISR EICV7 data-source portal: https://alpha.statistics.gov.rw/data-sources/surveys/EICV/integrated-household-living-conditions-survey-7-eicv-7
- NISR EICV7 Main Indicators page, including published XLSX tables: https://gis.statistics.gov.rw/statistical-publications/poverty-and-social-protection/eicv7-main-indicators-report-202324
- NISR Poverty Profile report and structured reference tables: https://statistics.gov.rw/data-sources/surveys/EICV/integrated-household-living-conditions-survey-7-eicv-7/eicv7-poverty-profile-report-202324
- NISR EICV7 Methodological Notes: https://alpha.statistics.gov.rw/statistical-publications/poverty-and-social-protection/eicv7-methodological-notes

**Scientific warning:** NISR says important poverty measurement methodology changes were introduced for EICV7. Do NOT compare older observed poverty rates directly with EICV7 without validated harmonization or modelled same-method estimates. NISR's national EICV7 poverty rate is 27.4%, but hard-coding this number as a computation 'validator' is not independent verification. Official companion Excel tables are important reference sources.

## Hosted and local LLMs
- Ollama API OpenAI compatibility: https://docs.ollama.com/api/openai-compatibility
- Ollama API authentication: https://docs.ollama.com/api/authentication
- Ollama Cloud docs: https://docs.ollama.com/cloud
- Groq provider rate limits: https://console.groq.com/docs/rate-limits
- Groq projects and organization ceiling: https://console.groq.com/docs/projects
- Provider capability, pricing and model lists may change. Store model capabilities as tested deployment metadata, not timeless constants. Additional keys do not bypass shared organization limits.

## Workflow and AI governance
- Temporal durable workflow overview: https://docs.temporal.io/workflow-execution
- Temporal retry and idempotency semantics: https://docs.temporal.io/nexus/operations
- Temporal workflow determinism: https://docs.temporal.io/workflow-definition
- NIST AI RMF Generative AI Profile: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence

## Legal review reminders
Before ingesting confidential microdata, check survey access licenses, NISR data agreement requirements and applicable Rwandan data protection law and institutional policy. Public documents are not approval to expose individual records to cloud LLMs. Nothing in this package is legal certification or official NISR endorsement.
