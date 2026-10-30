# Verified Current-State Integration Map (30 Oct 2026)

## Repository observation

- Source: connected `intoregaby/Poverty-Analysis-Reduction` `main`; Git tree SHA `a9f02ba0a29dbac6827758e4255f3b350728d14c` at audit.
- Stack: React/Vite, React Router, TanStack React Query, Tailwind, Recharts, Supabase browser client (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). Existing JS/JSX, not a Next.js app.
- Relevant UI: `src/App.jsx`; `src/lib/roles.js`; `src/components/layout/{RoleGuard,DashboardShell,Sidebar}.jsx`; `src/pages/{ProgrammeManagement,GovernmentPanel,AgentDashboard,BeneficiaryAccess,FinancialMap,JobApplicant,CooperativePanel,Cooperatives,UssdControl,UssdSimulator}.jsx`.
- Programme tabs: `src/components/programme/{OverviewTab,AgentsTab,BeneficiariesTab,JobsTab,PaymentsTab,SkillsTab,RequestsTab,CooperativesTab}.jsx`.
- Database-access library: `src/lib/memberApi.js`, `supabaseClient.js`. Some member/insurance/cooperative functions already query real Supabase; maintain those contracts.
- Current sample/browser-only operations: `src/data/programme.js` seeded 360-agent/member ecosystem; `src/data/programmeDelivery.js` sample outcomes; `src/lib/actionRequests.js` `localStorage`; `src/lib/cooperatives.js` browser-local sample state; `src/pages/AgentDashboard.jsx` hardcoded visits; `src/pages/BeneficiaryAccess.jsx` fixed history; `src/pages/JobApplicant.jsx` example positions. These must not be mistaken for persisted operations.
- Existing USSD: `supabase/functions/ussd`, `src/pages/UssdSimulator.jsx`; preserve existing authorization and session logic.
- AI Engine: `engine/ireme/**`, `tools/investigation/**` and `src/pages/DistrictInvestigation.jsx` are **actively under separate construction**; do not mark them missing or rewrite their backend. Use existing evidence/action APIs via a negotiated read-only contract.

## Verified hosted Supabase state — read-only metadata

- `ireme-program` project `ywtxpsefbqzmgmdfzldp` is currently active. Region `eu-central-1`. It is the intended project per prior repository mapping; agent must reconfirm env and project before writes.
- Existing public tables include:
  `profiles`, `members`, `family_members`, `member_services`, `cooperatives`, `cooperative_memberships`, `elections`, `candidates`, `votes`, `announcements`, `meetings`, `agents`, `agent_applications`, `agent_assignments`, `visits`, `insurance_rates`, `insurance_status`, `notifications`, `sms_outbox`, `ussd_sessions`, `ussd_events`, `ussd_blocked_numbers`, `admin_audit_log`.
- Read-only inspection found RLS enabled for all above tables, but that does NOT validate policies against IDOR or all edge cases.
- Edge Function present: `ussd` (active; `verify_jwt: false`, consistent with a provider callback design; therefore ensure provider authentication and signed request validation in handler).
- Hosted migrations already include `core_schema`, `functions_votes_assignment_ussd_admin`, `coop_directory_limited_fields`, `election_candidates_names`, `programme_owner_reads_own_programme`, `ussd_support`, `members_language`, `ussd_effective_status`, `fail_closed_assignment_authorization`.
- Security advisor currently reports 11 authenticated-callable `SECURITY DEFINER` RPCs and disabled leaked-password protection. These are **review findings**, not proof of exploitation; review function-body authorization and explicit grants before changing any existing RPC.

## Integration strategy

1. Extend with organization/programme, employment, training, livelihood outcomes, finance and evidence entities. Do not drop/rename existing tables.
2. Start with adapters and foreign keys to existing `public.members.id`, `public.agents.id`, `public.cooperatives.id`, `public.profiles.id`.
3. Track human roles with scoped organization/area memberships; never treat visible `role` value from a browser demo session as permission.
4. Map existing samples to a seeded demo environment, never production reports.
5. Keep existing routes and navigation names; add small tab/subpage groups rather than a new duplicated panel for every feature.
6. Add compatible data hooks under `src/lib/` using React Query; replace data sources gradually behind configuration and preserve current demo fallback only as clearly labelled.
7. Do not copy the SQL drafts to `supabase/migrations` verbatim. Inspect and reconcile real schema first; generate forward-only migrations with installed CLI.

## Known code-first review targets

| File | Observation | Required action |
| --- | --- | --- |
| `src/lib/DemoAuthContext.jsx` | signed-in users may fall back to `nisr_analyst` in UI | resolve role from trusted profile and deny on error |
| `src/components/programme/PaymentsTab.jsx` | click changes local success state, no provider-confirmed payment | transaction workflow with real recorded state |
| `src/components/programme/JobsTab.jsx` | job creation UI not persisted | job CRUD, apply, assess, hire and schedule |
| `src/components/programme/SkillsTab.jsx` | award form not persisted | assessment and certification event records |
| `src/pages/AgentDashboard.jsx` | predefined visit rows | assigned member tasks, offline-capable evidence workflow |
| `src/lib/actionRequests.js` | browser storage | trusted cross-user backend actions and audit trail |
| `src/lib/cooperatives.js` | separate browser demo store | reconcile with existing cooperative DB records |
| `src/data/programmeDelivery.js` | sample outcomes generated | use actual reconciled programme events |
| `src/pages/JobApplicant.jsx` | example vacancies with old dates | real published opportunities, application history |
| `src/pages/ProgrammeEvidence.jsx` | illustrative funnel/funding | real typed financial and service metrics |
| `src/components/map/SectorPanel.jsx` | sample sector members | eligible verified geographic aggregates with suppression |

## Baseline checklist

Before changes, compare this snapshot to HEAD; run repo tests and hosted RLS checks. The previous review had CI failures; do not assume those persist or are fixed. Capture current CI artifacts and branch protections. Do not expose data exports or credentials in logs.
