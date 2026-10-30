# 05 Finance Funding Ledger And Government

**Outcome:** Enable government and approved funders to account for donations/investments, programme budgets, member support, agent wages and actual validated transfers.

**Primary actors:** funder; programme CFO; paymaster; finance reviewer; government auditor; district officer; member and agent in own account

## Required user workflow

1. Register source agreement: organization/investor, type grant/investment/loan, restrictions, dates, allocated programmes and approved signatures.
2. Create budget lines for benefits, agent wages, training, materials and administration; approval and change controls.
3. Create programme member payment instruction or agent payroll payable; require verified recipient, two-person control and idempotency.
4. Send using approved provider only after contractual/API integration. Capture authoritative provider callbacks and reconcile with ledger.
5. Record failed/reversed/refunded/unmatched events and create resolution cases.
6. Display government summary by approved scope: received, budgeted, obligated, sent, settled, failed, outstanding, agent payroll and interventions, by district and period.
7. Export audited, source-labelled summaries and supporting documents according to mandate.

## State machine

`funding proposed -> contracted -> received/rejected; payable drafted -> approved -> submitted -> acknowledged -> settled/failed/reversed/disputed; reconciliation open -> resolved`

## Existing UI and proposed extension

Enhance PaymentsTab and Programme Results; government Funding & Delivery subsection (summary, audit drill-down), member payment list and agent wage page.

## Supabase entities and interfaces

funding_agreements, funding_tranches, budget_lines, payment_instructions, provider_events, reconciliation_cases, ledger_transactions, ledger_entries, agent_payroll_runs, auditable views.

## Hard business and security rules

- No fake payment success; disabled live payment action until provider authorization exists.
- Reconcile provider reference and amount/currency/beneficiary; retry webhooks idempotently.
- Balance real double-entry journals; budgets and authorizations are separate from settled cash movements.
- Government access is lawful, organization/geography-scoped and aggregate by default; financial agreements have contractual disclosure rules.
- Never claim all downstream household cash spending can be tracked.

## Feature acceptance tests

- [ ] Sample ledger totals reconcile; duplicate provider event posts only once.
- [ ] A failed provider transfer remains failed and can be retried without duplicate settlement.
- [ ] An unrelated organisation cannot access funder contracts or individual member payments.
- [ ] Government report separates money committed, sent and settled and labels missing external visibility.

## Required implementation artifacts

- Git diff and UI screenshots for desktop/tablet/mobile.
- API/Edge contract with unauthorized/failure responses.
- Migration and RLS positive+negative tests.
- Idempotency/retry and audit behavior if money or evidence is handled.
- Demonstration vs production labeling and provider/blocker status.
