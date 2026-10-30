# 06 Cooperatives Savings And Farmer Records

**Outcome:** Convert existing cooperatives into usable voluntary savings-group and economic-activity operations while retaining current membership/elections/announcements.

**Primary actors:** cooperative leader, treasurer, member, programme specialist, supervised lender partner

## Required user workflow

1. Use current cooperative membership and elections to authorise ledger managers.
2. Treasurer records contribution request, received payment (provider-confirmed or explicitly manual/unverified), group expenses and repayments with receipt.
3. Member sees their own contribution and share of cooperative obligations, requests correction, and opts in to sharing business diary.
4. Cooperative runs meetings, training and farm/enterprise record updates, with verified market and cost entries if voluntarily supplied.
5. Optional financial records can be packaged with explicit member consent and expiry for a lending consultation; share never equals eligibility.

## State machine

`contribution due -> recorded_unverified -> confirmed/reconciled -> corrected; group loan requested -> human reviewed -> approved/declined -> disbursed -> repaying/closed (only if lawful)`

## Existing UI and proposed extension

Extend CooperativePanel, Cooperatives, member SpaceTab; show balances, contribution timeline, reconciliation badges, permission-aware members list.

## Supabase entities and interfaces

cooperative_financial_entries, cooperative_accounts, contribution_schedules, reconciliation_events, financial_diaries, share_consents.

## Hard business and security rules

- The platform is not a bank, lender or insured deposit institution by virtue of logging group savings.
- Use append-only corrections, dual approval for larger payouts, receipts, group-authorised roles and no unverified 'paid' badge.
- Do not read unrelated bank transactions or treat manually entered diaries as provider verified.
- Coop fund balance must reconcile with supported record sources.

## Feature acceptance tests

- [ ] Authorized treasurer records a contribution, member sees correct pending/verified status.
- [ ] Duplicate entry is detected, and correction adds an audit event.
- [ ] Member A cannot view member B's private diary.
- [ ] Existing cooperative elections and joining continue to work.

## Required implementation artifacts

- Git diff and UI screenshots for desktop/tablet/mobile.
- API/Edge contract with unauthorized/failure responses.
- Migration and RLS positive+negative tests.
- Idempotency/retry and audit behavior if money or evidence is handled.
- Demonstration vs production labeling and provider/blocker status.
