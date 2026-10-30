# Phased Engineering Plan and Prioritised Tickets

**Do not reduce the long-term platform ambition to an MVP.** Build in safe, reviewable phases with a complete target architecture; partial progress is openly marked.

## Release ordering

### Phase 0 — Verify, stabilize and secure existing system

- OPS-001 [BLOCKER] Check out latest repo, pin commit and record baseline tests/CI; inspect existing Supabase policies/functions, migration lineage, tenant scoping and RLS advisor warnings.
- OPS-002 [BLOCKER] Fix trusted identity mapping: avoid `useRole()` returning `nisr_analyst` for arbitrary signed-in users; keep separate, clearly labelled demo sign-ins.
- OPS-003 [BLOCKER] Implement unified database and event ownership plan for programme operations; identify sample/demo sources and disallow silent success in production.
- OPS-004 [BLOCKER] Create local sandbox, forward migrations and test harness. Do not apply drafts to hosted project automatically.
- OPS-005 [SECURITY] Review 11 callable privileged RPC warnings and disabled leaked-password protection; test each existing function rather than revoking indiscriminately.

### Phase 1 — Paid jobs and valid programme setup

- OPS-101 Create programme organisation and memberships, programme types, authorised areas and enrolment records.
- OPS-102 Make job posts durable and published only after approval; preserve `JobsTab` and `/jobs` layout.
- OPS-103 Applicant education/competency profile, skills evidence, application receipt and status, fair human review.
- OPS-104 Practical assessment and interview scheduling; human hiring, documented reason, signed contracts/induction.
- OPS-105 Agent employment and payroll obligation records; **payments not settled without provider**.

### Phase 2 — Field assignment, training and real implementation

- OPS-201 Integrate existing agent assignments/visits with programme, capacity and area scope; avoid duplication.
- OPS-202 Household/skills baseline, training plan and taught/demonstrated competency tracking.
- OPS-203 Practical livelihood project plans, resources, costs, member consent and milestones.
- OPS-204 Secure optional photo/receipt evidence and supervisor review with immutable audit and independent sign-off.
- OPS-205 Offline/low-connectivity sync and accessible agent mobile layout; test retries and lost network.
- OPS-206 Measurable follow-up (income self-report vs verified documentary values) and case outcomes.

### Phase 3 — Financial inclusion and financial accountability

- OPS-301 Assisted bank/MoMo financial education, consent, referral, provider acknowledgement, accessible alternatives.
- OPS-302 Funding agreement/investment type, budget, programme source restriction, agent wages and member support obligations.
- OPS-303 Balanced immutable internal ledger, authorization, provider events, reconciliation, idempotency and failure handling.
- OPS-304 Real payment rail integration only after licensed partner contracts; until then disable real disbursement and label simulation.
- OPS-305 Agent wage and member benefit pages use true payment states; beneficiary access update.

### Phase 4 — Cooperatives, income generation and opportunities

- OPS-401 Connect current cooperative data to group savings, contributions, repayments and controlled role permissions.
- OPS-402 Voluntary farmer/business diaries with export, consent-controlled lender sharing and explanatory arithmetic.
- OPS-403 Savings/resilience planning and shock what-if calculators with honest assumptions and restrictions.
- OPS-404 Real training/job/cooperative matching from proven competencies, open vacancies and referrals.

### Phase 5 — Policy and government oversight

- OPS-501 Aggregate programme funding and expenditures with source/period/verification labels and small-cell protections.
- OPS-502 Allocation Lab with reproducible policy-weight and budget comparisons on approved aggregate inputs.
- OPS-503 Replace browser-only actionRequests with cross-user Supabase workflow and audit trail.
- OPS-504 Publish government district/national operational dashboards without household financial surveillance.
- OPS-505 Exports: PDF/XLSX/CSV/HTML with charts where useful, denominators, provenance and source flags.
- OPS-506 Connect bounded AI Engine evidence outputs to action request IDs, without modifying its report release policy.

### Phase 6 — Operational hardening and demonstrable impact

- OPS-601 Accessibility and Kinyarwanda/English localization review for all new components.
- OPS-602 RLS adversarial matrix, distinct user integration tests, regression, failure and replay tests.
- OPS-603 Load test Supabase index/query plans, realtime authorization, Storage upload and data retention.
- OPS-604 Full two-device demonstration: job apply -> hire -> assignment -> training -> implemented livelihood -> supervisor review -> finance status -> government report.
- OPS-605 Monitoring, backups/restore rehearsal, test-only seed vs production segregation, security sign-off, launch runbook.

## Feature dependency graph

```
P0 security + existing schema
    -> programme ownership -> jobs/applications -> agent contracts
    -> member assignments -> training -> practical projects -> evidence review -> outcomes
    -> finance obligations -> provider processing -> reconciliation -> government reporting
    -> bank/MoMo referrals and cooperative records, integrated throughout
    -> allocation scenarios -> audited action requests -> evaluation
```

## Ticket definition-of-done fields

For each OPS ticket include: user and role; data source classification; affected component paths; existing DB tables reused; required migration; RLS read/write rules; Edge operations; feature flag; localization; errors; happy and denial test; privacy constraints; deployment/rollback; evidence link. Each ticket must be independently mergeable without disabling old functionality.

## Status contract

`NOT_STARTED`, `IN_PROGRESS`, `CODE_COMPLETE`, `TESTED_LOCAL`, `TESTED_HOSTED`, `BLOCKED_EXTERNAL`, `REVIEWED`, `RELEASED`. No `RELEASED` before live workflow verifies its dependencies; AI Engine work retains its own status ownership.
