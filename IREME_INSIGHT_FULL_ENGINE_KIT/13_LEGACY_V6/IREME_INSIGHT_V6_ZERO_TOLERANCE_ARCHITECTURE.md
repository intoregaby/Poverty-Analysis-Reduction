# Ireme Insight AI Engine v6
## Zero-Tolerance Engineering Reference Architecture

**Status:** Target architecture and engineering specification — **not implemented, deployed, verified, or certified**.  
**Baseline:** Claude Code current-state audit, 29 October 2026, commit `919a77e` plus contemporaneous local edits; Kamonyi stored-run trace.  
**Applies to:** Rwanda district and national poverty statistics, services, FinScope, official NISR evidence, analytical reports, programmes and evidence-to-action workflows.  
**Design ambition:** Full research-grade and production-grade target. No capability is removed solely because of hackathon deadlines. Migration order controls risk, not ultimate scope.

> **Meaning of zero tolerance:** zero tolerance for *knowingly shipping unvalidated critical claims, fake source matches, wrong units, unauthorized disclosure, or bypassed release gates*. It is **not** a claim of mathematically zero sampling error, zero model error, or perfect AI. Where evidence cannot establish an answer, the correct result is **UNKNOWN / INCONCLUSIVE / RESTRICTED DRAFT**, not a fabricated conclusion.

---

# 1. System mission, boundaries and success criteria

Ireme Insight is not merely a text-generation service. It is an **evidence-to-decision platform** with four distinct duties: (1) compute survey estimates using defensible estimands and survey design, (2) verify them independently against source publications where comparable, (3) investigate associations and possible interventions without claiming causality not supported by research, and (4) release reports only after machine checks and authorized human review. It must support 30 Rwandan districts, national comparisons, historical comparisons when methods are harmonized, and separate programme monitoring when lawfully authorized.

**Production invariants (all are release-blocking):**

- **I1 — Origin independence.** A published figure never simultaneously fills `computed_estimate` and `official_reference`. The comparison has two separately traceable origins.
- **I2 — Defined estimand.** Every rate has unit, numerator, denominator, population, geography, survey wave, sample design and relevant methodology. `people`, `households`, `poor households` and `participants` are not interchangeable.
- **I3 — Scientific check.** Headline estimators pass an independent implementation plus unit, fixture and design-based variance checks; deviations outside predeclared, methodology-specific tolerances fail closed.
- **I4 — Semantic check.** Different concepts (e.g. grid *connection* versus electricity as main *lighting source*) cannot match merely because their values are similar.
- **I5 — Claim binding.** Published narratives can contain numeric/directional/causal claims only when a typed claim references exact approved facts and passes deterministic rendering/validation.
- **I6 — Citation integrity.** A failed retrieval cannot be labelled “not published”, and a URL alone is not proof a publication was consulted.
- **I7 — Privacy boundary.** Unauthorized row-level microdata, beneficiary identities and unsuppressed subgroup data never enter hosted-LLM requests, logging or public exports.
- **I8 — Immutable release.** A published report binds dataset, code, statistics, evidence documents, prompts/templates, model metadata, approvals and generated files by hashes and version IDs.
- **I9 — No silent degradation.** Timeouts, stale caches, failed calculations, missing review, model changes and privacy checks are explicit statuses, not hidden success paths.
- **I10 — Cross-format identity.** PDF, HTML, Excel, API and dashboard display the same report version and indicator values, with equivalent limitations and disclosure markings.

**Scope:** National Picture, Analyst District Investigation, Poverty & Social Support, Financial Inclusion, programme research and monitoring, GIS comparison, action plans, multilingual explanation and permitted role-specific views. Administrative beneficiary management and payments remain a separate transaction system; analytical access is mediated via governed aggregates and permissions.

---

# 2. Proven current-state baseline — do not confuse this with target capabilities

The supplied audit establishes that the existing engine runs as React/Vite dev middleware + detached Python worker + a separate Node LLM layer, with JSON checkpoints under `investigations/`; no production investigation backend, central database or queue currently exists. Existing statistics include weighted estimates, some Taylor variance, a weighted-LPM Oaxaca-Blinder decomposition and 300 PSU bootstrap replicates. Groq and NVIDIA are currently the described LLM providers; Ollama was **not** integrated in the audited code. Existing code has 50 documented components and 17 listed architectural weaknesses; this is a documentation-based assessment, not a fresh execution of the repository.

**Most urgent defects to prevent from migrating into v6:**

| Audit ID | Actual defect | v6 closure and evidence required |
|---|---|---|
| W1 | `modelled_claim` copies one NISR figure to both sides, producing a fake verified match | Separate `EstimateOrigin` / `ReferenceOrigin`, independent origin assertion and adversarial fixture |
| W2 | 20/24 source retrieval failures but report still exports as though checks finished | Required-evidence policy, accurate statuses and server-side release authorization |
| W3 | VUP sentence falsely corrected into a different claim | Typed, fact-ID-bound claims, deterministic text rendering; no free-text automatic rewriting |
| W4 | Non-blocking unknown-number checker | Reject all unsupported numeric statements; no exception for small numbers or plausible numbers |
| W5 | Valid on-disk NISR cache ignored on failed HTTP retrieval | Content-addressed cache, metadata integrity, cached-source resolution and outage test |
| W6 | No independent estimator run for headline results | Separate R `survey`/independent reference implementation; round-trip fixtures and variance tests |
| W7 | Hand-coded `same_concept` flags and PDF regex matches | Registry-driven semantic comparison, typed table coordinates, verified table extraction |
| W8 | Partial complex-survey corroboration | PSU/strata/weights, domain estimators, covariance and model-specific uncertainty review |
| W9 | Duplicated Groq/NVIDIA logic in Python and Node | One policy-driven AI gateway with tested adapters and model capabilities |
| W10 | Node prompt and source revision not pinned to findings | Immutable input/output manifests, stale invalidation and deterministic report compilation |
| W11 | Failed documents listed as consulted references | Distinguish `cited_read`, `listed_unread`, `retrieval_failed`, `superseded` |
| W12 | Reliability grades omitted from AI digest | Required `Estimate.reliability` and uncertainty fields; schema prohibits omission |
| W13 | Vite local backend and no worker cap | Production API, durable jobs, resource quotas and idempotency |
| W14 | Ignored worker stderr, no AI request provenance | Structured traces, sanitized request/response hashes, reproducible job events |
| W15 | No route auth beyond localhost | OIDC/session validation, RBAC + attribute/data policy, segregated services |
| W16 | Docs/schema drift | Generated API/schema documentation, contract tests and versioning |
| W17 | Some steps outside stage accounting | Every material stage has durable status, heartbeat, output digest and retry semantics |

