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
