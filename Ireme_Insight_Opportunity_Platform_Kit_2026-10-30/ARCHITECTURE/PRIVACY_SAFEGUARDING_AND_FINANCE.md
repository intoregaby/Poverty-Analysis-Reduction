# Finance, Data Protection and Evidence Safeguards

## Public sources and legal review

Rwanda Law No. 058/2021 concerning protection of personal data and privacy applies to personal data processing; official office: https://dpo.gov.rw/about-us/who-we-are. Legal review is required for lawful basis, cross-organization transfers, processing locations, notification and retention. Payment/loan integrations additionally require appropriate provider and banking regulatory review; nothing in this kit authorizes regulated financial services.

## Minimum collection

- Identify persons using opaque database UUID; store national identity/account number only if strictly required, protected and justified.
- Support people without smartphones or literacy via trained agents and accessible alternative workflows; avoid economic discrimination due to digital access.
- Programme transfers use a provider token or masked account alias. Do **not** store bank passwords, PINs, OTPs, mobile money credentials or full PAN.
- Transaction histories from external banks/mobile-money require lawful authorization, data-sharing agreement and supported API. **No claim to track spending after withdrawal, and no blanket monitoring of how households use money.**
- Employment background checks and proof of qualifications must be proportionate. Applicants can correct errors and appeal human decisions.
- Photo evidence is optional when sufficient alternatives exist (invoice/receipt, supervisor site verification, timestamped project record). Get explicit meaningful consent for photo use where required; avoid children's images by default.
- General photo uploads must be private-by-default with server-checked signed uploads, malware/type/size checks, retention and removal. Never create public object URLs for beneficiary media.
- Strip EXIF location from exports and use coarse location unless precise GPS is necessary and authorized.

## Financial integrity and ethics

- Financial events model `pledged` -> `contracted` -> `allocated` -> `authorized` -> `sent` -> `provider_acknowledged` -> `settled` or `failed/reversed`; not every step is a money movement.
- Ledger: capture debit/credit entries for actual internal obligations/movements, enforce balanced journals, immutable compensating reversals, clear currency and provider references. Separate forecasts/budgets from posted ledger facts.
- Donor/investor agreement: legal form, restrictions, permitted use, reporting obligations, confidentiality, audit scope and investment return conditions where applicable. Record money movements only after reconciliation.
- Agent payroll: employment and contractual obligations separate from programme member benefits, with HR confidentiality.
- Member savings-group ledger: record voluntary group savings and loans, but never imply deposit insurance, regulated banking status or guaranteed returns.
- Loans: provider makes all decisions; platform only collects opt-in referrals and shares authorized factual records with expiry/withdrawal where possible. No algorithmic automatic credit decision.

## Evidence confidence ladder

| Level | Evidence state | Appropriate conclusion |
| --- | --- | --- |
| 0 | demo/sample/synthetic | illustrative only; never counted as a real outcome |
| 1 | agent submitted | activity **claimed**, not verified |
| 2 | member confirmed | participant acknowledges activity |
| 3 | supervisor/site-verified | milestone implemented within documented scope |
| 4 | financial record checked | transaction/revenue supported by documentary or provider evidence |
| 5 | evaluated follow-up | outcome trend measured with baseline/period; causal claims only when study design warrants |

## Metrics and risk

- Report percentages only with their numerator, denominator, period, geography and source.
- Do not measure “poverty reduction caused by programme” from attendance, photos, transfer size or isolated income notes.
- Provide complaints, corrections, refusal/withdrawal mechanisms, and explanations of adverse human decisions.
- If a permission or external provider is unavailable, fail with a visible pending/denied outcome; do not fabricate availability or silently fallback to demo.
