# Financial Ledger and Reconciliation Tests (to implement)

**The SQL draft defines ledger *structures*, not complete accounting enforcement.** All production postings need a single transactional function that locks the journal, validates role, balances debits and credits, sets `posted`, records audit event, and becomes immutable. Check currency handling, refunds, reversals, refunds and partial settlements.

## Required invariant set

- For each posted journal, `sum(debit.amount) = sum(credit.amount)` for one specified currency; no mixed-currency balancing in same journal.
- When provider webhook for event `E` is processed twice, ledger transaction count and settled totals remain unchanged.
- An idempotency key cannot be reused with different recipient, amount, account or payload hash.
- Provider success is an external **reconciled** event; the programme cannot set status to `settled` from the browser.
- Agent payroll obligations do not mingle with member-benefit transfers, even when paid by the same provider.
- Fund source and restricted-use agreement remain traceable to every approved expenditure; authorization cannot exceed approved budget without override and audit.
- Failure/timeout produce `pending`/`unknown` statuses with reconciliation queue. Never assume failure/settlement if status unknown.
- Duplicate members across programmes do not auto-disqualify support; overlapping payments surfaced to authorised reviewer only.

## Required bank-provider contract checks

Verify partner legal/regulatory eligibility, API schema, production credential policy, webhook authenticity (HMAC/signature, replay threshold and event ID), rate limits, provider-reference uniqueness, partial settlements, provider reconciliation files, dispute flows, reversals, outage handling, bank/MSISDN validation and audit retention. Until then provider-adapter returns `NOT_CONFIGURED` and a clear demo banner.
