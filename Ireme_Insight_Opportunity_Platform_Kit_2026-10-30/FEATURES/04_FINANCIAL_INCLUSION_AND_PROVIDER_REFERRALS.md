# 04 Financial Inclusion And Provider Referrals

**Outcome:** Offer understandable financial access without making social support conditional on compulsory finance surveillance or promising loans.

**Primary actors:** member; field agent; programme manager; approved bank/mobile-money partner

## Required user workflow

1. Member selects preferred support payment channel and reports access needs.
2. Agent explains account options, fees, security, scams and consent, without requesting PINs or OTPs.
3. Member optionally requests bank/mobile-money account referral. Provider performs KYC and returns status when a legal integration exists.
4. Track referral and verified account status; provide lawful alternative channels where required.
5. Member may separately request a loan information/referral; lender alone assesses and decides.

## State machine

`not_assessed -> interested/not_interested -> consented -> provider_pending -> confirmed/rejected/withdrawn; credit referral consented -> sent -> lender_response`

## Existing UI and proposed extension

Financial Access wizard inside Member and Agent pages, programme referral queue, aggregated government inclusion funnel; no new standalone panel necessary.

## Supabase entities and interfaces

financial_access_referrals, provider_referral_events, credit_referrals, consent_records, masked_payment_destinations; scoped org and member IDs.

## Hard business and security rules

- Bank account or mobile-money registration status is never equated with poverty exit or loan approval.
- No collection of PIN, OTP, full account credentials, or unconsented third-party bank transaction histories.
- Borrowing is voluntary; disclose rate, fees and risks; any lender integration requires explicit legal and partner agreement.
- Where a member cannot open an account, display exception/assisted alternate channel instead of rejecting benefits by default.

## Feature acceptance tests

- [ ] Unbanked member can record 'needs help' and see clear next steps.
- [ ] Agent can submit scoped referral, not view secret financial credentials.
- [ ] Provider-confirmed opening and user-reported opening are separately labelled.
- [ ] Lender referral never shows automatically 'approved'.

## Required implementation artifacts

- Git diff and UI screenshots for desktop/tablet/mobile.
- API/Edge contract with unauthorized/failure responses.
- Migration and RLS positive+negative tests.
- Idempotency/retry and audit behavior if money or evidence is handled.
- Demonstration vs production labeling and provider/blocker status.