**Kamonyi audit fixture:** current output included district poverty 39.7%, national 27.4%, grid connection 29.1%, poor-household VUP 9.2%; 20 official/additional source retrieval failures; one “verified” self-copy of 2016/17 modelled poverty; unreliable sentence correction and `uncertainty_validated=false`. These are **regression targets**, not proof that every indicator is correct. Compare official references with equivalent precision, period and definition; no untested exact equality should be embedded as a production truth.

---

# 3. Master architecture — strictly acyclic evidence flow

```mermaid
flowchart TB
  HUMAN["Analyst / Admin / Programme Manager / Public"]
  UI["React workspaces and public dashboard"]
  API["Authenticated API and policy enforcement"]
  WORK["Durable investigation workflow engine"]

  subgraph GOVERN["Governance and control plane"]
    IAM["OIDC, RBAC, ABAC and consent policies"]
    CATALOG["Datasets, indicator contracts and geographic registry"]
    POLICY["Quality, source, export and privacy policies"]
    LEDGER["Append-only events and approval ledger"]
  end

  subgraph SCIENCE["Scientific data plane"]
    SNAP["Immutable dataset snapshot"]
    ETL["Validated ingestion and joins"]
    PRIMARY["Primary survey estimators"]
    SECOND["Independent reference estimators"]
    SCIQA["Statistical reconciliation and reliability"]
    FACTS["Immutable calculated fact registry"]
  end

  subgraph OFFICIAL["Official publication evidence plane"]
    DISC["Allowlisted discovery and source metadata"]
    RET["Retrieve, verify cache and pin content hash"]
    EXTRACT["PDF / XLSX / API structured extraction"]
    PUB["Official reference fact registry"]
    SEM["Semantic compatibility and version checks"]
    CMP["Comparison records and source conflict review"]
  end

  subgraph REASON["Controlled AI analysis plane"]
    RESEARCH["Hypotheses and research plans"]
    ROUTER["Capability and privacy policy AI router"]
    PROVIDERS["Groq / NVIDIA / Ollama Cloud / Local Ollama"]
    CLAIMS["Typed claim proposals and evidence IDs"]
    FIREWALL["Deterministic claim and causality validation"]
    ACTIONS["Intervention evidence and evaluation design"]
  end

  subgraph RELEASE["Publication and monitoring"]
    REPORT["Canonical report AST and figure specifications"]
    GATE["Server-side release decision"]
    REVIEW["Authorized statistical and policy sign-off"]
    ARTIFACT["Versioned HTML, accessible PDF, XLSX and API"]
    WATCH["Quality drift, supersession and monitoring"]
  end

  HUMAN --> UI --> API --> WORK
  API --> IAM
  WORK --> SNAP --> ETL --> PRIMARY
  ETL --> SECOND
  PRIMARY --> SCIQA
  SECOND --> SCIQA --> FACTS
  CATALOG --> ETL
  CATALOG --> SEM
  WORK --> DISC --> RET --> EXTRACT --> PUB
  FACTS --> SEM
  PUB --> SEM --> CMP
  FACTS --> RESEARCH
  CMP --> RESEARCH --> ROUTER --> PROVIDERS --> CLAIMS
  FACTS --> FIREWALL
  CMP --> FIREWALL
  CLAIMS --> FIREWALL --> ACTIONS
  FACTS --> REPORT
  CMP --> REPORT
  FIREWALL --> REPORT
  ACTIONS --> REPORT --> GATE --> REVIEW --> ARTIFACT --> WATCH
  POLICY --> GATE
  IAM --> GATE
  GATE --> LEDGER
  REVIEW --> LEDGER
  WATCH --> WORK
```

The dataflow is a **DAG per run**. Calculated facts and external references are stored as separate immutable objects. Matching creates new `Comparison` objects; it **never writes back into** the original calculated fact. Post-release revalidation starts a new versioned investigation, not a hidden mutation or dependency cycle.

---

# 4. Deployment and trust-zone architecture

```mermaid
flowchart LR
  subgraph PUBLIC["Public zone"]
    WEB["React dashboard"]
    CDN["Published aggregate releases"]
  end
  subgraph API["Application trust zone"]
    INGRESS["HTTPS API and WAF"]
    AUTH["Identity and authorization"]
    META["PostgreSQL metadata and workflow state"]
    QUEUE["Durable queue and scheduler"]
    AUDIT["Append-only audit events"]
  end
  subgraph SECURE["Restricted compute and storage zone"]
    OBJECT["Encrypted, versioned dataset and evidence store"]
    PY["Primary Python statistical workers"]
    R["Independent R statistical workers"]
    POLICY["Disclosure and export gate"]
    ONPREM["Optional local Ollama"]
  end
  subgraph EXT["Controlled external endpoints"]
    NISR["NISR / government document fetch"]
    CLOUD["Groq / NVIDIA / Ollama Cloud"]
  end
  WEB --> INGRESS --> AUTH --> META
  AUTH --> QUEUE --> PY
  PY --> OBJECT
  OBJECT --> R
  PY --> POLICY
  R --> POLICY
  POLICY -->|"Redacted approved aggregates only"| CLOUD
  POLICY --> ONPREM
  PY -->|"Allowlisted fetch proxy"| NISR
  META --> AUDIT
  INGRESS --> CDN
```

**Recommended deployable:** modular Python/FastAPI application, PostgreSQL for metadata, encrypted object storage for snapshots and artifacts, worker queue with idempotent jobs, Python estimators and independently implemented R reference checks. Event and task orchestration may use Temporal when justified by measured complexity; a robust Postgres-backed job worker is acceptable initially. Avoid replacing all existing code in one rewrite. External AI adapters are isolated behind a gateway; neither the browser nor model can read secrets or direct-query restricted data.

**Important boundary:** Programme Operations (beneficiary profiles, jobs, VUP delivery and payments) is a distinct authenticated product domain. Statistical AI consumes only specifically approved, aggregated programme datasets, with legal basis and purpose limitation. Do not link individual EICV respondents to beneficiary records without explicit authorization and demonstrable data-governance grounds.

---

# 5. Durable investigation state machine and failure semantics

```mermaid
stateDiagram-v2
  [*] --> REQUESTED
  REQUESTED --> AUTHORIZED: access and purpose valid
  REQUESTED --> REJECTED: denied
  AUTHORIZED --> SNAPSHOTTED: inputs pinned
  SNAPSHOTTED --> DATA_VALIDATED: schema and privacy valid
  DATA_VALIDATED --> CALCULATED: primary estimators finished
  CALCULATED --> SCIENCE_VERIFIED: independent checks pass
  SCIENCE_VERIFIED --> EVIDENCE_ASSESSED: official matching completed or classified
  EVIDENCE_ASSESSED --> ANALYZED: bounded research and AI
  ANALYZED --> DRAFTED: typed claims compiled
  DRAFTED --> QA_PASSED: all mandatory machine gates pass
  DRAFTED --> RESTRICTED_DRAFT: failure or unresolved critical evidence
  QA_PASSED --> AWAITING_APPROVAL: policy requires reviewer
  AWAITING_APPROVAL --> RELEASED: authorized approval
  AWAITING_APPROVAL --> RESTRICTED_DRAFT: returned for correction
  RELEASED --> SUPERSEDED: new source or invalidation
  RESTRICTED_DRAFT --> REQUESTED: explicit versioned rerun
  REJECTED --> [*]
```

