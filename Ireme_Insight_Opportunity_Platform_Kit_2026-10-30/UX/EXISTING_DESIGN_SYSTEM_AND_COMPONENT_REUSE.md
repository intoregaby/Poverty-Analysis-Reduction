# Frontend Continuity — Reuse the Existing Product

**No wholesale redesign.** Current stack is React 18 + Vite 8 + React Router + Recharts + Tailwind + Radix-derived UI kit. Apply existing `PageHeader`, `Card`, `PanelGuide`, dialogs, buttons, responsive tables, charts, filters and existing `DashboardShell` to all new features.

## Tokens observed in existing `tailwind.config.js`

| Token | Observed existing value | Use |
| --- | --- | --- |
| `brand` | `#635BFF` | primary interactive actions |
| `ink` | `#0A2540` | headings, primary labels |
| `sub` | `#697386` | secondary text |
| `hairline` | `#E3E8EE` | quiet borders and dividers |
| `canvas` | `#F7F9FC` | page background |
| `pos` | `#127A4B` | confirmed/success, not financial claims without verification |
| `neg` | `#DF1B41` | failed/overdue, not poverty stigma |
| `brand.soft` | `#F1EFFF` | limited primary selection state |

Typography observed: Inter / UI sans; generally 20px headers, 12–13px data cards, small source labels. Preserve compact Stripe-like spacing, crisp lines and small legible charts. Don't invent a second dark themed dashboard.

## Interaction principles

- Show concise human questions and actions, not heavy explanatory blocks on every page.
- Three sections in a programme case: **What was planned**, **What happened**, **What is verified**.
- For every metric, help tooltip with **source, period, denominator and meaning**; sampling/uncertainty note when relevant.
- Use disabled controls with explicit reasons when provider/legal/database is unavailable, not dead action buttons.
- Show correct status legend: `Sample`, `Recorded`, `Pending verification`, `Provider confirmed`, `Disputed`, `Official published source`.
- Avoid red-green color only; accessible text and icons; WCAG AA contrast, responsive 320px+ and keyboard navigation.
- Forms prefill known safe values, validate on client and server, show unsaved state/retry and send receipt ID on submit.
- Use small wizard for multi-step tasks (recruitment, evidence, referrals); preserve state safely across navigation.
- Mobile-first agent experience: easy one-handed tasks, safe offline forms, data use indicator, low-bandwidth image compress and consent capture, sync queue.
- Kinyarwanda and English parity through existing i18next; do not add hardcoded untranslated copy to shared components.

## Panel-specific UI map

| Existing route | Extend | Do not duplicate |
| --- | --- | --- |
| `/programmes` | member support plans; jobs; competency recruiting; training; true payments; skills; coop ledger | separate jobs app |
| `/jobs` | real published vacancies, applications, status, interviews | duplicate source of jobs |
| `/agent` | assigned work; lessons; implementation; photo/receipts; offline sync | new standalone agent platform |
| `/beneficiary` | own support payments, personal training/project and financial help | expose general household registries |
| `/government` | programme expenditure, verified performance, case follow-up by area | public identifiable beneficiary table |
| `/cooperative` | financial contribution and savings/loan record sections | second cooperative membership registry |
| `/cooperatives` | search/find/join cooperatives; clear joining status | forced join by algorithm |
| `/evidence` | programme result figures from DB with source flags | static invented funnel |
| `/investigations` | link from verified findings to scoped action requests only | replacing AI Engine report logic |
| `/other-analysis` | allocation lab, multivariate descriptive comparisons | an unsourced ML simulator |

## Charts useful to a judge

- **Work-to-opportunity funnel**: applied -> assessed -> hired -> inducted -> active -> wages actually paid.
- **Skills-to-practice progression**: baseline -> training -> demonstrated -> implementation -> independent verification -> follow-up.
- **Money status waterfall**: contracted, allocated, payable, initiated, settled, failed, reconciled — with totals and note when not additive.
- **Programme operational comparison**: district map of *count of members served*, separate from survey poverty rate with denominators.
- **Financial access journey**: member asked for help -> provider referral -> provider confirmed; avoid assuming account use from a referral.
- **Support targeting scenario**: bars for scenario reach under different assumptions, no 'impact proven' language.

## UI acceptance

A reviewer on a small mobile screen can complete full agent evidence capture and see sync status. A programme manager on desktop can open a job, evaluate candidates and inspect live approval state. A minister gets a 10-second understandable sourced programme summary and can identify unresolved exceptions. Keyboard users can complete the workflow without mouse or color cues.
