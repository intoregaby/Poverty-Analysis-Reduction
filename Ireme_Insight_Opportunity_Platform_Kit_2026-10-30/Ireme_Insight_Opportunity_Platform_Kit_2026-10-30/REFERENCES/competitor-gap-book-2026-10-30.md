# Ireme Insight — NISR Track 2 competitor feature gap book
**Assessment date:** 30 October 2026 · **Basis:** two user-provided NISR 2026 competitor code-audit documents, user-provided platform documentation, and selected current GitHub default-branch source files.  
**Purpose:** identify real additions *outside* the AI Engine and distinguish them from capabilities that already exist, are only UI/demo, or are being built in the AI Engine.  
**Important:** This is not an official competition entry list, an official ranking, or an end-to-end certification. Competitor implementation was largely statically inspected. Some repos are duplicate/companion projects or have no verified Track 2 registration.

## A. Areas NOT to restart or duplicate
The Ireme AI Engine is actively in development. Treat its survey estimation, design-weighted uncertainty, Python/R reconciliation, provenance, evidence verification, research agent orchestration, model gateway, claims validation, report release gates and statistical approvals as ongoing work. **Reuse their future service interfaces**. Do not build a second analytic core or declare unfinished AI Engine features to be absent. The existing Ireme frontend also contains poverty charts, district investigation, district maps, programme/government/beneficiary dashboards, cooperatives, USSD, request interfaces, jobs and skills; improve the actual operations rather than rebuild the pages.

## B. Urgent confirmed operational gaps in the current Ireme source

| Ireme source | Inspected behavior | Required correction | Status |
|---|---|---|---|
| `src/components/programme/PaymentsTab.jsx` | Submit handler sets local `sent=true`; no transfer/ledger call | Server-side payment intent; authorization, validation, durable event ledger, provider settlement only when approved integration exists; no false success | UI only |
| `src/components/programme/JobsTab.jsx` | Create vacancy form fields exist; button closes dialog | Persist vacancy, applications, exam/interview scheduling, employer decisions and applicant notifications | UI only |
| `src/components/programme/SkillsTab.jsx` | Award action closes dialog | Persist verifiable training completion / award and audit history | UI only |
| `src/pages/AgentDashboard.jsx` | Fixed `VISITS` / `PROBLEMS` arrays and local record-state | Assigned caseload, authenticated visit form, evidence consent, offline-safe queue and sync | Demo only |
| `src/pages/BeneficiaryAccess.jsx` | Fixed programme and payment history arrays | Fetch member-specific programme enrolments and payment ledger or show explicit demo | Demo only |
| `src/pages/JobApplicant.jsx` | Fixed vacancy rows with 2024 deadlines | Read actual open vacancies and submit real applications | Demo only |
| `src/lib/actionRequests.js` | Browser-local store | Multi-user server persistence, role/area scope, assignment, status transitions, audit, notifications | Demo/local |
| `src/lib/cooperatives.js` | Browser-local cooperative operations | Merge with authenticated database-backed cooperative member space, avoid duplicate records | Demo/local plus separate DB features |
| `src/data/programmeDelivery.js` | Explicit simulated October outcomes / seven-district sample | Real operational ledger, correct denominators and data-status labels; no fabricated programme rates | Sample |
| `src/pages/ProgrammeEvidence.jsx` | Literal payment/agent/budget demo figures | Query programme data services and distinguish official survey VUP aggregates from administrative data | Mixed real/demo |
| `src/components/map/SectorPanel.jsx` | Sector counts from sample generator | Validated sector coverage data with low-N / missing-data flags; do not extrapolate district rates as observed sector rates | Sample |
| `src/lib/DemoAuthContext.jsx` | Authenticated user without demo role falls back to `nisr_analyst` | Resolve verified server-issued role; fail closed without a role | Role ambiguity |
| `engine/ireme/api.py` | Review authorizes using profile but calls `store.review` without profile | Pass profile consistently and test both hackathon demo and governed production | AI Engine boundary defect; fix in existing engine, not a new feature |

**Note:** `src/lib/memberApi.js` already queries Supabase for membership, cooperatives, agent assignment and insurance. `src/pages/UssdSimulator.jsx` calls a real edge-function endpoint for demo accounts. Do not describe the entire member or USSD system as mock.

## C. Competitor-by-competitor feature catalogue (21 earlier audit candidates)