**State model:** each transition has `run_id`, idempotency key, input hashes, outputs, actor, timestamp, deterministic gate result and event. No stage is allowed to mark itself `Complete` before its artifact and integrity hash are stored. Retries use bounded backoff and idempotent writes; a resumed run must reject stale dependencies or fork a new report version. Job budgets, tenant concurrency, cancellation, heartbeat and dead-letter handling are explicit. `WARNING` is not a release status. A document-retrieval outage does **not** invalidate already independently validated computations, but it prevents any mandatory unverified claim from being published as officially confirmed.

**Release-policy distinction:** `RESTRICTED_DRAFT` may be viewed by authorized analysts and, when local policy permits, exported with a prominent DRAFT/UNVERIFIED watermark and a machine-readable failure manifest. `RELEASED` represents the only approved public/decision-grade artifact. The release route must be server-guarded; removing a UI button is insufficient.

---

# 6. Canonical schemas: types, units and provenance are mandatory

The system should generate language-specific clients and JSON Schema/OpenAPI from a single typed schema library (e.g. Pydantic types), with explicit migrations. Default JSON values are forbidden for required evidence fields. Null must carry a `missing_reason` enum.

| Object | Mandatory fields | Validation |
|---|---|---|
| `DatasetSnapshot` | `snapshot_id`, `source_id`, release/version/hash, license, authorized purpose, sensitivity, time interval, schema/geo version | checksums, access policy and completeness |
| `SurveyDesign` | `weight`, `strata`, `psu`, `fpc` or rationale, lonely-PSU policy, domain rules, replicate weight definitions if any | validated against NISR survey methodology |
| `EstimandSpec` | concept, universe, numerator/denominator, indicator ID/version, unit, method, population, period, geography, survey design, missingness | semantic contract fixture and documented changes |
| `Estimate` | unique ID, spec hash, run/data/code hashes, value, unweighted and weighted N, SE/CI or reason, design effects where estimable, reliability flags | independently computed for critical statistics |
| `PublishedReference` | reference ID, authority, original URL, retrieval status, file hash, publication revision, table/page/sheet/cell, raw and normalized definition, extracted value | verified origin and extraction confidence |
| `ComparabilityAssessment` | two independent fact IDs, semantic dimensions, reviewer rule/version, decision, reasons | rejects distinct concepts and unmatched methodology |
| `EvidenceComparison` | calculated estimate ID, reference ID, converted values, rounding policy, tolerance, result, adjudication | no shared origin and no copy-values |
| `TypedClaim` | claim ID, predicate, subject, fact IDs, interpretation class, uncertainty/disclosure IDs, citations | built from known predicates; deterministic renderer |
| `InvestigationHypothesis` | hypothesis ID, alternatives, prespecified tests, datasets, limits, quality and outcome status | no causality escalation from association |
| `InterventionEvidence` | programme/intervention, eligibility, study design, outcome, locality, quality, costs and equity caveats | identify programme evidence versus extrapolation |
| `ReportRelease` | report ID, immutable spec hash, claim graph hash, dataset/official doc/model/template hashes, QA policy version, signatures, output digests | reproducible release and revocation/supersession |

**Representative `Estimate` (illustrative schema, example values only):**

```json
{
  "estimate_id": "est:run-2026-xx:kamonyi:poverty-person:eicv7",
  "estimand_id": "eicv7.poverty.headcount.person.v1",
  "geography_id": "RW-KAMONYI",
  "period": "2023/24",
  "unit": "percent_of_people",
  "value": 39.7,
  "value_status": "computed",
  "data_snapshot_hash": "sha256:<required-real-hash>",
  "estimator_code_hash": "sha256:<required-real-hash>",
  "unweighted_household_n": 484,
  "unweighted_person_n": null,
  "unweighted_person_n_missing_reason": "not_recorded_in_example",
  "survey_design_id": "eicv7.design.versioned",
  "standard_error": null,
  "standard_error_missing_reason": "not_inserted_in_example",
  "reliability": "requires_design_check",
  "validation": "not_run_for_example"
}
```

The example must **never** be treated as an official stored artifact. Production schemas require real hashes and populated or explicitly unavailable precision fields before validation or release.

---

# 7. Scientific computation architecture and true independence

```mermaid
flowchart TB
  DATA["Signed immutable EICV dataset snapshot"]
  SPEC["Registered estimand and survey design"]
  A["Primary Python production estimator"]
  B["Independent R reference implementation"]
  BENCH["Curated NISR published benchmark fixtures"]
  ASSERT["Method-specific numeric tolerance and design assertions"]
  QC{"Both implementations and required diagnostics pass?"}
  FACTS["Immutable validated estimate"]
  HOLD["Science review: no promoted estimate"]
  DATA --> A
  DATA --> B
  SPEC --> A
  SPEC --> B
  A --> ASSERT
  B --> ASSERT
  BENCH --> ASSERT --> QC
  QC -->|Yes| FACTS
  QC -->|No| HOLD
```

**Independence contract:** primary estimator in Python and reference estimator in R must not import each other's calculation functions, derived aggregates or intermediate estimates. They may share **only** the immutable raw dataset snapshot and a language-neutral, independently reviewed estimand specification. Reference estimator implementation is independently reviewed and tested against known survey fixtures. Reproducing a hard-coded published value is **not** recalculation. Check output versions and code hashes to ensure the second path really executed.

**Estimator requirements:** sampling weights must be matched to the correct unit (person weights for person-level headcount, household weights for household statistics); domain statistics require design-aware variance; strata/PSU identifiers must be reviewed for each survey and file; district-vs-national differences must handle overlap/covariance rather than incorrectly assuming independent samples; small-domain effective N and coefficient of variation are reported; singleton strata policy must be declared and justified; missing-value treatment cannot silently change denominator. Compare FGT(0), FGT(1), FGT(2), electricity measures, VUP, insurance and income/financial inclusion only with equivalent estimands.

**Tolerance policy:** no global “within 0.1 percentage point” shortcut. Each `EstimandSpec` defines rounding and numeric tolerance based on estimator precision and published display precision. Test **both** (a) primary vs independent high-precision computation and (b) independently calculated result vs externally extracted official table value, with different thresholds and detailed difference records. Use exact equality only where mathematically appropriate. Store signed discrepancies and review decisions. A statistical significance result is permitted only when the variance model and comparison covariance are validated.

