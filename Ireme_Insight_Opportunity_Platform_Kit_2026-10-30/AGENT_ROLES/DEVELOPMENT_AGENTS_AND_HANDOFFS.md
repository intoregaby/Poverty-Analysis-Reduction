# Coding-Agent Roles, Responsibilities and Handoffs

The following are **software development agents** assisting OpenCode, not platform users. Delegate narrowly to avoid simultaneous edits in the same files. A single orchestrator makes final integration decisions.

| Coding-agent role | Owns | Required evidence | Must not do |
| --- | --- | --- | --- |
| 1. Lead/Orchestrator | dependency graph, change scopes, approvals, versioned rollout | step-by-step plan, integration diff, blockers | rewrite ongoing AI Engine |
| 2. Product/Domain Analyst | VUP/member/agent/funder workflows, terms, edge cases | state charts, definitions, acceptance stories | invent eligibility law or programme rules |
| 3. Supabase Schema Engineer | additive schema, migrations, data integrity | ERD, migrations, rollback, query explain, constraints | drop existing tables or auto-migrate prod |
| 4. Supabase Security Engineer | RLS, Auth scope, storage policies, signed callbacks | negative cross-role tests, privilege diff, advisors | use `security definer` as shortcut |
| 5. Frontend UX Engineer | extend Stripe-like UI conventions | component reuse map, keyboard/mobile QA, screenshots | replace app theme or routing system |
| 6. Agent Employment Engineer | recruitment, assessments, job contracts, wage ledger interfaces | application lifecycle E2E, employer authorization | fabricate job offers or wages |
| 7. Field Operations Engineer | assignments, training, implementations, consented evidence | offline/retry tests, task and photo proof checks | treat photo as proof of income |
| 8. Financial Operations Engineer | budget, obligation, transfer integration/reconciliation | double-entry checks, webhook idempotency, audit ledger | mark provider transfer settled without confirmation |
| 9. Financial Inclusion/Cooperative Engineer | accessibility, referrals, savings/loans records | opt-in/consent checks, loan referral review, ledger reconciliation | promise loan approval or silently pull bank history |
| 10. Analyst/Government Reporting Engineer | aggregated approved reports and role-scoped oversight | source/period/denominator, redaction, export tests | access raw personal finance beyond mandate |
| 11. Test/Release Engineer | unit, SQL/RLS, E2E, CI, load, recovery | pass logs, failure reproduction, rollback rehearsal | call component-only tests end-to-end acceptance |
| 12. Privacy/Legal/Safeguarding Reviewer | sensitive datasets, livelihood evidence, workforce eligibility | retention/consent assessment, lawful basis checklist | authorize data processing without actual human approval |

## Work handoff protocol

- Every ticket receives an ID, ownership, spec path, architecture decisions, file list, migrations, tests, acceptance evidence and rollback.
- Frontend and backend agree on API contract before either changes data structures.
- Security agent reviews BEFORE any privilege change, personally sensitive storage or transfer logic is merged.
- Finance agent and security agent jointly review any payment or loan-related state transition.
- Product agent validates that `training_done`, `activity_implemented`, `income_self_reported`, and `income_verified` remain separate states.
- Reviewer must record **PASS / FAIL / BLOCKED** by acceptance ID. If blocked, state exactly what provider/legal/data dependency is missing.

## Quality gates by ticket

**Gate A — discovery:** current source and schema inspected, no duplication.  
**Gate B — design:** permission map, user story, data model, UI reuse and error states approved.  
**Gate C — implementation:** additive migration, safe mutation, audit log and retries.  
**Gate D — verification:** RLS positive+negative tests, E2E case, browser responsive view, financial correctness.  
**Gate E — release:** schema verified against hosted state where authorized, monitoring and rollback available, demonstration-only truth labels intact.

## Report format per engineering agent

```
Ticket: OPS-###
Scope and source SHA:
Existing components reused:
Files changed:
Schema / RLS / Edge changes:
Security and privacy considerations:
Tests and exact pass/fail:
Screenshots / API evidence:
External blockers:
Rollback:
Next handoff:
```
