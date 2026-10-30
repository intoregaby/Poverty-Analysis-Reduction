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