**Advanced methods:** poverty-driver decomposition remains an **exploratory association** unless independent identification supports causal claims. Validate model choice (weighted LPM/logit-based sensitivity), omitted variables, sampling uncertainty, pooled-reference including the district, multicollinearity, bootstrap PSU resampling within strata and reference-group sensitivity. Avoid “explains poverty” when the output only partitions an observational gap. Historical EICV3/4/5/7 comparisons must apply documented harmonization and modelled bridges; do not naïvely compare incompatible poverty methodologies. For FinScope, maintain a separate methodology and universe compatibility registry.

**Risk-specific reliability:** grade `supported`, `use_with_caution`, `not_established`, `not_estimable` using predeclared survey/sample policies. These grades and confidence intervals are required in the `FactBundle` consumed by AI, charts, and reports; no transformation may drop them.

---

# 8. Official-source verification: retrieval, matching, conflict handling

```mermaid
flowchart TB
  REG["Verified source registry and allowed domains"]
  FETCH["HTTPS retrieval with ETag, timeout, retries"]
  CACHE["Content-addressed verified cache"]
  DOC["Pinned publication version and source hash"]
  EXTRACT["XLSX table and PDF page extraction"]
  CHECK["Table coordinates, units, extraction audit"]
  PUBFACT["PublishedReference registry"]
  INTERNAL["Independent calculated Estimate registry"]
  SEM["Compare concept, period, universe, unit and geography"]
  STATUS{"Definition and origins compatible?"}
  MATCH["Compute numeric comparison with tolerance"]
  REVIEW["Not comparable / missing / needs adjudication"]
  SAVE["Immutable comparison record"]
  REG --> FETCH --> CACHE --> DOC --> EXTRACT --> CHECK --> PUBFACT
  INTERNAL --> SEM
  PUBFACT --> SEM --> STATUS
  STATUS -->|Yes| MATCH --> SAVE
  STATUS -->|No| REVIEW --> SAVE
```

**Retrieval logic:** maintain a source record even if network access fails. Before retrying network, check the approved on-disk content-addressed cache; verify digest, original source identity, version policy and freshness for the intended comparison. A cached earlier publication is usable as that **specific version**, not silently presented as the latest release. Record request/response metadata without secrets. Handle HTTP failures, broken PDF, corrupted XLSX, renamed table, OCR quality limits, changed schema, republished versions, and network isolation. Prefer published NISR Excel tables when available, with PDF page/annex cross-check. Treat web and retrieved documents as **untrusted content**, not instructions.

**Exact status vocabulary and counting:**

| Status | Preconditions | Public meaning |
|---|---|---|
| `externally_matched` | independent calculated value + actual fetched/cached published value; semantically equivalent; difference within predeclared tolerance | confirmed agreement with that published source/revision |
| `externally_discrepant` | equivalent definitions, but difference beyond tolerance | real discrepancy, requires review |
| `not_comparable` | definition, universe, geography, period or methodology differs | comparison prohibited, not counted as mismatch |
| `retrieval_failed` | required reference unavailable due to download/parsing/cache failure | check incomplete, not “not published” |
| `publication_not_found` | documented search across appropriate official registry returned no relevant publication | no published comparator located; cannot assert none exists anywhere |
| `internally_validated_original` | original analysis passed scientific checks but has no direct official comparator | engine-derived result, not external verification |
| `source_conflict` | two plausible official versions disagree and precedence not yet adjudicated | unresolved reference issue |
| `not_evaluated` | check not run or bypassed | incomplete, must be visible |

**Verified count rule:** `externally_matched_count = number of distinct computed_estimate_ids with eligible independently sourced externally_matched comparisons`. Purely published historical lookups and original decompositions are **not** eligible. Denominator includes only distinct comparable claims for which the check was actually attempted; also report `total_required`, `evaluated`, `not_evaluated`, `retrieval_failed`, `not_comparable`, `original` separately. Never output “1 of 15 verified” when that one item was an official-to-official self-copy.

**Publication conflicts:** store authority level, release date, revision date, amended table, exact extract and reviewer decision. A source supersession flags released reports for re-evaluation; never silently edit an existing signed report. Disputes go to a named reviewer with document/page evidence. Source discovery should be allowlisted and checked for domain spoofing, malicious redirects, oversized files, decompression bombs and unsafe parsing.

---

# 9. Typed claims — eliminate the class of free-text numeric corrections

```mermaid
flowchart LR
  FACT["Immutable FactBundle with reliability"]
  AI["LLM proposes claim IDs and semantic predicates"]
  JSON["Strict JSON Schema validation"]
  VALID["Claim validator: IDs, direction, unit, period, population, inference"]
  RENDER["Deterministic English/Kinyarwanda templates"]
  AUDIT["Rendered text and traceable citations"]
  REJECT["Reject / reviewer request"]
  FACT --> AI --> JSON --> VALID
  FACT --> VALID
  VALID -->|Pass| RENDER --> AUDIT
  VALID -->|Fail| REJECT
```

**Authoring rule:** the model does **not** write numerical sentences. It may submit a machine-readable composition plan: approved claim ID, ordering, comparison preference, narrative role, tone and nonnumeric explanatory themes. A trusted renderer inserts the value, unit, direction, uncertainty, source and reliability into vetted templates. Independent facts must not become attached merely because they share words such as `poor` or `household`.

**Typed claim schema (illustrative):**

```json
{
  "claim_id": "claim:kamonyi:vup:comparison:1",
  "predicate": "rate_below_reference",
  "subject_estimate_id": "est:kamonyi:vup_poor_households",
  "reference_estimate_id": "est:rwanda:vup_poor_households",
  "allowed_strength": "descriptive_association",
  "required_quality": "use_with_caution",
  "message_template": "district_rate_below_national_v1",
  "interpretation_scope": "poor_households_only",
  "evidence_comparison_id": null
}
```

A safe rendering might say, *“In Kamonyi, the surveyed share of poor households reporting VUP participation is lower than the national estimate; interpret this survey result with caution.”* The precise percentages and confidence intervals are pulled programmatically from the correct references when available. If the two estimates use different denominators, the renderer **cannot** produce this comparison. If `required_quality` is missing, validation fails rather than silently defaulting to reliable.

**Causal rule:** observational decomposition, cross-sectional correlations, and programme participation differences may support association or hypotheses, **not** intervention effects. Causal verbs require a special `causal_effect` evidence object that references a defensible identification design, assumptions, uncertainty and reviewer authorization. A language-model majority vote can neither establish causality nor override a failed typed-claim check.

**Multilingual rule:** numerical and technical facts are generated from locale-aware templates. English and Kinyarwanda translations have independent terminology review and numeric/unit parity tests. Translation must not strengthen a conditional statement or alter denominator; users can inspect original-language claim bindings.

---

# 10. Multi-model AI gateway — Groq, NVIDIA, Ollama Cloud, local Ollama

