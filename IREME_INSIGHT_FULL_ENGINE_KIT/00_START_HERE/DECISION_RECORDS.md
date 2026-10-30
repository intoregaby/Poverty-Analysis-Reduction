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
