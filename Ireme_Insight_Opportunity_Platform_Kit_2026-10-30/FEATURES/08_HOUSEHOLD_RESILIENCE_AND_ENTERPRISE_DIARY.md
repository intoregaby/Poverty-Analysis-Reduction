# 08 Household Resilience And Enterprise Diary

**Outcome:** Give members voluntary tools for budgeting, business inputs, savings goals and coping with shocks while maintaining dignity and privacy.

**Primary actors:** member, field agent helping with consent, authorised support coach

## Required user workflow

1. Member chooses to create private household/enterprise diary; records voluntary revenue and costs per period, inventory and savings goals.
2. Agent can assist under time-bound delegated permission; member can correct, revoke access and export own records.
3. Use straightforward, assumption-labelled budget and shock scenarios for floods, seasonal loss or unexpected expenses; no black-box diagnosis.
4. Suggest available programmes, cooperatives, training and regulated finance information; never recommend unsafe indebtedness.
5. Optional consent to share selected records with lender or programme for a stated purpose.

## State machine

`private_draft -> member_confirmed -> optionally_shared -> expired/revoked; no default government sharing`

## Existing UI and proposed extension

Member My Activity and Financial Planning; agent assists only within assigned case; clear calculations in RWF.

## Supabase entities and interfaces

financial_diaries, member_savings_goals, household_resilience_plans, share_consents, access_logs.

## Hard business and security rules

- Self-reported diary is not a population statistic or bank-verified transaction.
- No compulsory budgeting or moral judgement of spending.
- Any loan amount calculator must show assumptions and not imply lender endorsement.
- Member can view and amend their information and revoke optional sharing.

## Feature acceptance tests

- [ ] Member can enter and save a realistic budget and see arithmetic explained.
- [ ] Other members and generic government officers cannot read the diary.
- [ ] Sharing is selective, scoped, expiring and auditable.
- [ ] Shock scenarios do not claim a forecast or causality.

## Required implementation artifacts

- Git diff and UI screenshots for desktop/tablet/mobile.
- API/Edge contract with unauthorized/failure responses.
- Migration and RLS positive+negative tests.
- Idempotency/retry and audit behavior if money or evidence is handled.
- Demonstration vs production labeling and provider/blocker status.