```mermaid
flowchart TB
  JOB["Typed research or reporting task"]
  PRIV["Confidentiality and provider eligibility gate"]
  CAP["Model capability and benchmark registry"]
  SCHED["Quality, latency, cost and quota router"]
  subgraph LLM["Isolated provider adapters"]
    G["Groq"]
    N["NVIDIA"]
    OC["Ollama Cloud"]
    OL["Local Ollama"]
  end
  OUT["Schema-bound model response"]
  VAL["Typed claim and source validation"]
  OK{"Valid and within risk budget?"}
  DONE["Accepted draft plan"]
  ESC["Bounded retry, alternative model or human review"]
  JOB --> PRIV --> CAP --> SCHED
  SCHED --> G
  SCHED --> N
  SCHED --> OC
  SCHED --> OL
  G --> OUT
  N --> OUT
  OC --> OUT
  OL --> OUT
  OUT --> VAL --> OK
  OK -->|Yes| DONE
  OK -->|No| ESC
```

**Provider adapter contract:** `provider_id`, `endpoint`, `supported_tasks`, `model_version`, `max_context`, `structured_output_supported`, `privacy_tier`, token/time budgets, server-side credential reference, retryability, organization-level quotas, circuit-breaker state, cost and benchmark profile. A model is ineligible if it lacks required schema support or is outside data-policy boundaries. Unknown capability means **not eligible until tested**, not “probably works.” Local Ollama may serve a confidential task only if hosted inside an authorized restricted compute boundary and approved for that data class.

**Credential handling:** multiple valid keys can be configured for authorized separate accounts/projects; do not claim that extra keys increase provider-wide quotas. Keys are held server-side in a secrets manager or protected environment; never in React/Vite client bundles, model prompts, logs, exported reports or repo. Use least privilege, key rotation/health indicators, rate limits, backoff and per-provider budgets. **Do not ship keys to the assistant.**

**Task-specific quality:** benchmark separately for semantic planning, interpretation, source summarization, hypothesis criticism, bilingual explanations, and report assembly. Record hallucination/claim-binding errors, schema failures, latency, throughput, cost, privacy eligibility and rollback readiness. Prefer deterministic fact templates when they suffice; more models do not inherently imply higher accuracy. Use AI to propose investigative steps, not to calculate official estimates or determine their verification statuses.

**Context isolation:** sanitize and label retrieved text. Official PDF content may contain instructions; it can only supply extracted evidence, never modify system policies, approve releases, enable tools, or direct arbitrary requests. Tools permitted to LLM agents are explicit, read-only and scoped where possible. No model gets general database credentials, payment permissions or unrestricted web fetching.

---

# 11. Deep investigation, hypotheses and programme evidence-to-action

```mermaid
flowchart TD
  Q["Research question and policy decision"]
  SNAP["Authorized, versioned evidence snapshot"]
  EST["Validated descriptive baseline"]
  COMP["District, peers and national comparisons"]
  HYP["Register competing hypotheses"]
  ANALYZE["Association, robustness and sensitivity tests"]
  TRI["Triangulate official and programme evidence"]
  SUFF{"Sufficient support for proposed claim?"}
  OPT["Intervention options and evidence quality"]
  EQUITY["Cost, feasibility, beneficiary rights and equity"]
  PLAN["Action owner, evaluation design and milestones"]
  EVAL["Monitor outputs, outcomes and unintended effects"]
  INCON["Inconclusive finding / research request"]
  Q --> SNAP --> EST --> COMP --> HYP --> ANALYZE --> TRI --> SUFF
  SUFF -->|Yes| OPT --> EQUITY --> PLAN --> EVAL
  SUFF -->|No| INCON
```

The system must explicitly distinguish **needs assessment, priority setting, intervention hypotheses, proven programme effects and operational monitoring**. A district with high poverty and low VUP survey participation does *not* automatically prove VUP delivery failure, eligibility gaps or the impact of expansion. Policy options reference study design, eligibility, beneficiary reach, fiscal capacity, implementation constraints, potential harms and equity, then state what additional evidence is needed.

**Investigation workspaces:** six-stage national-to-district flow, district geography version, appropriate district peers (avoid selecting only nearest rates when geography/livelihood relevance matters), interactive maps with uncertainty and denominator tooltips, glossary/eye-help, chart explanation source IDs, drill-down only where disclosure policy allows, and accessibility. Every AI recommendation links to a `ResearchHypothesis` or `InterventionEvidence` entry. Programme dashboards use programme administrative statistics as **distinct evidence** from NISR household survey estimates; differences are explained, not merged into invented totals.

**Decision support:** prioritization can rank locations by transparent criteria (need, service access, equity, coverage, evidence, feasibility) with weights selected and recorded by an authorized decision owner. Do not conflate an algorithmic priority score with a scientific poverty estimate. Publish sensitivity to scoring weights and explain disputed rankings. Programme payments and beneficiary updates are explicit human-authorized transactions in the separate programme service, **never** direct AI side effects.

---

# 12. Release gate — executable policy, not a UI warning

**Policy-as-code pseudocode (illustrative, to implement with audited tests):**

```python
def decide_public_release(report, policy, actor):
    assert_authorized(actor, "approve_release", report.classification)
    checks = {
        "snapshot_immutable": verify_manifest_hashes(report),
        "scientific_reconciliation": every_critical_estimate_independently_validated(report),
        "claim_binding": all_rendered_claims_from_validated_typed_facts(report),
        "evidence_integrity": no_false_external_matches_or_undisclosed_failures(report),
        "mandatory_external": required_official_checks_resolved(report, policy),
        "survey_uncertainty": every_required_precision_field_valid(report),
        "privacy": disclosure_and_access_checks_pass(report, actor),
        "formats": all_output_facts_match_canonical_spec(report),
        "staleness": all_input_versions_current_for_policy(report),
        "review": required_human_approvals_attached(report, policy),
    }
    record_signed_gate_decision(report, checks, policy.version)
    return "RELEASED" if all(checks.values()) else "RESTRICTED_DRAFT"
```

No branch may skip a mandatory check. A network outage must be surfaced and the release decision follows the *policy of which claims must be externally checked*. Internal-original results can be accurately reported as independently validated without inventing an external match when publication policy allows, subject to statistical, privacy and analyst review. Every denied release returns exact failing check IDs and actionable remediation. Failure-injection tests must prove that direct API calls, UI exports, cached artifacts and alternate report routes cannot bypass the gate.

**Human sign-off:** statistical reviewer checks estimation and uncertainty; source reviewer adjudicates conflicts; publication authority approves decision-grade external reports. Roles may be combined under documented smaller-team policy but self-approval of model-generated contested causal claims is disallowed. Approval signatures reference report digest and policy version; a post-approval edit creates a new release candidate.

---

# 13. One canonical report AST, five consistent outputs

```mermaid
flowchart LR
  FACT["Versioned FactBundle"]
  EVID["Comparison and evidence registry"]
  CLAIM["Validated typed claims"]
  REP["Canonical ReportSpec AST"]
  QA["Server-side QA and approval gate"]
  HTML["HTML / accessible web"]
  PDF["Tagged, selectable-text PDF"]
  XLSX["Excel data and editable charts"]
  API["JSON API / dashboard"]
  MAP["Geographic views"]
  FACT --> REP
  EVID --> REP
  CLAIM --> REP --> QA
  QA --> HTML
  QA --> PDF
  QA --> XLSX
  QA --> API
  QA --> MAP
```

