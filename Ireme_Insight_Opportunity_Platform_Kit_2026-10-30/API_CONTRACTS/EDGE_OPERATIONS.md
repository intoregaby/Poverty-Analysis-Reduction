# Supabase Edge Operations — Contract Proposals (not deployed)

Use current Supabase Auth and organization-scoped permissions. These are *operation contracts*, not claims that endpoints exist. Use server-side typed validation, request ID, predictable error codes, `source_type`, audit event ID, and concurrency control. Prefer existing `PostgREST` for scoped simple reads and small updates where RLS is sufficient; use Edge Functions / narrow SQL procedures for complex sensitive writes.

## Standard envelope

```
request headers: Authorization: Bearer <user JWT>; Idempotency-Key: <client-generated UUID> for command writes
success: {ok: true, data: {...}, source_status: 'confirmed'|'recorded'|'pending_review'|'simulation', audit_id: UUID}
error: {ok: false, error: {code: 'FORBIDDEN'|'VALIDATION'|'CONFLICT'|'PROVIDER_UNAVAILABLE'|'NOT_VERIFIED'|'INTEGRITY', message, retryable}, request_id}
```

## Proposed contracts

| Operation | Input | Server verification | Output |
| --- | --- | --- | --- |
| `job-post-publish` | posting ID, expected version | owner-of-org, approved rubric, valid deadline | published posting & audit |
| `agent-apply` | posting ID, competency summary | verified applicant, rate limits, no duplicate, age/work rules flagged for human review | application receipt |
| `agent-assess` | application ID, rubric scores, evidence refs, decision | authorised assessor + conflict check, human decision | assessment result with reason |
| `agent-hire` | application ID, contract reference, signed human approval | actual contract, role, scope, legal eligibility/induction | agent employment record; **not yet paid** |
| `assign-member-work` | agent/member IDs, programme, task, capacity | active contract, org, geography, current assignment, consent | assignment+notification |
| `record-practical-milestone` | project ID, type, dates, submitted event ID, evidence IDs | same agent assignment, valid consent, storage ownership | submitted milestone, not yet verified |
| `verify-practical-milestone` | milestone ID, decision, notes | separate approved supervisor, no self-approval | verified/rejected milestone |
| `referral-request` | member, provider ID, consent scope | valid legal basis, allowed provider, agent/member auth | referral pending; not provider verified |
| `funding-obligation-approve` | obligation ID, reviewer signature | true financial role, separation of duties | authorised payable |
| `payment-initiate` | approved payable ID, idempotency | lawful regulated integration configured, valid recipient/provider | submitted/queued, never settled by itself |
| `payment-webhook` | signed provider event | provider signature, replay window, event ID, origin, amount/currency/reference | provider event recorded and reconciliation triggered |
| `case-progress` | case ID, transition, note | org+district+assignee authorization, state machine | durable transition |
| `government-summary` | org(s), area(s), time window | explicit statutory/contractual purpose, aggregate suppression | approved typed summary |
| `evidence-signed-read` | evidence ID, purpose | case association, role/area, approval, retention | short-lived read token, audited |

## Financial webhook contract

Provider success after capture must not be assumed. A signed event may be `accepted`, `pending`, `failed`, `settled` or `reversed` depending on actual provider vocabulary. Map provider-native state in a dedicated tested adapter. Store original provider event in restricted private audit store if permitted; never trust client-submitted `settled=true`. Duplicate and out-of-order events must not double-post ledger entries.

## External service dependencies

- Bank/mobile-money rail and actual loan referral provider: **NOT CONNECTED**, requires business onboarding and provider contract.
- SMS provider: existing outbox and USSD integration may be reused; delivery receipts and quotas must be verified.
- Government/funder APIs: **NOT ASSUMED**; external reports need signed import/reconciliation or explicit manual verified entry.
- AI Engine: use independently approved aggregate evidence API; do not invoke ungoverned LLM for payment, hiring, benefit or published statistical decision.
