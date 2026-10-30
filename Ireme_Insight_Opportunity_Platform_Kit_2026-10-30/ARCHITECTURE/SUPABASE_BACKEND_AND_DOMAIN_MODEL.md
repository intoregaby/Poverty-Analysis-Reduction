# Supabase Architecture — Additive Domain Model

## Runtime topology

```
React/Vite SPA (existing router, UI, TanStack Query)
    | Supabase publishable browser key, Supabase Auth session
    v
Supabase PostgREST (RLS for safe reads) <-> Postgres normalized OLTP tables
    |                                 |                              -> private Storage (signed, authorized evidence access)
    +-> Edge Functions (validated write commands, provider callbacks, notifications)
    +-> Realtime (scoped changes: applications, tasks, payment status, job slots)
    +-> Cron / Queues (durable reminders, reconciliation, report refresh where justified)
         -> AI Engine (separate Python service; verified aggregate reference only, no direct raw household dump)
```

## Design boundaries

- `public.members`, `public.agents`, `public.agent_assignments`, `public.visits`, `public.cooperatives` are existing. Treat as canonical where possible, mapping to new domain tables by verified foreign keys.
- Add `programme_organizations` + `programme_catalog` + `programme_org_memberships` to represent organization and programme scope; one programme may have several geographical project cycles and funders.
- Add `programme_enrollments` and `programme_member_support_plans` for lifecycle, with explicit casework ownership and approved eligibility rules.
- Add `agent_job_postings`, `agent_job_applications`, `applicant_competencies`, `candidate_assessments`, `agent_contracts`, `agent_training`, `agent_work_assignments` for paid youth employment, lawful age/qualifications, supervisor controls, scope isolation and workload.
- Add `household_skill_assessments`, `training_events`, `practical_livelihood_projects`, `livelihood_milestones`, `project_evidence`, `outcome_observations`, `verification_decisions` for the teach -> implement -> verify chain.
- Add `financial_access_referrals` for bank / mobile money assistance, provider consent and status. Store only masked identifiers; never store user PIN or banking credentials. Distinguish `interested`, `referred`, `submitted_to_provider`, `provider_confirmed`, `declined`, `withdrawn`, `unknown`.
- Add `funding_agreements`, `funding_tranches`, `programme_budgets`, `programme_financial_obligations`, `ledger_transactions`, `ledger_entries`, `payment_instructions`, `provider_events`, `reconciliation_cases`, `agent_payroll_runs` for externally sourced financial accountability.
- Add `cooperative_financial_entries`, `financial_diaries`, `lender_share_consents`, `credit_referrals` as voluntary records separated from public statistical aggregates.
- Add `operational_action_requests`, `support_cases`, `case_updates`, `audit_events` for cross-panel coordination. Ensure the current `src/lib/actionRequests.js` contract is migrated incrementally.
- Add `analytics_source_snapshots` / `reporting_dataset_versions` metadata to join operational reports to known-as-of timestamps and approved aggregated NISR evidence, never merge personal rows into public NISR estimates.

## Strict integrity rules

- `organization_id`, `programme_id`, `member_id`, `agent_id`, `district_id/sector_id/cell_id` are explicit references; don't infer authorization from display names.
- Human-readable geography codes need canonical government codes and effective dates; district names alone are not stable keys.
- Job application: one applicant per posting unless resubmission is explicitly allowed; status transition history immutable and auditable.
- Agent assignment: cannot be active for a member outside allowed programme/geography, cannot conflict across incompatible assignments, and must respect workload and consent constraints.
- Training and practice: an attended session is evidence of attendance only; competency evidence and field implementation must be separately verified.
- Photo metadata (subject consent, upload actor, date, project/milestone, integrity hash, optional coarse location, review) is separate from actual media in private storage; remove geolocation EXIF from public/exported copies.
- Funding: distinguish source donor/investor and legal funding type; never combine restricted funds or expose all organisation investments to unrelated institutions.
- Payment instruction: unique client idempotency key per programme/recipient/period/provider request; retried webhooks cannot increment paid totals.
- Verified settlement: only provider-authoritative success event with referenced transaction and reconciliation can mark `settled`.
- Agent wage: separate payable liability from social-support benefit and administrative expenses. Payroll approval and settlement are distinct.
- Audit logs must be append-only; never edit old payment or compliance events, issue compensating events.

## Transaction strategy

- Multi-table transitions belong in a DB transaction or scoped server-side Edge Function calling a narrowly permitted SQL procedure.
- Avoid unrestricted service secret use. Each privileged operation authenticates the caller, retrieves trusted organization membership and scope from DB, checks workflow rules, writes transaction+audit, returns typed response. Bank webhooks verify provider authenticity and event identity independently.
- RLS authorizes ALL reads/writes reachable from browsers; only permitted aggregate/public views are exposed.
- For sensitive financial commands (approval, settlement, payroll), use workflow-specific permissions, MFA where applicable, separation of duties and dual-control when appropriate.
- Offline visit evidence is stored encrypted in local storage only where technically necessary, with expiration and privacy review; sync through authenticated queue, idempotent event IDs and conflict reconciliation rather than blindly keeping latest.

## Infrastructure performance

- Supabase is the central operational backend, but speed requires query optimization, not merely using the product: indexes on `org_id, programme_id, status, created_at`, on geographic/time keys, narrow selects, pagination, scoped realtime filters, computed summary tables/materialized aggregates when justified, and measured latency budgets.
- Use batch member summaries rather than N+1 per-member reads; avoid unbounded `select('*')` on household records.
- Separate OLTP transactions from expensive survey analytics; route heavy statistical work to the existing AI Engine and cache only approved aggregate products.
- Set alerting for failed webhooks, stuck payments, evidence upload errors, RLS denied spikes, and slow reports; keep secrets and PII out of telemetry.

## Recommended rollout

Create schema and policies in isolated/local environment; migrate one workflow at a time (jobs -> enrollment/assignments -> training -> finance -> reporting), ship behind feature flags, maintain demo and governed-production profiles, rehearse rollback and recheck live RLS before deploying.
