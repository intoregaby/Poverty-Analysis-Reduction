# Status (update every cycle)

2026-10-30 live-provider cycle: every configured credential was verified against the real providers
without printing a value — 7 Groq, 3 NVIDIA and 1 Ollama Cloud key each authenticated on `/models`
and returned a 1-token completion, with Groq reporting 999/1000 requests remaining (no account out
of credit). Two live-only defects were found and fixed in `gateway_http.py`: Ollama lists models as
`llama3.2:latest` while the policy names `llama3.2`, so exact matching made every local model look
unavailable, and the 30 s probe / 45 s completion budgets were shorter than a cold local model load.
The five live tests now pass for real (structured-output capability, provider 404 failover, 401 ->
second configured key failover, local-only routing with every cloud key present, secret redaction),
and `scripts/check_provider_accounts.py` records repeatable credit/auth evidence without key
material. `BLK-PROVIDERS` is resolved and `EP-09` is marked verified. All 95 scenarios now carry an
explicit acceptance mapping (author-mapped from the executed `@acceptance` tests, independent review
still required), and W2/W13/W14/W15/W17 now carry integration-level evidence, so the completion gate
falls from 34 to 29 failures before this cycle and 12 scenarios remain non-PASS (external evidence).
Local Ollama evidence depends on the daemon and on pulled models; rerun the check when keys rotate.

2026-10-30 credentials cycle: provider credentials now use one canonical convention everywhere.
`.env.example` documents `GROQ_API_KEY`/`NVIDIA_API_KEY`/`OLLAMA_API_KEY` plus the `_2`…`_9`
suffixes; `.env.local` was rewritten from person-labelled raw keys to those names, keeping all 11
distinct key values byte-for-byte and merging duplicates (the script refuses to write if the
credential hash set would change). `gateway.py` expands a configured provider into one routing slot
per key (`groq`, `groq#2`, …), tries them in order, and fails over only when a credential is
rejected or rate-limited; cooldowns are per key. Redaction and prompt-leak checks now cover the
suffixed keys even when expansion is disabled, and the HTTP transport resolves model preferences by
base provider so a secondary key does not lose its model list. Six tests cover ordering, dedupe of
repeated values, 429 and revoked-key failover, bounded exhaustion without key echo, and the local
env file's canonical names. No live provider call was made, so account entitlements and real quota
behaviour are still unverified (BLK-PROVIDERS); extra keys never raise provider quotas.

2026-10-30 report-release cycle: report lifecycle now has one governed path from frozen AST to
bytes. `engine/ireme/reports.py` persists report versions, records independent reviewer signatures
and evaluates the kit's release gate server-side. `POST /v1/reports/{id}/review` accepts only an
approve/reject decision and a reason (client-supplied checks, signatures or status are rejected);
`POST /v1/reports/{id}/publish` requires the publication authority; `GET /v1/reports/{id}/export`
is the only route that renders, refuses drafts/qa-failed/superseded/revoked versions with
`NOT_RELEASED`/`SUPERSEDED`/`REVOKED`, re-verifies the frozen AST hash on every request and audits
both permitted exports and denied attempts. A client cannot reach a published artifact without
three distinct `aal2` reviewers and the author cannot sign their own report. Nine new
ASGI/SQLite tests pass (real signed tokens, real PDF/HTML/XLSX rendering, no network).
The legacy browser report downloads now refuse to export without a verification record and always
emit a restricted-draft watermark plus a machine-readable failure manifest (unresolved items,
unretrieved official sources, automated fallback); five node tests cover that policy. The browser
gate cannot release a public artifact because it has no server release authority; that remains the
governed API's job. Full engine suite: 203 tests OK (4 skipped). npm test 105/105, lint clean, build
succeeded. Completion gate still fails on the open blockers and approvals below.

2026-10-30 retention/storage cycle: dataset revisions can now carry an explicit retention end
(`catalog.dataset(..., retention_expires_at=...)`); `ireme/retention.py` refuses every authorisation
at or after that instant, evaluates against the request clock instead of cached state, and reports
an explicit retention view. Content-addressed artifact storage (`ireme/object_store.py`) writes
atomically, re-verifies hashes on read, retries bounded outages and raises
`ObjectStoreUnavailable` without leaving partial objects. Report publication now writes the
HTML/PDF/XLSX artifacts before flipping status, so an object-store outage leaves the report
`approved` rather than `published` without bytes; exports then serve the verified stored artifact.
Six new tests pass (expired retention denial, boundary handling, outage retry with no partial
file, tamper detection, publish recovery). The object store and retention scheduler are local
adapters: no encrypted production bucket, backup rotation or automated purge job is deployed, and
the database itself still stores metadata only.

