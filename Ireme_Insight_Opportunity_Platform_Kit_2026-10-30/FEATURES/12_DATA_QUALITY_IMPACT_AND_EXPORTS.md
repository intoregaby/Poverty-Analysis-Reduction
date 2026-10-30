# 12 Data Quality Impact And Exports

**Outcome:** Measure verified operational outputs responsibly and make reports useful to human decision makers without duplicating governed statistical reporting.

**Primary actors:** government reviewer; NISR analyst; programme owner; funder

## Required user workflow

1. Choose sources, period, geography, organization, and classification (observed/admin/demo/modelled).
2. Calculate employment outcomes (posted/hired/active/paid), skill outcomes (trained/demonstrated), implementation outcomes (started/verified/operational), financial access referrals, transfer settlements and unresolved cases.
3. Expose denominator/source, freshness, missing-data count and limitations for each KPI.
4. Generate HTML/PDF/CSV/XLSX operational reports with charts where useful and a transparent definitions appendix.
5. For NISR statistical or certified scientific claims, request AI Engine release via governed API rather than constructing independent automatic publications.

## State machine

`source staging -> reconciled -> approved aggregate -> draft report -> reviewed -> restricted/shareable as permitted`

## Existing UI and proposed extension

Upgrade Programme Results and selected dashboard exports; summary first, chart second, source note third; make exports understandable to ministers and citizens.

## Supabase entities and interfaces

reporting_snapshots, metric_definitions, evidence_status, derived aggregates, export_records, signed report links.

## Hard business and security rules

- Report 'number of confirmed income improvements' only where repeated comparably measured outcome data exist; never infer from one photo.
- Never expose small-cell personal details through filters or export.
- Export metadata includes data_as_of, numerator/denominator, source, status and filter list.
- No CSV injection and no persistent public links to private case evidence.

## Feature acceptance tests

- [ ] A chart and its exported table share same underlying figures and filters.
- [ ] Demo records do not appear in certified finance or poverty claims.
- [ ] Conflicting data raise source mismatch warning.
- [ ] Report by date and programme is reproducible and redaction tested.

## Required implementation artifacts

- Git diff and UI screenshots for desktop/tablet/mobile.
- API/Edge contract with unauthorized/failure responses.
- Migration and RLS positive+negative tests.
- Idempotency/retry and audit behavior if money or evidence is handled.
- Demonstration vs production labeling and provider/blocker status.
