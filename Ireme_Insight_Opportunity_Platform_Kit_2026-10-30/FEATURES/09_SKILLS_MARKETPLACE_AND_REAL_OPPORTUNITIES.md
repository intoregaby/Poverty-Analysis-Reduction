# 09 Skills Marketplace And Real Opportunities

**Outcome:** Close the loop from verified skills to real jobs, small-business opportunities, cooperative work and training while supporting agents as skilled paid employees.

**Primary actors:** programme member; applicant; agent; programme employer; training provider; cooperative officer

## Required user workflow

1. Build member skill record using demonstrated competencies (not solely attendance).
2. Show approved real job/training/cooperative opportunities matching verified skills, geography and access needs.
3. Human advisor/agent helps make a referral or application; recruiter decides and documents outcomes.
4. Track enrolled -> training -> demonstrated -> opportunity applied -> placed/enterprise_started -> follow-up.
5. Programme managers see aggregated skill outcomes and opportunities created; family identities hidden in public stats.

## State machine

`skills unverified -> assessed -> demonstrated -> credential_issued/expired; opportunity draft -> published -> filled/closed; referral requested -> sent -> responded -> resolved`

## Existing UI and proposed extension

Extend SkillsTab, JobsTab, member profile and cooperative panel; short 'Next opportunity' recommendation cards with reason and source.

## Supabase entities and interfaces

skill_catalog, member_competencies, assessed_skill_events, training_opportunities, opportunity_referrals, provider_responses.

## Hard business and security rules

- No fake job listings or unsupported credentials.
- Human hiring decisions, clear eligibility, no automatic exclusion due to income/poverty category.
- Location and contact sharing strictly consented and scoped.

## Feature acceptance tests

- [ ] Verified tailoring skill leads to relevant active opportunities; absence yields useful empty state.
- [ ] Job is closed when filled; stale vacancies excluded.
- [ ] Referrals have durable timeline and actual outcome or 'awaiting response'.

## Required implementation artifacts

- Git diff and UI screenshots for desktop/tablet/mobile.
- API/Edge contract with unauthorized/failure responses.
- Migration and RLS positive+negative tests.
- Idempotency/retry and audit behavior if money or evidence is handled.
- Demonstration vs production labeling and provider/blocker status.