2026-10-30 CI-gate cycle: `.github/workflows/ci.yml` runs the engine suite, `npm ci/test/lint/build`
as blocking jobs and reports the completion gate as an artifact (non-blocking until real evidence
and approvals exist; a green run is still required before release). Two tests exercise the gate's
own decision function so a failing, skipped, missing, unmapped or synthetic-only critical test can
never produce PASS. The workflow is committed but has not been executed by a remote runner; no CI
run, branch protection or merge-blocking evidence exists yet.

2026-10-30 EP-12 monitoring cycle: `policy.MonitoringPlan` now validates a measurable programme
plan before any scale recommendation: at least one metric, a sourced baseline (invented
baselines refused), comparison/control strategy, ISO evaluation date, success/failure criteria
and an explicit cost denominator. Pre/post-only designs are labelled non-causal, and
`require_monitoring` refuses `consider_scale` without the option's registered plan. One new
policy test passes (14 in that module). This is a validated record, not a live monitoring
system; programme administrative data and evaluation results are not connected.

2026-10-30 research-agent cycle: bounded multi-role agent orchestration added in
`engine/ireme/agents.py` (EP-10). Roles map to explicit read-only tool allowlists; model
output is limited to number-free competing hypotheses or typed claim proposals that cite
permitted fact/evidence identifiers. Steps, tokens, time, cost and schema repairs are
bounded; exhaustion returns `needs_human_review`, and provider outage falls back to a
deterministic two-hypothesis register. Retrieved document text is quarantined as
`untrusted_data` and cannot grant tool permissions. Every run records template/schema/
evidence/prompt/result hashes and appends a redacted `agent.run` event to the durable audit
chain. Agents never write the ledger, certify facts or approve release. Reviewed proposals can be
promoted by a human through `promote_to_ledger`, which records them as `open` with explicit
reasons-not-tested and refuses injected verdict fields. Seventeen synthetic component tests pass
(scripted provider transcripts, signed ASGI route, SQLite ledger, no network); the authenticated
`POST /v1/investigations/{id}/agent-proposals` route fails closed without a provider (`503`) and
journals the run. Model quality, live provider routing and automated re-import of promoted
revisions remain unverified. Context construction is permission- and lineage-bound through the
persistent catalog.

2026-10-30 hosted Supabase/security cycle: connection restored through the Supabase plugin.
Repository URL matches active project ywtxpsefbqzmgmdfzldp (ireme-program). Public schema and
security/performance advisors inspected without reading beneficiary records. Real SQL regression
confirmed missing-profile callers reached assign_agent_core through a nullable permission guard.
Hosted migration fail_closed_assignment_authorization now denies missing-profile and subjectless
authenticated callers; anonymous EXECUTE remains denied. All six denial checks pass in a rolled-back
transaction. Service-role grant is preserved; privileged business writes/MFA/session validation remain
unverified. Exact applied SQL and before/after responses are in evidence/supabase_authorization_cycle_2026_10_30.json
and evidence/supabase_assignment_remediation.sql. CLI migration-history pull is pending a working CLI;
do not invent local migration timestamps or claim this is a complete hosted baseline.
Profile role/area updates already have a guard trigger; no role-escalation finding inferred from
column grants alone. Eleven SECURITY DEFINER RPC warnings and disabled leaked-password protection
remain under review. No security approval is inferred from this narrow fix.
FastAPI framework 404/405/422 errors now obey the standard redacted error contract; seven API tests pass.
Full offline verification completed: 168 engine tests, 163 passed and 5 skipped; npm test/lint/build
all exited 0. Acceptance remains 2 PASS, 75 COMPONENT_ONLY, 13 BLOCKED and 5 NOT RUN; completion
exits 1 with 35 gate failures. Pending CLI download was cancelled once hosted changes and checks
were complete; cached executable also failed OS validation. Do not retry CLI installation in a loop.
Hosted migration history confirms version 20261030053053. Local full-baseline pull remains pending.
Continue production persistence and bounded agents after this cycle.

