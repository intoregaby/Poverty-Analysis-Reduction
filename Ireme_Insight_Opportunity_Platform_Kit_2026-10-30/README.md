# Ireme Insight — Opportunity, Delivery & Accountability Implementation Kit

**For:** OpenCode / Antigravity / engineering agents working on `intoregaby/Poverty-Analysis-Reduction`  
**Snapshot:** 30 October 2026, connected GitHub `main` tree `a9f02ba0a29dbac6827758e4255f3b350728d14c`  
**Target database:** existing Supabase project `ireme-program`, ref `ywtxpsefbqzmgmdfzldp` (READ-ONLY inspection during kit creation).  
**Status:** Complete implementation handoff and design specifications, **NOT installed application code**, **NOT applied database migrations**, **NOT payment-provider integrations**, **NOT a claim of production readiness**.

## Mission

A programme (for example **Vision Umurenge Programme, VUP**, not the erroneous 'VIP') supports eligible members and can also recruit paid field agents. Job seekers — especially secondary-school and university graduates without employment — apply, demonstrate skill and knowledge, receive supervised employment, help assigned members learn and **implement** a practical livelihood activity, and collect consented evidence of milestones. Members can use an accessible pathway to formal financial services, receive real programme transfers when provided through an approved financial institution, build verifiable records of business activity, and pursue other livelihood opportunities. Government and authorised funders see accountable, properly scoped programme finances, reach, agents, skills acquired and validated outcomes. NISR analysts supply population-level evidence, not automatic decisions about individuals.

This model creates **three mutually reinforcing benefits**: (1) youth employment as programme field agents, (2) household skills -> implemented livelihoods -> documented results, (3) optional accessible formal-finance onboarding and lawful payment disbursement. A fourth benefit is accountable programme governance and monitoring.

## Read order for the coding agent

1. `AGENTS.md` — non-negotiable rules, process, review roles.
2. `START_HERE/USER_VISION_AND_BOUNDARIES.md` — exact business logic and safety boundaries.
3. `START_HERE/CURRENT_STATE_AND_INTEGRATION.md` — what already exists, with code paths and verified Supabase inventory.
4. `PROMPTS/MASTER_OPENCODE_PROMPT.md` — paste into OpenCode from your checked-out repository.
5. `ARCHITECTURE/SUPABASE_BACKEND_AND_DOMAIN_MODEL.md`, `ARCHITECTURE/ACCESS_CONTROL_MATRIX.md`.
6. `FEATURES/` — full product requirements, acceptance cases, and backend/frontend mapping per feature.
7. `IMPLEMENTATION/BUILD_ORDER_AND_TICKETS.md`, `QA/ACCEPTANCE_MATRIX.csv`.
8. `DATABASE_DRAFTS/` — *illustrative additive* SQL requiring review and local test, not auto-apply migrations.

## Delivery boundaries

- **Preserve the current React/Vite app, routing, component conventions, charting, visual tokens, roles, and all working user journeys**; do not redesign or replace the app wholesale.
- **Do not modify AI Engine ownership** (`engine/ireme/**`, `tools/investigation/**`, governed scientific verification/reports) except an independently approved, backwards-compatible integration with a stable API contract. It is being developed separately.
- Extend the **existing active Supabase project** only after introspecting current schema, permissions, policies, migrations, function signatures, hosted configuration and legal authority.
- The pilot/demo and production must not be confused: no fake successful transfer, repayment, loan approval, job placement, agent wage, household income, or government audit result.
- This ZIP is a build plan, not a signed-off legal or scientific determination.

## Core deliverables to build (not already delivered in this ZIP)

1. Persistent organisation/programme, enrollment, eligibility referral, jobs, applications, assessment, recruitment and paid-agent onboarding.
2. Assignment -> training -> practical business activity -> evidence -> independent verification -> outcome monitoring.
3. Financial inclusion assistance and provider referrals (bank/mobile money), not compulsory financial surveillance or automatic lending.
4. Programme budgets, funding sources, commitments, agent payroll obligations, payouts, reconciliation and audit-ready government aggregates.
5. Cooperative savings, recordkeeping and voluntary farmer/household economic activity reporting.
6. Social-support allocation scenarios and programme impact monitoring with explicit assumptions.
7. Integration of the current dashboard, government, field-agent, beneficiary, cooperative and USSD user flows.

## Folder guide

- `START_HERE/`: definitions, business model, non-negotiable system scope.
- `AGENTS.md`, `AGENT_ROLES/`: autonomous agent contract, specialist roles, work review gates.
- `FEATURES/`: specifications with user stories, states, rules, UI, API, quality.
- `ARCHITECTURE/`: integration, entities, Supabase RLS and privacy, financial ledger.
- `DATABASE_DRAFTS/`: additive SQL models for agent review; intentionally not a migration.
- `API_CONTRACTS/`: endpoint/request/response behavior and error semantics.
- `UX/`: design fidelity, workflows, language and accessibility.
- `IMPLEMENTATION/`: phases, ticket backlog, testable definition of done.
- `QA/`: verification matrix and adversarial tests.
- `PROMPTS/`: master and phase-specific coding-agent instructions.
- `REFERENCES/`: the prior project and competitor materials, unchanged where applicable.

## External documentation checked

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage permissions: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Edge Function authentication: https://supabase.com/docs/guides/functions/auth
- Supabase Edge secrets: https://supabase.com/docs/guides/functions/secrets
- Rwanda data protection framework: https://dpo.gov.rw/about-us/who-we-are

**No hosted data was changed when preparing this kit.**