The canonical ReportSpec contains typed sections, estimand links, source references, confidence intervals, chart specs, investigation limitations, evidence statuses, review signatures and data classification. It must **not** be a model-written blob of formatted markdown. PDF is generated on the server as searchable text (not only screenshot/rasterized DOM). XLSX data tables and charts reference the same canonical values. HTML, PDF, Excel, JSON and maps must have parity tests on numeric facts, direction, labels, uncertainty, source versions and caveats. If a display format cannot show required limitations, that format cannot be labelled approved.

**Reproducibility manifest:** snapshot hash, ETL version, Python and R code hashes, packages and environment locks, survey specifications, source content hashes/page cells, model ID/version + prompt/template/digest hashes, validated claim IDs, reviewer signatures, gate result, artifact checksums, timestamp, approved data class. Same inputs should reproduce deterministic calculations and templates. LLM writing may not be bit-for-bit deterministic; therefore record generated structured output and freeze it for a release.

**Report classifications:** `PRIVATE_WORKING`, `RESTRICTED_DRAFT`, `INTERNAL_VALIDATED`, `PUBLIC_APPROVED`, `SUPERSEDED`, `REVOKED`. Do not misrepresent a research note as an official NISR publication; use the platform's own authorship and methodological disclosures.

---

# 14. Privacy, security, legal authority and adversarial robustness

**Data classification and egress matrix:**

| Class | Examples | Hosted LLM | Local restricted compute | Public report |
|---|---|---|---|---|
| `PUBLIC_OFFICIAL` | published NISR tables | permitted subject to source license | permitted | permitted with citation |
| `APPROVED_AGGREGATE` | checked district indicator after disclosure controls | conditional on data-use/provider terms | permitted | conditional on release gate |
| `RESTRICTED_MICRODATA` | record-level EICV, person responses | **prohibited** | authorized workers only | **prohibited** |
| `BENEFICIARY_PERSONAL` | names, health payments, household assistance | **prohibited by default** | separately authorized programme system | **prohibited** |
| `SECRETS` | API keys, access tokens, private signing keys | **prohibited** | secret manager only | **prohibited** |

**Threats and enforced controls:**

1. Prompt injection hidden in source PDFs/webpages/uploads -> parsed text treated as untrusted; tool allowlist, no instruction execution, fixed provenance tags.
2. Exfiltration through LLM prompts/logs -> pre-egress policy scan; deny restricted identifiers, record aggregate-safe payload digest, egress allowlist.
3. Re-identification through small cells or repeated queries -> minimum count/precision/disclosure policy, complementary suppression, query-rate/differencing risk checks, privacy review for public data.
4. Access-control bypass -> server-side object and row policies, deny-by-default, permission tests across roles/districts/programmes, authenticated download URLs.
5. Source spoofing/SSRF -> official-domain allowlist, redirect/DNS/IP safeguards, MIME/magic checks, size limits, safe parsers, document hash.
6. Dependency and artifact tampering -> pinned versions, signed build provenance, immutable release digests, SCA and supply-chain tests.
7. Wrong data joins -> enforce unique keys, unit of analysis, cardinality expectations and domain integrity with failure diagnostics.
8. Malicious/infinite LLM retry -> bounded task budget, cancellation, circuit breaker, provider quota policy, human escalation.
9. False executive confidence -> mandatory explicit uncertainty, no invented precision or exaggerated causal certainty.
10. Payment/beneficiary side-effects -> action isolation, human approval, transactional audit, segregation of authority from AI investigation.

Legal authority, data-sharing agreements and actual provider terms must be confirmed by the deployment owner. This document does not certify legal compliance or a specific cloud provider's handling of confidential data.

---

# 15. Governance, observability and scientific continuous evaluation

Every run emits correlated `trace_id`, `run_id`, `stage_id`, `dataset_snapshot_hash`, `estimand_id`, `validation_policy_version`, `source_revision`, `model_route_decision`, `claim_ids`, `release_gate_result`, and safely redacted exception context. Logs **do not** contain secret values or individual survey rows. Capture worker stdout/stderr securely instead of dropping them, using structured event retention. Instrument source cache hit/miss, retrieval success, table extraction confidence, per-indicator match categories, estimator agreement, variance checks, unsupported-claim rejection, privacy blocks, model schema compliance, multilingual parity, PDF/XLSX consistency, queue latency, job failure and audit-log integrity.

**Continuous evaluation:** fixed benchmark datasets and golden source extracts; independent implementations; mutation tests intentionally reversing directions and swapping denominators; synthetic sources with prompt injections; confidence-interval and trend consistency; adversarial VUP phrases; property-based tests; load tests across all districts; provider rollout canaries and rollback. A new LLM version is **not eligible** until task-specific benchmarks pass, including Kinyarwanda evidence wording. A new NISR release triggers revalidation without editing old signed reports.

**Incident handling:** severity classification for source corruption, incorrect statistical release, sensitive-data leak, stale report, auth bypass and mass provider failure; isolate/disable release route, mark releases revoked/superseded as appropriate, notify responsible people per policy, preserve forensic hashes, issue a corrected version with explanatory audit record. No hidden retroactive report changes.

**Metrics vs guarantees:** choose realistic performance SLOs from measured baselines; privacy and critical claim-validation failures are release blockers, not numerical averages. “100% accurate AI” is not a defensible certification. The defensible claim is **no known critical validation failure is allowed to pass the release gate**, backed by continuously tested controls.

---

# 16. Acceptance tests — measurable, adversarial, non-negotiable