2026-10-30 acceptance-scope correction: passing tagged component tests are now COMPONENT_ONLY
until explicitly mapped to scenario-scoped integration evidence. Historical 77 PASS counts must not
be read as 77 completed production acceptance scenarios. Only EVD-01/EVD-02 currently have explicit
acceptance mappings to real legacy-path tests; independent final acceptance approval remains required.
Six scope-gate regression tests and one registry-preservation test pass. Registry regeneration now
preserves implementation history, acceptance mappings, defect integration tests and workstream metadata.
Supabase endpoint reachability check returned HTTP 401 (expected without authentication), but no plugin
operation tools are exposed. No hosted query, schema change, or project verification has been performed.
User has explicitly deferred Supabase connection work; do not spend further cycles retrying it until
other independent work progresses or the user restores the connection.
Cycle verification: 166 engine tests, 161 pass and 5 skipped; npm test/lint/build all exit 0.
Acceptance now reports 2 PASS, 75 COMPONENT_ONLY, 13 BLOCKED and 5 NOT RUN. This is a scope-label
correction, not removal or relaxation of any kit scenario. Completion exits 1. Evidence:
evidence/cycle_2026_10_30_acceptance_scope.json. Next independent work: bounded research-agent orchestration.

2026-10-30 identity/API cycle: cryptographic RS256/ES256 JWT verification, trusted JWKS cache,
issuer/audience/expiry checks, signed app_metadata scopes, MFA and independent-approver authorization
implemented. Six real-signature component tests pass. FastAPI read routes connect JWT authorization,
persistent scientific-run records, scoped diagnostics, licence revocation and durable read audits;
five ASGI/storage integration tests pass. The fixture IdP is not hosted IdP validation: PRIV-13 remains
blocked on real identity/MFA evidence. See GOVERNED_API.md for configuration and remaining API scope.
Legacy UI and unsigned artifact export paths still require migration; production Postgres/Temporal
and the approved report service remain pending.
Identity/API cycle verification: 159 engine tests, 154 passed and 5 skipped; npm test/lint/build all
exited 0. Full acceptance remains failed. Evidence: cycle_2026_10_30_identity_api.json.
User directs hosted backend/database work through the Supabase plugin. Discovery reports it installed
and enabled, but no Supabase operation tools are currently exposed in this chat; hosted changes await
that tool connection. Continue independent local implementation without claiming hosted verification.

2026-10-30 governed research cycle: science.execute connects persistent catalogue permissions,
immutable indicator mapping/dictionary, raw-file hashes, primary Python estimates, independently
loaded raw R reference, and durable checkpoints. All 31 domains and 30 joint contrasts are reconciled
as diagnostic differences; result remains restricted_draft with zero certified facts until external
scientific ownership/tolerances/CI methods are approved. Actual R package versions and Rscript hash
are captured and checked; source snapshots and a kit-schema investigation manifest are persisted.
Four workflow tests pass, including a real run, checkpoint reuse, revocation, and tampered checkpoint
rejection. Existing 12 durable-job tests pass. The real-data workflow test uses a synthetic permission
fixture and does not establish actual legal rights or production readiness.
Legacy UI report generation still needs migration to the governed workflow and secure release service.
Full offline verification completed: 148 engine tests, 143 pass and 5 skipped; npm test/lint/build
all exited 0. Completion gate remains failed. See evidence/cycle_2026_10_30_science_workflow.json.

2026-10-30 contrast cycle: removed independent-sample error propagation from claim compilation.
Joint-design contrast facts must themselves be scientifically validated and bound to exact operand
hashes, dataset, period, definition and units before a significance claim can be rendered. t thresholds
respect design df. Approximate equality requires a registered margin and TOST, not mere nonsignificance.
Seven contrast compilation regressions pass. The raw R reference now calculates all 30 district-national
contrasts using svycontrast and full joint covariance; real Python/R comparison passes for all 30.
Evidence: python_r_joint_contrasts.json (diagnostic only, independent scientific signoff pending).
Machine contracts and snapshot hashes now reject nonfinite JSON quantities.
The governed run-to-fact pipeline is still pending; this cycle addressed a downstream scientific defect
found while inspecting that integration path.
Offline full verification completed: 144 engine tests, 139 passed and 5 skipped; npm test/lint/build
all exited 0. Completion remains false (77 scenarios pass, 12 blocked, 6 not run). See
evidence/cycle_2026_10_30_contrasts.json and the executed-code snapshot in the joint-contrast evidence.

