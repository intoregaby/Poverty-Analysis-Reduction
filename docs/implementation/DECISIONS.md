# Architecture decision records

**ADR-001 New `engine/ireme` Python package; legacy `tools/investigation` untouched until parity.** The kit's migration map says
retire legacy only after feature parity. New trust-critical modules (survey, claims, provenance, release gate, report service,
sources, extraction) are built clean with contract tests, then legacy stages are rewired to them.

**ADR-002 Completion is computed, not recorded.** `verify_engine_completion.py` runs the tests itself; registry holds definitions only.
Stored verdicts cannot be edited to fake completion. Approvals must bind to the evidence digest and not be the engine author.

**ADR-003 Independence.** Primary estimator = Taylor linearisation (`survey.py`). Reference = stratified delete-one-PSU jackknife
(`survey_reference.py`), no shared code. This is independent in *method* but not in *ownership/language*; the kit's R `survey`
path (SCI-09/10) remains blocker BLK-R. Python-vs-Python agreement is not claimed as the R requirement.

**ADR-004 Evidence classes.** Tests declare `synthetic` or `real`. Scenarios needing real data/services cannot pass on synthetic evidence.

**ADR-005 Tolerances registered before measurement.** Point estimate vs NISR published figure: half a unit in the last published decimal
(0.005 pp for two-decimal tables). SE corroboration: 0.10 pp. Production tolerances remain unapproved (kit policy file) so
statistical sign-off (APR-STAT) is still required; tolerances were not relaxed after seeing results (see FINDINGS F-001).

**ADR-006 Equivalence is a reviewed declaration.** Computed-vs-official comparability comes from `semantics.EquivalenceRegistry`
(named approver + rationale), never from equal numbers or hand flags. Missing declaration => `not_comparable`.

**ADR-007 Claims.** Model output is only schema-conformant fact references; all numerals in prose come from `claims.compile_claim`.
Residual model prose is scanned and rejected if it contains any numeral or number word.

**ADR-008 Completion evidence boundaries (2026-10-30).** Component scenario tests alone do not resolve an audit defect
in the existing application. Each defect and workstream must link executed integration tests before completion.
Approval digests include source bytes from the working tree and repository suite exit codes; unchanged scenario
labels cannot preserve an approval after the implementation changes. Reporting unit tests do not claim OPS-04/05 acceptance.

**ADR-009 Historical cached evidence (2026-10-30).** The existing investigation worker now uses its direct
cache manifest before scanning older run registers. Both paths enforce matching source identity/URL, cache-root
containment, PDF magic, content hash and available expiry/revocation/supersession metadata. Missing expiry metadata
does not certify currentness; the evidence remains historical and the failed live check stays visible.
HTTP 304 revalidates the same constraints and retains the original retrieval date.

**ADR-010 Modelled official reference (2026-10-30).** A copied official modelled estimate is represented only as
a published value. The legacy schema uses not_externally_verified with an explicit reference label until the
canonical reference-status model replaces it. No internal value, numerical difference, or independent-match credit
is assigned. The real NISR poverty-profile regression exercises both legacy claim construction and summary counts.

**ADR-011 Bounded research agents propose, humans and the verifier decide (2026-10-30).** `agents.py` runs the kit's
typed roles with an allowlisted read-only toolbox, hard step/token/time/cost budgets and bounded schema repairs.
Model output is restricted to two shapes: number-free competing hypotheses and `claim-proposal` objects that may
only cite permitted fact/evidence identifiers. Model agreement is never corroboration (`corroboration` requires
disjoint evidence). Exhaustion returns `needs_human_review`; provider outage yields a deterministic two-hypothesis
fallback. Agent runs never append to `research.py`; promotion into the immutable ledger is a human action. The
durable journal stores hashes and redacted summaries, not prompts, excerpts or model prose. `promote_to_ledger`
accepts only `proposed` runs, rejects injected verdict fields, records promoted hypotheses as `open` with explicit
reasons-not-tested, and is idempotent on the request document (the CAS base_version is not part of the idempotency
identity). 

**ADR-012 Governed report release and export (2026-10-30).** A report version is frozen from a governed pipeline
with server-computed release checks, then reviewed by three distinct `aal2` reviewers (statistical, privacy,
release) whose signatures are recorded in `reports.py`; the author cannot sign. Only the publication authority
publishes an approved version, superseding the previous one. `GET /v1/reports/{id}/export` is the only path to
bytes: drafts, QA failures, superseded and revoked versions are refused and audited, and the frozen AST hash is
re-checked on every request. Client-supplied checks, signatures or status are rejected, so hiding a UI button is
never the control. The legacy browser downloads cannot release anything: they refuse to export without a
verification record and always carry a restricted-draft watermark plus a machine-readable failure manifest.

**ADR-013 Retention and artifact storage fail closed (2026-10-30).** A licensed dataset may declare a retention
end; authorisation is refused at or after it against the request clock, so a long-lived process cannot keep using
an expired licence. Report artifacts are written to content-addressed storage before the publication status flips:
an object-store outage leaves the report approved with no partial or stale artifact, and a later retry publishes
cleanly. Stored bytes are re-verified against their address on read; a tampered artifact raises rather than being
served. The local SQLite/filesystem adapters stand in for Postgres and an encrypted bucket; neither is deployed.

