# 10 Government Funding Operations And Policy

**Outcome:** Give lawful government oversight of multi-organisation programmes, audited funding, employment, skill delivery, inclusion and action plans across provinces/districts.

**Primary actors:** national authorized oversight officer; district/sector/cell lead; NISR analyst; approved auditor

## Required user workflow

1. Choose area, period and programmes for which user has explicit oversight mandate.
2. See source-attributed government programme budget vs verified transfers (member support, payroll, operational investment) with unread/unreconciled flags.
3. View live programme progress: agent jobs, active assignments, training attendance, verified projects, open issues, verified member transfers.
4. Connect NISR published poverty/inclusion aggregate with programme operational aggregate; show incomparable data periods separately.
5. Commission action request, route to accountable programme owner, and monitor response and follow-up with audit trail.
6. Export redacted, provenance-rich reports and record who accessed them.

## State machine

`report draft -> scope_approved -> available; case open -> assigned -> in_progress -> resolved/appealed; publication remains AI Engine owned`

## Existing UI and proposed extension

Extend GovernmentPanel tabs and Programme Evidence; KPI cards, transparent source labels, operational map and timeline; keep Stripe-like minimal cards.

## Supabase entities and interfaces

government_authorizations, programme_reporting_snapshots, scoped financial aggregates, auditable case actions, report metadata.

## Hard business and security rules

- No single global dashboard of all personally identifiable financial transfers unless authority separately established.
- No conflating sample operational member counts with district poverty rates.
- Finance drilldowns show approved transaction metadata, redaction and access logs; never bank PINs or borrower documents.
- Official publication/claims are governed by AI Engine; operational report is clearly labelled.

## Feature acceptance tests

- [ ] District officer sees only district-authorized programmes and correct funds statuses.
- [ ] National analyst can request programme action without issuing payments.
- [ ] Government report shows sources, period, reconciliation and missing data flags.
- [ ] Two organisations' confidential investment agreements do not leak across user scopes.

## Required implementation artifacts

- Git diff and UI screenshots for desktop/tablet/mobile.
- API/Edge contract with unauthorized/failure responses.
- Migration and RLS positive+negative tests.
- Idempotency/retry and audit behavior if money or evidence is handled.
- Demonstration vs production labeling and provider/blocker status.
