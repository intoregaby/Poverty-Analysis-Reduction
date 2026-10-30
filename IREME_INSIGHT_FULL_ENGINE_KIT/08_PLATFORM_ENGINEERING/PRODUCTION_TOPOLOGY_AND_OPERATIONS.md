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