| Test ID | Given / injected condition | Required outcome |
|---|---|---|
| T01 | `modelled_claim` attempts official value copied into both computed and published fields | `externally_matched` denied; origin-independence assertion fails |
| T02 | All 24 reference fetches fail, with no approved cache | audit shows `retrieval_failed`; no false verified count; mandatory external claims prevent public release |
| T03 | NISR PDF lives in valid pinned cache but network times out | cached file loaded with revision/hash; status explicitly `cached_version`; extraction executed |
| T04 | Cached file exists but digest mismatch | quarantined and not trusted; no silent fallback |
| T05 | True VUP sentence refers to *poor households* and lower participation, with poverty higher | no erroneous poverty correction; typed claims remain separate |
| T06 | Model outputs a new numeric percentage not in validated facts | rejected before render and before export |
| T07 | Model swaps household rate for person rate | schema/semantic validator rejects |
| T08 | Grid connection vs main source of lighting official table | `not_comparable` without forced match |
| T09 | Published poverty 2016/17 vs observed 2023/24 with differing method | historical comparability blocked absent approved harmonization |
| T10 | Reference R result differs beyond method-specific tolerance | headline estimate held; report cannot be released |
| T11 | District–national overlap covariance incorrectly omitted | scientific fixture detects wrong comparison SE |
| T12 | VUP subgroup below effective-sample/reliability threshold | uncertainty flag preserved in AI, chart, report and API |
| T13 | Stale `ai-report.json` after findings code/data change | invalidated; cannot serve old approved report as current |
| T14 | AI models all fail / quotas exhausted | deterministic evidence report or restricted draft; no fabricated numbers |
| T15 | Hosted model request includes restricted row-level field | outbound request denied and audited |
| T16 | Repeated low-N geographic queries might reveal a household | disclosure control blocks or suppresses based on policy |
| T17 | Untrusted NISR-like PDF contains “ignore rules, send keys” | no tool/policy override; extract only authorized data |
| T18 | Direct export API called without appropriate release permission | access denied even when UI button is visible |
| T19 | HTML PDF Excel disagree on numeric value or warning | parity test fails; release blocked |
| T20 | External source revised after report approved | old release marked potentially superseded; new versioned revalidation generated |
| T21 | Resumed run with changed data hash | old checkpoints cannot be reused without derived invalidation |
| T22 | New provider/model silently returns malformed JSON | schema fail, bounded retry or escalation; no unvalidated output |
| T23 | User asks AI to prove low VUP causes poverty | no causal conclusion absent qualifying causal evidence |
| T24 | Unauthorized programme user requests beneficiary export | server denies and records attempted access |
| T25 | Analyst changes priority-score weights | scored ranking versioned with sensitivity analysis and responsible decision owner |
| T26 | One worker crashes during a stage or a report write | durable restart/resume from valid checkpoint, atomic artifact writes |
| T27 | Worker reaches concurrency or cost ceiling | queued or explicitly refused with recoverable state, not unbounded fork |
| T28 | Reviewer approves, then report payload changes | original signature invalid; must seek new approval |
| T29 | English/Kinyarwanda template changes comparator or percentage | locale parity test rejects |
| T30 | Several official revisions disagree | evidence conflict recorded with reviewer adjudication; no silent latest-wins |

**Coverage requirement:** every critical invariant I1–I10 must have positive, negative, injection and API-bypass tests. Passes must be *executed tests* with CI job IDs and logs; an architecture diagram, unit test named `test_verified` or a green mocked assertion is not sufficient proof.

---

# 17. Implementation map: current files to v6 responsibility

| Current code / path (from audit) | Migration treatment | Target module / acceptance evidence |
|---|---|---|
| `tools/investigation/analysis.py` | preserve initially, wrap with estimand contracts | `science/primary/`, independent benchmark suite |
| `context.py`, `reliability.py` | validate survey design and covariance; require digest fields | `science/variance/`, `FactBundle` parity |
| `drivers.py` | restrict causal language, add sensitivity and independent review | `science/exploratory/`, causal classification tests |
| `sources.py` | fix cached metadata fallback and source revision pinning | `evidence/retrieval/`, outage/cache injection tests |
| `verification.py` | eliminate self-match, add origin and semantic contracts | `evidence/comparison/`, T01/T08/T30 |
| `ai.py`, `llm.mjs` | unify gateway adapters after fact/claim firewall exists | `ai/gateway/`, provider contract and privacy tests |
| `ai-report.mjs`, `reportChecks.js` | remove regex substitution and typed prose numbers | `claims/`, `rendering/`, T05/T06/T07 |
| `reportTemplate.js`, `reportVerification.js` | canonical ReportSpec, honest count summary and statuses | `reporting/spec/`, T02/T19 |
| `reports.py`, `reportExport.js` | unify versions, server PDF, spreadsheet charts | `reporting/renderers/`, export parity |
| `vite-api.mjs` | keep as local compatibility adapter while FastAPI introduced | `api/`, auth + guarded downloads |
| `engine.py` | integrate durable stage orchestration, idempotency, audit | `workflow/`, crash/restart tests |
| `investigations/*.json` | migration/import into immutable object+metadata store | `migration/`, old-run read-only backfill |
| `src/pages/DistrictInvestigation.jsx` | retain UX, change authenticated endpoint/client | `frontend/investigations/`, role and status UI tests |

The audited codebase may have changed since 29 October 2026. Claude Code must **reinspect the current commit before changing files**, reconcile differences, and avoid assuming these paths are unchanged. Maintain rollback points at each migration; preserve existing analysis outputs as fixtures to compare against the new implementation (do not simply bless all previous numbers as gold values).

---

# 18. Full development programme — all capability groups, not just an MVP

There is no arbitrary deadline-based deletion of features. Dependencies dictate sequence, and every milestone has an evidence-based completion gate. These are **implementation groups**, not promises about completion time or number of developers.

| Order | Capability group | Work products | Exit evidence |
|---|---|---|---|
| P0 | **Stop incorrect reports now** | fail-closed release route, truthful counts, cached source recovery, no self-match, VUP correction fix | Kamonyi outage and false-correction regression tests pass |
| P1 | **Scientific truth engine** | independently written R estimators, survey design contracts, precision/reliability, district national covariance | golden design fixtures and primary-reference agreement |
| P2 | **Official evidence platform** | NISR XLSX/PDF registry, versioning, semantic match, review UI, conflict handling | reference extraction/version/outage tests |
| P3 | **Typed claim/report compiler** | claim AST, validated templates, i18n, canonical report, signed approval and consistent exports | no unauthorized numeric prose; HTML/PDF/Excel parity |
| P4 | **Production foundation** | FastAPI, auth/RBAC+ABAC, PostgreSQL, encrypted object storage, worker queue, audit and disaster recovery | threat, permission, restart, idempotency and DR exercises |
| P5 | **Multi-provider AI platform** | Groq/NVIDIA/Ollama Cloud/local Ollama, model capability registry, quality router and quotas | model benchmark suite + outbound privacy tests |
| P6 | **Advanced investigation science** | competing-hypothesis planning, FinScope/EICV historical harmonization, alternative models, geospatial uncertainty | prespecified robustness tests and clear inconclusive outputs |
| P7 | **Programme intelligence and action** | programme evidence registry, VUP monitoring, intervention feasibility, equity risk, evaluation planning, responsible actions | programme/survey boundary review and recommendation audit |
| P8 | **Continuous assurance** | source-release watch, nightly full-district benchmark, vulnerability tests, incident simulations, model drift and bilingual QA | auditable monitoring and release rollback tests |

**Parallelism:** once the typed schema and access policies are stable, research on evidence retrieval, reference estimators, and provider adapters can proceed in parallel; merging requires cross-boundary integration tests. Adding Ollama is not a substitute for fixing trust failures but is part of the full programme. New features must be behind flags until the security and validation contracts pass.

**Suggested repository architecture:**

