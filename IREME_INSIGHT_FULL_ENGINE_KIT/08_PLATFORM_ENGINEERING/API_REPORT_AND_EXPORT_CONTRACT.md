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
