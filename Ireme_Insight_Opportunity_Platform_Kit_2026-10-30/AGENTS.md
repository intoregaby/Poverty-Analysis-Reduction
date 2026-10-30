# Agent Operating Contract for the Ireme Insight Operational Platform

These instructions apply to every OpenCode coding agent, reviewer, automation or delegated sub-agent implementing the contents of this kit. Start from the **current live repository state**, not a static snapshot. The ZIP is advisory input; actual checked-out source is authoritative for current behavior.

## Task boundaries

- **Do not touch ongoing Ireme Insight AI Engine implementation** unless the technical owner explicitly requests an integration. It owns statistical inference, model validation, verification, research agents, certified claims and governed report release. Expose contracts; do not rebuild or simplify it.
- Backend is Supabase: Postgres, Auth, RLS, Storage, Edge Functions, Realtime where justified; use existing `memberApi.js` patterns, Vite env and React Query. An Edge Function cannot magically verify a bank transfer without a contracted provider.
- Government can see aggregate, approved, attributed financial and service statistics. It must **not** have unrestricted access to every beneficiary's transaction history, livelihood photo, bank identifier or household profile.
- No auto rejection of benefit entitlement, employment or loans by a risk score. Explainable recommendations and human decisions only.
- No mandatory financial-product enrollment that prevents a vulnerable member from accessing benefits when lawful alternatives exist. Document exceptions and assist those without phones or connectivity.
- De-duplicate records and payments using stable idempotency keys. Persist updates transactionally; never display success before a backend confirmation.
- Do not upload restricted EICV/FinScope respondent microdata to public buckets, to model providers or GitHub.

## Mandatory execution loop

1. Reconcile repo state: `git status --short`, `git branch --show-current`, read current code and docs; list existing routes/tables/functions/auth policies and established tests.
2. Make a file-level impact map before modifying code. For each capability assign `EXISTS`, `PARTIAL`, `MISSING`, `BLOCKED_EXTERNAL`, `DEMO_ONLY`. Do not assume absent based on file names alone.
3. Confirm live Supabase project identity; read schema, policies, current migrations, advisors. No destructive or production data writes without documented approval and a rollback plan.
4. Choose one coherent vertical slice. Produce SQL migration via installed Supabase CLI (`supabase migration new`, discover CLI help). Add RLS and a denial test alongside every new exposed table.
5. Implement Edge/API operations and typed response contracts; establish human approval, audit events and idempotency for sensitive commands.
6. Reuse current pages/components/visual tokens. Add loading, empty, error, unauthorized, retry, offline and demonstration states.
7. Test: unit, DB RLS cross-role, Edge/API, browser E2E, export, idempotency, accessibility, security. Run `npm ci`, `npm test`, `npm run lint`, `npm run build`, selected Python/engine tests **without changing the AI Engine**, and check hosted/sandbox behavior only when authorized.
8. Review with the domain, frontend, backend, security and QA agents. Fix high-severity defects and document any blockers.
9. Provide commit(s)/PR diff, affected files, SQL migration names, pass/fail commands, risk register, screenshots and exact remaining demonstration-only scope.

## Conflict controls

- Never overwrite user's `.env`, `.env.local`, secrets, real datasets or modified working tree.
- Never push destructive schema changes, mass email/SMS, actual disbursements, payroll or bank requests as test actions.
- Avoid replacing existing Supabase tables `members`, `agents`, `agent_assignments`, `visits`, `cooperatives`, `profiles`, `insurance_status`, `ussd_*`. Use forward-compatible migrations and adapters.
- Do not introduce a second role identity system; reconcile `profiles.role` and signed auth with `src/lib/roles.js`, `RoleGuard` and server checks. Demo identity NEVER authorizes production database access.
- Use explicit source/method/period/denominator in every national/district statistic; do not convert sample beneficiary counts into population coverage.
- Preserve English/Kinyarwanda support; make accessible plain language the default.
- If bank transfer / provider / SMS / government linkage is unavailable, implement typed `pending_integration` state and a **clearly labeled simulation** behind a demo flag. Never use success-shaped fake output.

## Definition of done

A feature counts as complete only if an authorized user can create and persist its objects, another authorized user can read/action them within their scope, an unauthorized user cannot, data survives refresh and another device, errors are handled, tests are green, and UI says what happened truthfully. A rendered button alone is not implementation.
