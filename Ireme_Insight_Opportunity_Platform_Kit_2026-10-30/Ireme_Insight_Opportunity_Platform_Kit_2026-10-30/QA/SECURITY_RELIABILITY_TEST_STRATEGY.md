# Test Strategy: Business Outcomes, Safety, End-to-End Reliability

## Core realistic demonstrator (fictional identities only)

A programme named 'VUP Direct Support (DEMO)' publishes an actual database vacancy for field business skills agent; an unemployed graduate applies; human evaluator verifies assessment and interviews; a valid paid contract is recorded; a supervisor assigns **one** opted-in fictional member; the agent teaches basic business operations and helps the member begin a small enterprise; member confirms the activity; agent attaches an optional illustrative photo or receipt; a different supervisor verifies the milestone; agent wage and support payment are shown first as `payable`, then as `simulated` **only**, unless a real provider and reconciliation exists; authorized government reviewer sees aggregated output with source labels. No fake records enter live statistical reporting.

## Verification layers

1. **Schema:** FK constraints, unique application/transfer event IDs, index usage, null/malformed checks, immutable verification decisions.
2. **RLS:** separate sessions for applicant, programme owner A/B, field agent A/B, member A/B, coop officer, district/sector/cell officer, government aggregate reviewer. Positive and negative assertions every table.
3. **Auth:** expired/forged token, no profile, stale demo identity, `raw_user_meta_data` role spoof, revoked membership, MFA gates for protected writes.
4. **Storage:** agent A cannot guess agent B private photo; path traversal, wrong mime, oversized file, missing consent, revoked access, signed URL expiry, EXIF removal from exports.
5. **Finance:** duplicate/out-of-order provider webhook, service timeout, mismatched beneficiary/amount/currency, wrong approval role, two-person control, reversed settlement and double-entry balancing.
6. **Workforce:** eligibility checks, skill assessment event, exam scheduling, interview updates, employment contract, wage audit and proper no-job/closed states.
7. **Field:** active assignment required, consent and non-photo evidence, member disputes, independent verifier, offline queued event idempotency and optimistic concurrency.
8. **Government:** scope by organisation/district, small-cell suppression, no raw bank details, clear published-vs-recorded-vs-demo distinction, accurate aggregated snapshots.
9. **USSD:** existing USSD simulator and callback unaffected, role-limited information, SMS status verifiable separately.
10. **Frontend:** route transitions maintain original layout, Kinyarwanda/English copy, mobile 320px, keyboard/contrast, pagination, loading/empty/error/retry states, charts comprehensible without hover.
11. **AI Engine regression:** read-only boundary and existing engine tests unchanged; an unverified research draft is never promoted to certified report from operational panel.
12. **CI/release:** test job green, migration tested on isolated DB, no untracked credentials, reproducible sample seed, rollback documented, actual provider claims verified.

## Negative test scenarios to automate

- Applicant B reads A's application via guessed UUID -> denied.
- Agent B sees A's member or evidence URL -> denied even if same district.
- Programme A finance reviewer approves own payment proposal -> denied.
- Non-owner unauthorised programme tries to see other funder's restricted agreement -> denied.
- Member submits bank PIN or OTP as referral -> validation rejects and does not log secret.
- Agent uploads a picture without sufficient consent -> document blocked or flagged for resolution, no automatic aid denial.
- Agent declares 'income increased' based only on photograph -> cannot mark independently verified financial outcome.
- Government officer requests person-level spending across country without mandate -> denied, aggregate-only alternative.
- Duplicate `provider_event_id` -> one successful receipt and no extra ledger posting.
- Provider never responds -> `pending`/`unknown` and reconciliation case, no 'Paid'.
- Programme owner turns budget scenario into actual payouts without human approval -> denied.
- Internet disconnect during visit submission -> queued, authenticated retry and exactly one resulting milestone.
- Source data has zero/missing denominator or incompatible periods -> chart warns; no invented percentage.
- All report exports filter demo statuses and redact identifying details.

## Performance targets to confirm empirically

Suggested engineering budgets, **not measured results**: p95 300 ms for indexed small user queries when network conditions allow; p95 1.5 s for typical dashboard aggregates with warm cache; p95 3 s for rendering programme case under normal network; clear progress and resumability for uploads; offline agent form fully usable without network after permitted local preload. Measure real Kigali devices/networks before release.

## Acceptance evidence format

For every test: `feature_id`, `scenario_id`, role, organization, geography, initial database fixtures, expected state, observed state, evidence logs/screenshots, current commit hash, environment, result (PASS/FAIL/BLOCKED_EXTERNAL/NOT_RUN), reviewer and date. Test counts must distinguish unit/component vs integrated/hosted production acceptance.
