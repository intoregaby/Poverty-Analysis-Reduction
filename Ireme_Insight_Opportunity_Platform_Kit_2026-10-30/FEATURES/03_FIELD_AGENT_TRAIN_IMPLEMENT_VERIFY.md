# 03 Field Agent Train Implement Verify

**Outcome:** Make an agent's main work concrete: teach a skill, help implement a livelihood activity, document results, and obtain independent validation.

**Primary actors:** field agent; programme member; field supervisor; programme owner; government case officer (only when scoped)

## Required user workflow

1. Programme supervisor selects trained agent and assigns a bounded number of members, respecting area, specialization and consent.
2. At first visit, agent and member record their skills, preferred activities, available resources, constraints and goals.
3. Agent constructs co-approved plan: measurable skill milestone, proposed small activity, resources, budget, dates and foreseeable risks.
4. Teach with interactive practical checklist (price calculation, stock tracking, product/service testing, record keeping, bank/MoMo usage where wanted).
5. Guide actual implementation: deliver supplies if approved, start work, produce an item/service or first verifiable customer interaction.
6. Member confirms milestone. Agent optionally uploads photo of the activity, receipts or notes with meaningful consent; store private and tamper-evident.
7. Independent supervisor accepts/rejects each milestone with explanation and requests further evidence when needed.
8. After an agreed period, follow-up records project continuation, challenges, voluntary income/cost figures, and whether skills were demonstrated in practice.

## State machine

`assignment proposed -> accepted -> active -> completed/reassigned; skill: baseline -> training_scheduled -> attended -> demonstrated; activity planned -> started -> evidence_submitted -> supervisor_verified -> active/paused/closed; outcomes reported -> checked -> monitored`

## Existing UI and proposed extension

Transform existing AgentDashboard into Today's Visits, Assigned Families, Training & Plans, Project Progress, Evidence & Follow-up. Extend member portal with 'My plan', 'My skills', 'My activity' and confirmation controls.

## Supabase entities and interfaces

agent_work_assignments, household_skill_assessments, training_events, livelihood_plans, practical_livelihood_projects, livelihood_milestones, evidence_assets, supervisor_verifications, outcome_observations, visit journal.

## Hard business and security rules

- No agent self-approval of project success or income.
- Every activity respects member choice; refusal or inability to produce photo is not automatic programme failure.
- A verified photo proves an observed activity only, not earnings or long-term poverty reduction.
- Household size, baseline and self-reported income are sensitive and never public dashboard drill-down.
- Offline submissions require unique device-generated event IDs, authenticated sync and conflict history; avoid unencrypted indefinite image cache.

## Feature acceptance tests

- [ ] Assigned agent can see only own authorized member and action it.
- [ ] Agent records skill training, helps create project and submits evidence; member can confirm/dispute.
- [ ] Supervisor reviews as separate identity; agent cannot modify accepted evidence.
- [ ] Government dashboard can count verified projects and skills, not private attachments.
- [ ] Poor connectivity sync does not duplicate activity entries or lose confirmed evidence.

## Required implementation artifacts

- Git diff and UI screenshots for desktop/tablet/mobile.
- API/Edge contract with unauthorized/failure responses.
- Migration and RLS positive+negative tests.
- Idempotency/retry and audit behavior if money or evidence is handled.
- Demonstration vs production labeling and provider/blocker status.