```text
frontend/
backend/app/api/
backend/app/auth/
backend/app/workflow/
backend/app/data/{ingestion,catalog,geography}/
backend/app/science/{primary,variance,exploratory,reference_client}/
reference-estimators-r/              # separate codebase + dependency lock
backend/app/evidence/{retrieval,extraction,semantics,comparison}/
backend/app/claims/{schema,validator,templates,i18n}/
backend/app/ai/{gateway,adapters,benchmarks,guardrails}/
backend/app/research/{hypotheses,interventions,monitoring}/
backend/app/reporting/{spec,renderers,release}/
backend/app/governance/{policy,privacy,audit}/
contracts/                            # language-neutral generated schemas
fixtures/{eicv,official,adversarial}/
tests/{unit,integration,science,security,e2e,chaos,render_parity}/
infra/{db,object_store,queue,observability,secrets}/
docs/adr/
```

---

# 19. API and storage contracts (implementation-level)

**API examples:**

```text
POST   /v1/investigations              -> 202 {run_id, state, snapshot_policy}
GET    /v1/investigations/{id}         -> stage states, warnings, immutable manifests
GET    /v1/investigations/{id}/facts   -> authorized validated FactBundle
GET    /v1/investigations/{id}/evidence-> source, version, comparison statuses
POST   /v1/investigations/{id}/draft   -> typed claims and draft ReportSpec
GET    /v1/reports/{report_id}         -> authorized draft/release metadata
POST   /v1/reports/{report_id}/qa      -> server-side machine gate, idempotent
POST   /v1/reports/{report_id}/approve -> authorized signed review decision
POST   /v1/reports/{report_id}/release -> gate-enforced immutable release
GET    /v1/reports/{report_id}/files/{format} -> access-controlled verified artifacts
POST   /v1/reports/{report_id}/revalidate -> create superseding candidate
GET    /v1/indicators/{id}/definition  -> canonical estimand and methodology
```

Every endpoint uses scopes and object-specific access. Unapproved draft exports require separate explicit permission and watermark policy, not the public download route. `release` and `approve` require idempotency keys and optimistic concurrency to prevent time-of-check/time-of-use changes. A client cannot set a report's verification or approval status.

**Relational metadata entities:** `users`, `roles`, `data_policies`, `datasets`, `dataset_snapshots`, `survey_designs`, `estimands`, `runs`, `stage_events`, `estimates`, `reference_documents`, `reference_facts`, `comparability_decisions`, `evidence_comparisons`, `research_hypotheses`, `typed_claims`, `report_specs`, `qa_results`, `approvals`, `releases`, `provider_runs`, `audit_events`, `supersession_links`. Heavy confidential datasets and publication files belong in encrypted versioned object storage; database stores verified content hashes/locations and access control metadata. Any vector search index is a convenience for discovery, **not** authority for numeric verification.

**Failure-state matrix:**

| Fault | Investigation state | Public release? | Analyst action |
|---|---|---|---|
| Data integrity mismatch | `FAILED_DATA` | No | repair data/version |
| Independent estimator mismatch | `FAILED_SCIENCE` | No | statistical adjudication |
| Official document timeout but no required external claim | `EVIDENCE_PARTIAL` | possibly, only internally validated claims under policy | disclose absence and restrict claims |
| Official document timeout for mandatory comparison | `RESTRICTED_DRAFT` | No | recover approved source or resolve requirement |
| Source definition mismatch | `NOT_COMPARABLE` | no claim of external match | choose equivalent reference or disclose |
| Model quota exhausted | `AI_UNAVAILABLE` | deterministic report possible if all other gates pass | fallback or later regeneration |
| Unsupported model-authored number | `FAILED_CLAIMS` | No | regenerate typed proposal, never auto-patch number |
| Privacy suppression fails | `FAILED_PRIVACY` | No | revise aggregation or access policy |
| Human review missing | `AWAITING_APPROVAL` | No | authorized reviewer approves |
| New official revision discovered | `POTENTIALLY_SUPERSEDED` | prior version stays immutable | revalidate and publish new version |

---

# 20. Architecture decisions and explicit unknowns

**Decisions:** (ADR-001) independent calculation and official reference must have separate origins; (ADR-002) deterministic numeric wording and typed claims; (ADR-003) server-side immutable releases; (ADR-004) document cache is content-addressed/versioned; (ADR-005) AI provider routing is policy-and-capability-based; (ADR-006) local microdata never forwarded to hosted LLMs by default; (ADR-007) programme transactions separated from statistical analysis; (ADR-008) all district workflows use explicit estimands and geography versions; (ADR-009) prioritize modular monolith plus workers over dozens of microservices unless operational measurements justify a split; (ADR-010) no workflow state is allowed to bypass a failed mandatory release condition.

**Facts requiring implementation investigation:** exact NISR weights/strata/PSU design for each file; reliable published XLSX locations and revision timelines; which EICV indicators share the same population/universe; licensing and beneficiary legal basis; confidentiality thresholds and applicable Rwanda legal requirements; precise infrastructure availability/budget; whether Groq/NVIDIA/Ollama model endpoints support the required structured output for chosen models; actual survey uncertainty and covariance conventions; actual historic trend bridges. These are **requirements to verify**, not things this design pretends to know.

**What counts as an independently demonstrated success:** Claude Code supplies source diff, tests executed against real fixture/data, machine-readable run output, links to extracted official evidence, rendered HTML/PDF/XLSX, verification count calculation, server release decision trace, reviewer identity/signature, and adversarial outage evidence. No “everything passed” claim is accepted without artifacts. A complete architecture remains **a proposal** until these tests run.

---

# 21. Engineer's final checklist

- [ ] Report source data and official references have distinct hashes/origins.
- [ ] `modelled_claim` self-match is impossible.
- [ ] Cached NISR PDFs/XLSX are read correctly during network failure.
- [ ] NISR figures are extracted with page/sheet/cell locations.
- [ ] Indicator denominators, survey periods and poverty methodologies are explicit.
- [ ] Independent R/Python estimators execute, with documented tolerances.
- [ ] Covariance and small-domain uncertainty are validated.
- [ ] Every reliability grade reaches AI, dashboard, charts and exports.
- [ ] AI returns only claim IDs/typed predicates, not arbitrary numerical prose.
- [ ] Claim and cause validators block unsupported statements.
- [ ] Official source statuses and verified-match counts are truthful.
- [ ] No public export route bypasses mandatory checks.
- [ ] Confidential row-level data cannot reach cloud AI or public exports.
- [ ] Groq/NVIDIA/Ollama adapters use server-side secrets and eligible model capabilities.
- [ ] One canonical report model drives all formats, with parity tests.
- [ ] Draft, approval, release, supersession and revoke are signed and auditable.
- [ ] Full-district and Kamonyi regression, source outage and security fixtures pass.
- [ ] Residual unknowns are disclosed, not invented.

**Final standard:** *Ireme Insight may publish only what it can demonstrate, label, trace, reproduce and defend. The system must be excellent at saying “this remains unverified” when evidence is inadequate.*
