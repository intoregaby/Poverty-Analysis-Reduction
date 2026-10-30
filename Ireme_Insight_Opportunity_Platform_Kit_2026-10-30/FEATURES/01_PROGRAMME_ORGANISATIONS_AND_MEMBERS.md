# 01 Programme Organisations And Members

**Outcome:** Establish real programme organisation, funding scope, member enrollment and case plans without confusing VUP grant support with paid agent employment.

**Primary actors:** programme owner; government district officer; field supervisor; member; authorised programme admin

## Required user workflow

1. Register organisation and its programmes, permitted geographies, active funding agreements, service eligibility rules and reporting commitments.
2. Register/verify a member and household through legal and consented intake; detect duplicates without exposing other programmes’ confidential cases.
3. Human programme officer records eligibility review, service plan, enrollment period, amount/schedule of promised support and appeal method.
4. Assign a case manager and follow-up plan; show member a plain-language status and support channel.

## State machine

`draft -> review_required -> approved -> active -> suspended/closed; enrollment: pending_verification -> accepted/declined_with_reason -> active -> exited`

## Existing UI and proposed extension

Extend Programme Management Overview and Beneficiaries tabs; case drawer from existing Beneficiary360 and Government panel; member's My Benefits view with true states.

## Supabase entities and interfaces

programme_organizations, programme_catalog, programme_org_memberships, programme_enrollments, member_support_plans, consent_records, enrollment_decisions; FK to existing members.

## Hard business and security rules

- Never grant benefits based solely on district poverty ranking or an AI score.
- Every programme must have its own authorized organisation owner and area scope.
- A member may be eligible for several programmes; deduplication flags potential overlap for human review instead of auto-denying.
- Make readable status and complaint/appeal channel visible to member.

## Feature acceptance tests

- [ ] A programme officer can create enrollment and reload it in another browser.
- [ ] Member sees only their own actual approved status and can dispute errors.
- [ ] Officer of a different programme cannot read the enrollment.
- [ ] Demo enrollments never count as real coverage numbers.

## Required implementation artifacts

- Git diff and UI screenshots for desktop/tablet/mobile.
- API/Edge contract with unauthorized/failure responses.
- Migration and RLS positive+negative tests.
- Idempotency/retry and audit behavior if money or evidence is handled.
- Demonstration vs production labeling and provider/blocker status.