2026-10-30 catalog cycle: persistent immutable indicator and dataset revisions, dataset-hash-bound
purpose/expiry/revocation permissions, and transitive forward/backward lineage added in ireme/catalog.py.
Four catalog tests pass. load_governed now checks permission and raw archive hash before parsing;
two loader tests pass (real raw bytes with synthetic permission fixture, not actual licence evidence).
SQLite is the local adapter only; Postgres service integration and real licences remain pending.
Existing exploratory loading and legacy reports are not yet governed end-to-end.
Verifier --offline records skipped hosted-provider tests and always fails completion; use this while
replacement credentials are being configured. Do not copy credentials from chat into source or evidence.
Cycle verification completed: 135 engine tests executed, 130 passed and 5 skipped; all three npm
suites exited 0. Offline completion gate exited 1: 77 acceptance scenarios pass, 12 blocked,
6 not run; only W1/W5 have linked passing integration evidence. See evidence/cycle_2026_10_30_catalog.json.

2026-10-30 scientific cycle: validation now blocks NaN/infinity, negative SE, nonpositive scale,
and unknown tiers (two adversarial regression tests). Added an R survey reference script that
reads the raw archive independently and a provenance-checking Python runner. R 4.6.1 and packages
were subsequently installed for the current user. Real raw-archive execution and Python comparison
completed for all 31 domains; maximum point difference 1.11e-16 and SE difference 1.04e-17.
Package versions and measured comparisons are saved. Independent ownership, definition review,
approved tolerances, reference fixtures and scientific approval remain pending.
SCI-09 is explicitly skipped rather than credited as passed. See engine/reference/README.md.

2026-10-30 application integration cycle: W5 direct source-cache fallback is now wired into
tools/investigation/sources.py, including scope/hash/expiry/revocation/supersession validation and
304 revalidation. Failed live retrieval remains Failed with separate cached_evidence, cache_used,
original retrieved_at, and validated_at. Four integration tests pass, one using the real NISR PDF.
W1 modelled_claim now returns no internal estimate or arithmetic difference for a copied official
reference and does not count it as independently verified. Real poverty-profile integration test passes.
Registry links these tests to W1/W5. Other defects still lack integration proof.
Repository checks from the reporting cycle completed: npm test (100), lint, and build all passed.
The latest integration-cycle evidence is recorded separately; full platform completion remains blocked.

2026-10-30 resumed cycle: report renderers now reject mutated snapshots; AST construction copies caller-owned
sections and warnings. PDF parity compares the complete numeric sequence (detects additional/reordered numbers)
and includes PDF status. Six reporting regression tests pass, including restricted/revoked PDF status preservation. ReportLab and XlsxWriter dependencies declared.
These are component tests; OPS-04/05 remain unverified pending production integration and complete acceptance.
Completion approval digests now bind to source bytes, including uncommitted files, and repository suite exits.
Full verifier execution is recorded in evidence/verification_run.json; the platform remains incomplete.

Additional modules from the interrupted cycle are present: gateway + HTTP adapters, durable SQLite jobs,
lab and policy modules. Their presence is not production acceptance. Review their tests and integration next.

Wave 1 (foundation and trust) in progress. Implemented in `engine/ireme`: survey estimator + jackknife reference + validation gate,
bootstrap, provenance/self-match prohibition, semantic equivalence registry, typed claim compiler + prose scanner, release gate,
report repository (signed/revocable links, tenancy, district scope), disclosure control, source cache + SSRF guard, official table
extraction (real NISR PDF, XLSX, safe zip), version/conflict/tolerance/licence logic, real EICV7 evidence.

Next (dependency order): AI gateway (AI-12..18), durable jobs/audit log (OPS-*), decomposition/causal/spatial lab (SCI-14,16,17,18; POL-*),
agents/hypotheses (EP-10), report AST + HTML/PDF/XLSX renderers (OPS-04/05), production API + authN (PRIV-13..15), then rewire legacy
`tools/investigation` stages to the new modules. Open blockers: see `registry.json` (R, provider keys, NISR artefacts, approvals, infra).
Always run `python scripts/verify_engine_completion.py --no-repo-suites` after changes.