| Repository | Built in inspected code | Distinct capability worth considering in Ireme | Caveat / what was not demonstrated |
|---|---|---|---|
| [Aguka Access 360](https://github.com/Muhanga1/Aguka-access-360) | Five-location unemployment/AGUKA/poverty Streamlit table and unemployment bar chart | Youth funding + employment measures in programme outcomes | Fixed in-memory five-place data, static recommendations, no model or ingestion |
| [Imari Health](https://github.com/sharif-dev001/imari-health) | Financial-health answers -> XGBoost segment / SHAP driver -> recommendations; published table context | Simple guided household financial-wellbeing check linked to support referrals | 12,000 synthetic training records; model file missing in inspected tree; not validated credit/eligibility scoring |
| [NISR Poverty Targeting](https://github.com/kbelyse/nisr-poverty-targeting) | EICV modules join, cluster splits, category embeddings, joint poverty + consumption model notebook | Combined welfare indicators can inform the statistical service (not new UI) | One-epoch placeholder and synthetic fallback; outside non-AI scope |
| [ImariShield G29](https://github.com/selenai9/imarishield-g29) | Six-page financial resilience app, shock calculators, XGBoost model artifacts, fairness/metrics files, district intervals | Household shock preparation / risk factors view for programme staff; family resilience workflow | Saved results not independently retrained; CI/bootstrap caveat; model integration belongs to AI Engine |
| [NISR_20226_hackathon](https://github.com/IH-honnette/NISR_20226_hackathon) | Results JSON, exported charts and TensorBoard artifacts | Clearly packaged research findings and static briefing graphics | Claimed source notebook missing, cannot reproduce results |
| [Amazing-beep/NISR_Hackathon](https://github.com/Amazing-beep/NISR_Hackathon) | EICV7 ingestion + PyTorch MLP / metrics notebook | No compelling non-AI product gap | One training epoch; no deployed product |
| [Poverty MLP notebook](https://github.com/Sheja-Dorian/nisr-hackathon-poverty-mlp) | Data assembly, logistic/boosting baselines, MLP, TensorBoard notebook | No compelling non-AI product gap | Notebook only; placeholder one epoch; no deployable service |
| [IMBONIX](https://github.com/dieumerci-niyonkuru/imbonix-nisr-hackathon-2026) | Geography/sector explorer, provenance labels, policy scenarios, reach calculator, adjustable district priority weights, social-protection screens, assistant | Add **budget-to-reach calculator**, **user-adjustable priorities**, **clear sector profiles** and **public indicator catalog** | Uses precompiled aggregates; risk predictor page untrained; reach/priority calculations are scenarios not causal impact |
| [VUP Lens](https://github.com/sbmichel-CMUafrica/vup-lens) | VUP coverage/delivery pages, targeting scorecard, targeting curves, household score inputs | Show **who VUP reaches/misses** and interactive **targeting vs budget** with documented source mode | Committed artifacts from demo mode; real input coding requires validation; model work in AI Engine |
| [Fin-gap Rwanda](https://github.com/paulstatesman/Fin-gap-Rwanda-project) | Thirty-district inspector, finance/poverty mismatch graph, policy brief UI, phone/agent/literacy scenario | Interactive **district service-gap comparison** and lightweight scenario panel | Hard-coded district input, fixed scenario coefficients not proven causal |
| [UpliftRwanda](https://github.com/tonkyzone100m-ctrl/UpliftRwanda) | Poverty/finance/VUP + CFSVA food, RDHS health, labour, matchmaking, scenario and ministerial views | **Multisector poverty explanation**, **skills-to-opportunities referral**, **ministerial one-page action brief** | District archetype/calibration seeding is not directly observed data; rules not measured intervention effects |
| [Rwanda Inclusion Lab](https://github.com/kudakwashechikovo17/rwanda-inclusion-lab) | Official workbook downloader, workbook upload, community comparison and weighted intervention planner | **Non-AI dataset intake** with explicit validation; adjustable district comparison and reason-for-priority cards | Heuristic workbook extraction and priority weights; not a trained predictor |
| [InsightRwanda2233](https://github.com/honorerw/InsightRwanda2233) | Source catalog, codebook, permissions, quality checks, methodology, publication controls | A usable **source-status/data-quality catalogue** if not already handled by AI Engine; display in UI | Research governance overlaps Ireme AI Engine; do not duplicate it |
| [InsightRwanda](https://github.com/honorerw/InsightRwanda) | Financial inclusion, geography, resilience lab, weighted stats, research briefs, deterministic assistant, tests | **Self-service financial resilience exploration** and **standardized short research briefs** | Model target is proxy resilience band, not official poverty; data license / reproducibility need checking; model work in AI Engine |
| [Financial Vulnerability Prediction](https://github.com/Abejirin-King/rwanda-financial-vulnerability-prediction) | Saved Random Forest, CSV batch import and flag export | **Case-upload triage queue with human review** rather than automatic benefit decision | Model probabilities uncalibrated; source microdata absent; high-stakes support decisions must not be automated |
| [Benjaminbsv12/RP-FVIP](https://github.com/Benjaminbsv12/RP-FVIP) | Empty Git tree in earlier audit | None | No feature to adopt |
| [RP-FVIP](https://github.com/benjamin12-hackathon/RP-FVIP) | Poverty explorer, financial inclusion, multidimensional poverty, reports and demo API | **Multidimensional deprivation cards** with source/year and missing-data states | Demo SQLite and unverified source pipeline, no demonstrated trained vulnerability model |
| [Rwanda-financial-poverty](https://github.com/loxxcode/Rwanda-financial-poverty) | Default Next.js starter | None | No substantive application |
| [SPTA Simulator](https://github.com/Micomyiza-Alexis/SPTA_Simulator) | Five targeting strategies (random, geographic, rule, logistic, random forest), budget percentages, severe-poor coverage, robustness outputs, VUP evidence pages | **High-impact:** compare coverage, exclusion, inclusion and cost across allocation strategies; best non-AI-facing innovation | Precomputed metrics and missing processing inputs; simulation cannot become a real entitlement decision |
| [gilberthagenimana/SPTA_Simulator](https://github.com/gilberthagenimana/SPTA_Simulator) | Health endpoint and starter frontend | None; companion variant of SPTA | Partial scaffold, not separate mature product |
| [rcei-platform](https://github.com/fistonuzabumwana/rcei-platform) | Clean-cooking district baseline, cooking fuel classifier, hypothetical subsidy calculator | Optional **energy poverty/clean cooking** dimension if trustworthy data support it | Primary focus fits Track 3 better; source/simulation limitations |

## D. Eight additional distinct competitor candidates (October 30 discovery)

| Repository | Concrete implementation | Feature worth adding outside AI Engine | Caveat |
|---|---|---|---|
| [Imibereho Lens](https://github.com/patcreator/imibereho_lens_hackthon) | Next.js indicators/maps; local saved analyses and database-backed aggregate-only public sharing | **Save analysis -> share limited aggregate evidence note -> revoke/expire link** | Imports are descriptive aggregate analysis without survey SEs; public sharing needs privacy guardrails |
| [Where VUP Misses the Poor](https://github.com/GitegoFaycal/VUP) | Streamlit VUP district evidence, applicant/loan screener with YAML rules and coefficient JSON, administrative tracker | **Explainable human-reviewed VUP intake checklist** and **missed-household queue** | Advisory only; models not independently validated; no automated eligibility/benefit denial |
| [UbukunguLens](https://github.com/mediator55/ubukungulens) | FinScope gender gaps, financial access charts and CSV export | **Gender-disaggregated access gaps** and account usage vs ownership chart, if published source supports | Headline figures static; calculators illustrative, not causal |
| [FinBridge Rwanda](https://github.com/patrickntirenganya/FinBridge-Rwanda) | Farmer activity/sale/harvest ledger, loan-plan arithmetic, evidence categories and encrypted consent-based lender share | **Farmer/cooperative financial diary**, **receipt evidence**, **user-controlled financial history sharing** | No credit score/approval; source aggregate estimates not independently reproduced; sharing not a bank connection |
| [Imibereho](https://github.com/lineboi/imibereho) | Household spending tracker, shock/resilience plans, no-shock/shock/cash-support calculations, district context | **Household savings and emergency preparation**, **shock case workflow**, **support scenario** | 3,000 synthetic example households; modeled district scores illustrative, not observed or causal |
| [Finance & Poverty Nexus](https://github.com/HUGUES-124/poverty_Finance_Nexus) | CSV district chart, manual household risk arithmetic, community reports in SQLite | **Citizen/agent evidence reports into district case queue** | Invalid percentage-like input values, formula unvalidated |
| [Imbaraga](https://github.com/yvesmugisha901/imbaraga_system) | Role-based district priority app, CSV upload/scoring API, scored batch/drivers and model comparison views | **Human review of flagged intake batches** and **structured explanation for referrals** | Its API uses a mock scorer unless `ML_SERVICE_URL` configured; synthetic/data assumptions |
| [e-Kimina](https://github.com/gloire-kayla/e-kimina) | Browser savings-group demo + distinct mobile/backend group contribution and repayment workflow | **Cooperative savings & loans ledger**, **member contributions**, **repayment tracking**, **cash/mobile-money method labels** | Browser demo uses invented transactions, mobile/backend deployment unverified; do not claim real transfer without provider confirmation |

**Adjacent only**: [Rwanda Cost-of-Living Navigator](https://github.com/kuradusengesamuel-create/rwanda-cost-of-living-navigator) has district cost pressure, income quintiles and alerts but hackathon Track 2 status unverified. [Ikiraro VUP Bridge](https://github.com/am2aidi/ikiraro-vup-bridge) is primarily a Track 3 bridge/credit prototype, not a confirmed Track 2 rival. The other [VUP companion repo](https://github.com/GitegoFaycal/vup-project) should not be double-counted as an independent team.

## E. Proposed additions — non-AI priority backlog

The scores below indicate **priority**, not a guarantee of winning. Acceptance criteria are designed to be verified by automated tests and a human walkthrough.

### P0 — operational completion, reliability and accurate proof

1. **Unified programme operational database.** Replace sample records in Programme/Agent/Beneficiary/Map delivery widgets with authorized server-backed entities; ensure national published aggregate statistics stay separate from administrative records. **Done when:** a newly added permitted programme member appears in programme, district and their own profile, and access is denied from unrelated roles.
2. **Real jobs workflow.** Create/publish/close vacancy, apply, shortlist, exam appointment, interview decision, assign agent, notify applicant. **Done when:** two authenticated roles complete one end-to-end hiring journey, all changes persist across sessions, and a rejected applicant cannot mutate a job.
3. **Agent field workflow.** Assigned cases, scheduled visits, no-network drafts, conflict-safe sync, evidence consent, supervisor review, refusal-to-upload options. **Done when:** an offline draft syncs once after reconnect, duplicates are prevented, access scope is enforced and status can be traced.
4. **Payment integrity and reconciliation.** Approval-only payment intentions, generated batch references, simulated-versus-integrated provider status, idempotent reconciliation, failed payment follow-up. **Done when:** clicking the UI cannot claim funds were delivered unless a recorded settlement confirmation exists. For hackathon demo, clearly use simulated settlement.
5. **Beneficiary complaint and requests.** Real scoped submission, routing, responsibility, due dates, reassignment, closure evidence, appeal and notification. **Done when:** a complaint raised by a demo beneficiary reaches an authorized officer and status updates are visible to that beneficiary.
6. **Shared cooperative data source.** Connect cooperative application, votes and members from existing authenticated Supabase code; retire competing browser-local demo state for governed workflows. **Done when:** member joins/approvals persist across devices with unique membership and audit trail.
7. **Accuracy/data-status UX.** Every programme metric includes actual/sample/simulated status, source, as-of date, numerator/denominator, coverage limitations and suppressed low counts. **Done when:** no fake payment statistic is shown as national coverage and changing demo data cannot affect official statistics.
8. **Clean-build demo release.** Fresh checkout -> install -> tests -> build -> login -> complete demonstration -> labelled export; fix current CI dependencies/lockfile and role fallback. **Done when:** remote CI passes, accessible deployment and judge credentials work, no hidden prerequisites; README clear.

### P1 — direct competitor innovations for a differentiated workflow

9. **VUP coverage gap explorer.** Join legitimate district survey coverage measures to *separately defined* programme admin delivery counts without implying exact survey-to-beneficiary identity matches. Show missed population and caveats. Integrate a district referral list with human approval. Inspiration: VUP Lens, Where VUP Misses the Poor.
10. **Budget allocation strategy lab.** Compare transparent random/geographic/rule-informed allocation baselines and, when validated in the AI Engine, model-assisted strategies. Show coverage, missed households, overlap and cost, with sensitivity bands; never claim causal impact. Inspiration: SPTA Simulator.
11. **Opportunity and skills matching.** Match beneficiary training/skills to real available jobs and cooperatives using explainable rule filters; show eligibility, training needs, and application status. Inspiration: UpliftRwanda; expands existing Ireme skills/job panels.
12. **Household resilience planner.** Voluntary household goals, shocks (crop failure, medical expense), savings buffer and support referral checklist. Clearly separate actual household entries from official context and hypothetical calculations. Inspiration: Imibereho, ImariShield.
13. **Cooperative financial ledger.** Member contributions, group loans, repayments, arrears, meeting decisions, audit and evidence, with no fabricated payment confirmation. Inspiration: e-Kimina.
14. **Farmer financial diary + consented share.** Simple input for crops, sales, purchases and loan plans; provenance classes (self-attested, document reference, externally verified); restricted share expiry and revocation controls. Inspiration: FinBridge.
15. **Budget-to-people-reached calculator.** Set a transparent target (for example reduce exclusion by X percentage points), show rough number of adults affected using grounded denominator, administrative costs and uncertainty/assumptions. Inspiration: IMBONIX.
16. **Saved analysis notebooks/shareable aggregate briefs.** Save filters, indicators, geographies, citations, retrieval timestamps; generate short share links only for disclosure-safe aggregates. Inspiration: Imibereho Lens.
17. **Evidence-to-action programme monitor.** Investigation finding -> assigned programme action -> owner/due date -> proof of action -> verified outcome at time point; do not equate implemented activity with impact. Inspiration: SPTA / IMBONIX / Uplift combination, extends existing Ireme requests.
18. **Community feedback channel.** Complaint / local observation with triage, duplicate detection, privacy and escalation, distinct from official statistical evidence. Inspiration: Finance & Poverty Nexus.

### P2 — relevant expansions after P0/P1

19. **Multidimensional deprivation and food/labour/electricity cards** only where released comparable sources exist. Inspiration: RP-FVIP, UpliftRwanda, rcei-platform. Avoid fabricated sector-level disaggregation.
20. **Gender and geographic financial-service use** with denominators and surveys clearly labeled. Inspiration: UbukunguLens, InsightRwanda.
21. **Cross-sector/geography drill-through** and change explanation with source caveats. Inspiration: IMBONIX.
22. **One-page ministerial decision brief** with official measures, action owners, funding assumptions, limitations and verification state. Inspiration: UpliftRwanda and InsightRwanda; use engine's governed reporting API when available.
23. **Offline-first field outreach UX and Kinyarwanda UX** across agents/beneficiaries beyond the existing USSD channel. Implement after reliable backend states exist.
24. **Volunteer guidance flow and financial-health questionnaire** as a *support* tool, never as credit qualification or benefit denial. Inspiration: Imari Health, FinBridge.

## F. Placement in Ireme UI (no new top-level panels required)

| Existing place | New/extended functions |
|---|---|
| Statistics & District Investigation | VUP coverage-gap explorer, aggregate evidence notes, scenario lab, population reach, multidimensional indicators, human-approved action referral |
| Programme Management | Real jobs & exams, payment batch/reconciliation, agent assignments and supervision, skills matching, cooperative savings, outcome register |
| Government | District case inbox, action follow-up and budget-to-impact assumptions, monitoring and escalation |
| Agent | Assigned household visits, offline queue, service/referral checklist, consent-evidence capture |
| Beneficiary & member | Own payments, complaints, savings goals, skills, jobs, farmer diary, lending share permissions |
| Cooperatives | Contributions, member decisions, group lending and transparent ledgers |
| Financial Usage Map (as Programme feature) | True administrative measures and sourced official statistics shown as separate layers, geography/period definitions and caveats |

## G. Anti-overclaim quality contract

- No genuine payment success without provider settlement evidence; demo settlement must be labeled simulated.
- No automatic VUP eligibility, credit denial or loss of benefit from probabilistic or heuristic scores; human casework and appeal.
- No claim of observed sector/cell poverty if source covers district only. Support separate geographies and suppress unsupported comparisons.
- No 'prediction', 'causal effect', or 'impact' labels on arithmetic scenarios or correlation-based risk scores.
- Survey NISR/FinScope numbers must preserve period, universe, weights, denominators and comparability cautions. Statistical validation belongs in existing AI Engine.
- Separate published survey estimates, raw administrative records, demonstration fixtures and generated scenarios in both models and UI.
- No live personal-data intake without consent, role- and geographic-scope guards, retention and privacy/audit controls.
- Avoid duplicating data stores: the current browser-local requests/cooperatives must migrate to governed server backends, preserving data models where useful.
- Add end-to-end tests for **actual tasks**, not only component renders. Never mark a feature done because a route or screen exists.

## H. Immediate demonstration route

**Public statistics -> District investigation -> Source/uncertainty verification -> VUP underserved area -> Human action request -> Programme owner accepts -> Field agent visits/records -> Beneficiary sees update -> Programme reconciliation -> Outcome follow-up -> Labelled export.**

Use one district and small, clearly labelled demonstration operations attached to actual permitted official aggregate statistics. Show the distinction plainly. The full statistical intelligence system remains the planned research-grade target architecture; these UI/business-process improvements do not narrow it.
