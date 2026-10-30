# MASTER ARCHITECTURE - Ireme Insight District Investigation Engine (current state)

Audit date 2026-10-29. Repository `D:\Project\Poverty-Analysis-Reduction`, commit `919a77e` plus uncommitted edits (Base44 files deleted, Supabase functions added). **Read-only audit; nothing was redesigned or changed.** Detailed chapters: [README](README.md). **UNKNOWN** means the evidence is missing; the gaps are listed in section 12.

## Glossary for a reader new to the codebase

| Term | Meaning |
|---|---|
| NISR | National Institute of Statistics of Rwanda, publisher of the surveys and reports |
| EICV7 | Integrated Household Living Conditions Survey, 7th round (2023/24). Source of every headline figure |
| EICV3-5 | Earlier survey rounds, used only for trend/panel views, not for headline figures |
| FinScope | Financial-inclusion survey (2012, 2016, 2020, 2024), used for the "access strand" views |
| VUP | Vision Umurenge Programme, a social-protection programme; "VUP participation" is a survey answer, not eligibility or payment |
| PSU / strata | Primary sampling unit (cluster `clust`) and sampling stratum (`strata_id`) used for variance |
| Oaxaca-Blinder | Split of the gap between a district and Rwanda into a part lined up with measured factors and a leftover part |
| Verification | Comparison of engine numbers with rows parsed from NISR PDFs (no AI) |

## 1. Executive architecture summary

1. **What it is.** A local, single-user toolchain: a React page starts a Python worker per district; the worker computes weighted EICV7 estimates, a bootstrap Oaxaca-Blinder decomposition, FinScope/trend views, checks a fixed list of claims against NISR PDFs, calls a hosted LLM once for a reference-selecting "review", and exports PDF/XLSX. A separate Node layer writes the narrative report and chat answers on request. Everything is files under `investigations/`.
2. **Where it runs.** Only inside the Vite dev server (`apply: 'serve'`, host and origin check for localhost, no authentication). No database, queue, or production deployment exists. Supabase hosts only USSD and a chart Q&A function that do not call the engine.
3. **AI.** Providers Groq `openai/gpt-oss-120b` then NVIDIA `nemotron-3-ultra-550b-a55b`, tried in order. No Ollama, no key rotation, no agents or tool loops. AI writes prose and selects references; it does not compute or verify.
4. **Statistics.** Population-weighted headcount and other rates from NISR microdata; Taylor-linearised SEs by strata/cluster; weighted linear probability model with stratified PSU bootstrap (300 draws, seed 20240117) for the decomposition; FGT gap/severity; reliability grades by relative SE.
5. **Evidence verification.** Static list of 6 official + 18 additional URLs; PDF text cached by hash; regex row extraction for 9 hard-coded claims; statuses `verified_match`, `discrepancy_requires_review`, `methodology_mismatch`, `not_externally_verified`, `new_analytical_finding`.
6. **Headline answer.** The engine has *some* independent checks (hard-coded national figures, NISR SE comparison, arithmetic identities, tests with planted drivers) but **no runtime independent re-computation**, and its evidence verification can silently reduce to near-zero when source retrieval fails while the report is still produced.
7. **Kamonyi case.** Computed figures (39.7, 27.4, 29.1, 9.2, decomposition) are all present in stored checkpoints. The "1 of 15 matches" result arose because 20 of 24 official sources failed to download; the one match is a self-comparison; the AI "sentence correction" was a false positive that added an unrelated claim.

## 2. Complete system architecture (Diagram 1)

```mermaid
flowchart TB
  subgraph UI["Browser - React (Vite dev)"]
    DI["DistrictInvestigation.jsx - start, poll 1800 ms, resume, review"]
    UAR["useAiReport.js - GET or POST ai-report"]
    RA["ReportArtifact.jsx - report view and downloads"]
    RE["reportExport.js - HTML, Markdown, PDF via html2canvas and jsPDF"]
    CH["InvestigationChat.jsx and Notebook.jsx"]
  end

  subgraph API["Vite middleware vite-api.mjs - localhost only, dev server only"]
    RT["investigationApi routes: run, resume, run-id, result, catalog, report-pdf-xlsx, ai-report, chat, notebook, sources, upload, sites, review, board"]
    WK["workers Map, resuming Set, changing Set - in-memory concurrency guards"]
  end

  subgraph PY["Python worker - tools/investigation/engine.py"]
    ENG["Investigation.run and _run - 8 checkpointed stages, OS file lock, 10 s heartbeat"]
    CAT["catalog.discover - file and variable inventory"]
    SRC["sources.check_sources - 24 registered URLs, 4 threads"]
    STAT["analysis.calculate_eicv7, context, reliability, drivers"]
    FIN["finance.py and finscope2012 2016 2020, trends.py"]
    VER["verification.verify_evidence"]
    RES["results.py, diagnosis.py, brief.py, problem_profile.py, provenance.py"]
    AIPY["ai.review_evidence - LLM reference selector"]
    REP["reports.export_reports - PDF via reportlab, XLSX via xlsxwriter"]
  end

  subgraph NODE["Node LLM layer - inside Vite process"]
    LLM["llm.mjs complete - provider order Groq then NVIDIA"]
    AIR["ai-report.mjs buildDigest, writeAiReport, unmatchedNumbers"]
    TPL["reportTemplate.js assembleReport, reportChecks.js reviewText, reportVerification.js"]
    AIC["ai-chat.mjs answerInvestigationQuestion, validateActions"]
    AIN["ai-notebook.mjs organizeNotebook"]
    WEB["web-source.mjs, site-index.mjs, data-platform.mjs, browser-render.mjs"]
  end

  subgraph DATA["Local data - Data folder"]
    E7["EICV7 2023-24 zip and VUP zip"]
    EH["EICV3-4 panel, EICV4 and EICV5 zips"]
    FS["FinScope 2012 sav, 2016 sav, 2020 zip, 2024 dta"]
  end

  subgraph STORE["investigations folder - JSON files, no database"]
    RUNS["runs by id: manifest, stage JSON 01 to 08, events.jsonl, lease, findings, action-plan, ai-report, chat, investigation.pdf and xlsx"]
    CACHE["cache: catalog by data signature, data-platform catalog, crawled sites"]
    SC["source-cache: NISR PDFs by sha256, text extracts, metadata JSON"]
    TR["trash: deleted runs, recoverable"]
  end

  subgraph EXT["External services"]
    NISR["statistics.gov.rw EICV7 PDFs and HTML pages"]
    OTH["LODA, World Bank API, DHS, WFP, FAO, UNDP, UNICEF, ministries and others"]
    DGR["api.data.gov.rw catalogue"]
    GROQ["Groq - openai/gpt-oss-120b"]
    NV["NVIDIA - nemotron-3-ultra-550b-a55b"]
    ANY["Analyst-supplied websites and uploaded files"]
  end

  subgraph SB["Supabase - NOT connected to the engine"]
    CI["functions/chart-insight - Groq only"]
    US["functions/ussd"]
  end

  DI --> RT
  UAR --> RT
  CH --> RT
  RA --> RE
  RT --> WK
  RT -->|spawn detached child| ENG
  ENG --> CAT --> E7
  CAT --> EH
  CAT --> FS
  ENG --> SRC --> NISR
  SRC --> OTH
  SRC --> SC
  ENG --> STAT --> E7
  ENG --> FIN --> FS
  FIN --> EH
  ENG --> RES
  ENG --> VER
  VER --> SC
  ENG --> AIPY --> GROQ
  AIPY --> NV
  ENG --> REP
  ENG --> RUNS
  CAT --> CACHE
  RT --> AIR
  RT --> AIC
  RT --> AIN
  AIR --> LLM
  AIC --> LLM
  AIN --> LLM
  LLM --> GROQ
  LLM --> NV
  AIR --> TPL
  WEB --> ANY
  WEB --> DGR
  RT --> WEB
  AIR --> RUNS
  RT --> RUNS
  RT --> TR
  CI -.->|separate path, not engine| GROQ
```

Layers: browser (`src/pages/DistrictInvestigation.jsx`), Vite middleware (`tools/investigation/vite-api.mjs`), Python worker (`tools/investigation/engine.py`), Node LLM layer (`llm.mjs`, `ai-report.mjs`, `ai-chat.mjs`), data (`Data/`), file store (`investigations/`). Detail: [01](01-current-system-architecture.md).

## 3. End-to-end execution sequence (Diagram 2)

```mermaid
sequenceDiagram
  autonumber
  actor User as Analyst
  participant UI as React UI
  participant API as Vite middleware vite-api.mjs
  participant PY as Python worker engine.py
  participant DATA as Data folder
  participant SRC as NISR and other sources
  participant FS as investigations folder
  participant LLMP as Groq then NVIDIA
  participant NODE as Node AI layer

  User->>UI: choose district, press run
  UI->>API: POST run district
  API->>API: check localhost, district in aggregates JSON, python exists
  alt a live run for this district exists
    API-->>UI: 200 reused id
  else new run
    API->>FS: write manifest Pending
    API->>PY: spawn detached python -m engine run
    API-->>UI: 202 id Pending
  end
  loop every 1.8 s
    UI->>API: GET run id
    API->>FS: read manifest, events, lease
    API-->>UI: stage statuses, interrupted flag
  end
  PY->>FS: lock file, heartbeat thread
  PY->>DATA: data_signature sha256 of every file
  Note over PY: stage 1 Discovering Data
  PY->>DATA: catalog.discover or load cached catalog for same signature
  Note over PY: stage 2 Checking Sources
  PY->>SRC: 24 HTTPS fetches, 4 threads, 15 s socket and 60 s budget
  alt fetch fails
    SRC-->>PY: error recorded, status Failed
    PY->>FS: look for cached copy in earlier run registers
    Note over PY: stage becomes Warning and the run CONTINUES
  end
  Note over PY: stage 3 Connecting Datasets - same-survey table check only
  Note over PY: stage 4 Analyzing Evidence
  PY->>DATA: read EICV7 dta files from zip
  PY->>PY: weighted rates, Taylor SE, reliability grades, Holm tests
  PY->>PY: compare SE with NISR Table A9.23 - needs eicv7-main source
  alt official SE unavailable
    PY->>PY: set uncertainty_validated false, conclusions become Uncertainty validation required
  end
  Note over PY: stage 5 Finding Drivers
  PY->>PY: Oaxaca-Blinder, 300 bootstrap draws, consumption view
  PY->>DATA: FinScope 2024, 2020, 2016, trends, each wrapped so failure becomes Unavailable
  PY->>PY: diagnose runs here but is NOT a checkpointed stage
  Note over PY: stage 6 Comparing Districts - 3 same-province comparators
  PY->>PY: prepare_findings writes findings.json outside a stage
  Note over PY: stage 7 Reviewing Solutions
  Note over PY: stage 8 Preparing Findings
  PY->>PY: action plan, brief, provenance, problem profile
  PY->>PY: verify_evidence reads cached PDFs, compares to NISR tables
  PY->>LLMP: ai.review_evidence JSON selector, sequential fallback
  alt both providers fail
    LLMP-->>PY: timeout or HTTP error
    PY->>PY: ai_review Warning, findings retained
  end
  PY->>FS: export investigation.pdf and xlsx, write 08 checkpoint
  PY->>FS: manifest Completed or Warning
  UI->>API: GET result id and GET ai-report id
  API-->>UI: findings JSON, or 404 no AI report yet
  User->>UI: ask for AI report
  UI->>API: POST ai-report id
  API->>NODE: writeAiReport
  NODE->>NODE: buildDigest from findings
  NODE->>LLMP: complete json, up to 2 attempts per provider
  LLMP-->>NODE: JSON report parts
  NODE->>NODE: clean, assembleReport, reviewText corrections, unmatchedNumbers
  NODE->>FS: ai-report.json
  API-->>UI: report, provider, unmatched_numbers
  User->>UI: download
  UI->>UI: HTML Markdown or PDF built in browser from the DOM
  UI->>API: GET report id pdf or xlsx
  API-->>UI: Python-built PDF or XLSX file
```

Key facts: entry `POST /__local/investigations/run`; district validated against `src/data/dashboard-eicv7-aggregates.json`; progress via `manifest.json`, `events.jsonl`, 10 s lease heartbeat, UI polling every 1.8 s; eight stages named `Discovering Data` to `Preparing Findings`; **source failures only warn; no stage blocks report creation**. Detail: [02](02-investigation-workflow.md).

## 4. Statistical processing architecture (Diagram 3)

```mermaid
flowchart TB
  subgraph IN["Inputs - Data zip and dta files"]
    Z7["EICV7 cross-section zip: poverty file, household, person, S9D1 to S9D5 VUP, S9B, S10A, S10B, S10C, S5F"]
    HIST["EICV3-4 panel, EICV4 and EICV5 zips, FinScope 2012 2016 2020 2024"]
  end

  subgraph CORE["analysis.py - calculate_eicv7"]
    RD["_read - pandas.read_stata with Latin-1 fallback notice"]
    WP["weighted_percentage - valid mask, strict positive weights"]
    GATE["national gate: poverty must equal 27.4 and insurance 85.3 or ValueError"]
    CMP["comparators - 3 same-province districts nearest in poverty rate"]
  end

  subgraph UNC["Uncertainty"]
    CTX["context.py design_variance - ultimate-cluster Taylor, strata_id and clust, normal 1.96, no FPC"]
    HOLM["context.investigate_context - pairwise gap SE, p-value, Holm adjustment"]
    REL["reliability.py - domain_ratio, grade by relative SE, assess_district"]
    SEV["engine.analyze - compare own SE with NISR Table A9.23 within 0.1 pp"]
  end

  subgraph DRV["drivers.py - Oaxaca-Blinder"]
    BF["build_frame - 40 household variables, 2 percent missing cap, weighted-mean fill"]
    VAL["validate_education_work - reproduce 6 NISR person figures or stop"]
    FIT["_fit - weighted least squares linear probability model with 1e-8 ridge"]
    STAT["_statistics - contribution = beta times district mean minus national mean"]
    BOOT["decompose - stratified PSU bootstrap, 300 draws, seed 20240117"]
    CON["consumption_view - same split on log consumption, 150 draws, 5-fold cluster CV R2"]
    DEP["_depth - poverty gap FGT1 and severity FGT2"]
    PLC["_place_effect - district mean residual"]
    GRD["_grade - interval excludes zero and sign stability"]
  end

  subgraph OTHER["Other estimators"]
    FIN["finance.py - FinScope 2024 strand, 2000-draw bootstrap, Spearman link to poverty"]
    FS3["finscope2020.py, finscope2016.py, finscope2012.py - strand series and rebuild checks"]
    TRD["trends.py - EICV3 to EICV5 old method, modelled 2016/17 to EICV7, panel mobility, Holm"]
    PRO["problem_profile.py - z versus Rwanda, tiers"]
  end

  subgraph SER["Result serialisation"]
    JS["engine.write_json - atomic temp file then replace_file"]
    CK["stage checkpoints 01 to 08 and findings.json"]
  end

  Z7 --> RD --> WP --> GATE --> CMP
  CMP --> CTX
  WP --> REL
  CTX --> REL
  CTX --> HOLM --> SEV
  Z7 --> BF --> VAL --> FIT --> STAT --> BOOT --> GRD
  BF --> CON
  BF --> DEP
  FIT --> PLC
  HIST --> FIN
  HIST --> FS3
  HIST --> TRD
  FIN --> PRO
  TRD --> PRO
  GRD --> PRO
  GATE --> JS
  SEV --> JS
  BOOT --> JS
  CON --> JS
  FIN --> JS
  TRD --> JS
  JS --> CK
```

Detail and the list of what is *not* implemented (no design effects for the decomposition, no replicate weights, no nonlinear decomposition): [03](03-statistical-engine.md).

## 5. AI orchestration architecture (Diagram 4)

```mermaid
flowchart LR
  subgraph PYAI["Python path - stage 8"]
    PE["providers_from_env - keys by prefix, dedupe, INVESTIGATION_NO_AI disables"]
    RV["review_evidence - temperature 0, max 2000 tokens, response_format json_object"]
    CP["call_provider - 90 s timeout, one retry on short 429, daily limit not retried"]
    VR["validate_review and validate_narrative - IDs, 400 chars, numbers present in context, no causal words"]
  end

  subgraph NDAI["Node path - on analyst request"]
    BP["buildProviders - Groq key then NVIDIA key, dedupe, prefix nvapi- selects NVIDIA"]
    CO["complete - provider loop, 90 s abort, 429 retry once, JSON parse retry once, lenientJson repair"]
    DG["buildDigest - top 5 findings, directions, verification registry up to 12, drivers top 8, ranked drivers, brief"]
    WR["writeAiReport - max 3800 tokens, temperature 0.2"]
    AS["assembleReport - reviewText direction fix, CAUSAL regex swaps, glossary brackets"]
    UM["unmatchedNumbers - lists numbers not in digest, does not block"]
    CHT["answerInvestigationQuestion - temperature 0.3, 1200 tokens, sources and platform passages"]
    VA["validateActions - 5 allowed types, max 3, district names checked"]
    NB["organizeNotebook and summarizeSource and describeImage"]
  end

  subgraph MODELS["Hosted models"]
    G["Groq openai/gpt-oss-120b - reasoning_effort low, vision qwen/qwen3.8-27b"]
    N["NVIDIA nemotron-3-ultra-550b-a55b - thinking off, vision llama-3.2-11b-vision"]
  end

  subgraph NOAI["Deterministic code - no LLM"]
    ST["Statistics: analysis, drivers, reliability, context"]
    VF["verification.verify_evidence - regex table rows, decide"]
    FD["results.prepare_findings and diagnosis and brief"]
  end

  subgraph SEP["Separate path"]
    CI["chart-insight - Groq only, MODEL constant"]
  end

  ST --> FD --> DG
  VF --> DG
  FD --> RV
  PE --> RV --> CP --> G
  CP -->|on failure next provider| N
  CP --> VR
  DG --> WR --> CO
  BP --> CO
  CO --> G
  CO -->|on failure next provider| N
  CO --> AS --> UM
  DG --> CHT --> CO
  CHT --> VA
  CO --> NB
  CI --> G
```

Seven call sites (Python reviewer, report writer, chat, notebook, source/image summaries, chart Q&A, key check). Validators differ per site; the strictest is the Python reviewer, the loosest are chat and notebook (numbers flagged only). Detail: [04](04-ai-orchestration.md).

## 6. External evidence verification architecture (Diagram 5)

```mermaid
flowchart TB
  subgraph REG["Source registry - static"]
    OS["sources.OFFICIAL_SOURCES - 6 PDFs: eicv7-main, eicv7-poverty, eicv7-method, eicv7-vup, eicv7-utilities, loda-vup-design"]
    AD["registry.ADDITIONAL_SOURCES 18 and load_extra from extra_sources.json - html and worldbank-api kinds"]
  end

  subgraph FETCH["Retrieval - sources.check_sources then verify_source"]
    TP["ThreadPoolExecutor 4 workers"]
    GET["urlopen HTTPS only, 15 s timeout, 60 s budget, 12 MB cap, same_site redirect rule, must start with PDF magic"]
    CND["conditional GET with ETag and Last-Modified"]
    HASH["sha256 file name in source-cache, metadata JSON, pypdf page count and excerpt"]
    FB["fallback: cached_evidence from earlier run register 02-checking-sources.json if file hash still matches"]
    ERR["status Failed with error string"]
  end

  subgraph PARSE["Parsing - verification.py"]
    TXT["sources._main_text - pypdf extract_text per page, cached as .txt, page break is form feed"]
    ROW["find_row - regex Table marker then label row with at least 4 numbers, follows up to 4 pages"]
    COLS["columns value, standard_error, lower, upper, cv, design_effect"]
  end

  subgraph MATCH["Matching and comparison"]
    CL["CLAIMS - 9 hard-coded claims: poverty district and national, extreme poverty, insurance, grid, VUP, sample size"]
    CMP["comparability - period, denominator, unit, geography, same_concept flag"]
    DEC["decide - tolerance 0.1 pp, publications spread 0.15 pp"]
    SE["standard_error_claim - own SE vs Table A9.23"]
    MOD["modelled_claim - copies NISR 2016/17 modelled value"]
    ORG["original_entries - gap, severity, explained, unexplained"]
    MR["methods_review - arithmetic and seed checks"]
  end

  subgraph OUT["Statuses and outputs"]
    S1["verified_match"]
    S2["discrepancy_requires_review"]
    S3["methodology_mismatch"]
    S4["not_externally_verified"]
    S5["new_analytical_finding"]
    SUM["summarize - unresolved counts discrepancies and Needs review only"]
    REGY["result.verification registry, audit_trail, sources"]
  end

  OS --> TP
  AD --> TP
  TP --> GET --> CND --> HASH
  GET --> ERR --> FB
  HASH --> TXT --> ROW --> COLS --> CMP
  FB --> TXT
  CL --> CMP --> DEC
  DEC --> S1
  DEC --> S2
  DEC --> S3
  DEC --> S4
  ROW -->|row missing or source unavailable| S4
  SE --> S1
  SE --> S2
  SE --> S4
  MOD --> S1
  ORG --> S5
  MR --> SUM
  S1 --> SUM
  S2 --> SUM
  S3 --> SUM
  S4 --> SUM
  S5 --> SUM
  SUM --> REGY
```

Detail, including the circular modelled-claim match and the cache fallback gap: [05](05-evidence-verification.md).

## 7. Report-generation architecture (Diagram 6)

```mermaid
flowchart TB
  subgraph CALC["Computed results - Python worker"]
    F["findings.json and 08-preparing-findings.json: findings, drivers, diagnosis, analyst_brief, verification, reliability, research, plan"]
  end

  subgraph PYOUT["Python deterministic outputs"]
    XL["reports._excel - 11 sheets, editable chart bound to Data Tables cells"]
    PD["reports._pdf - reportlab text, one HorizontalBarChart, tables"]
    ST1["investigation.xlsx and investigation.pdf in runs folder"]
  end

  subgraph NODEOUT["Node AI report path"]
    DG["buildDigest - subset of figures"]
    LLM["complete - Groq then NVIDIA"]
    CL["clean - length and shape limits"]
    AR["assembleReport - fixed 8-section order"]
    RT["reviewText - direction replacement, causal swaps, decimals"]
    EX["explainTerms - glossary brackets, first use only"]
    MT["methodologyFrom and referencesFrom - from engine results, not AI"]
    VS["verificationSection - table from registry, corrections list, sources"]
    VAL["report.validation - residual direction problems count"]
    UN["unmatchedNumbers - warning list"]
    AJ["ai-report.json"]
  end

  subgraph UI["Browser rendering"]
    RP["ReportPanel and ReportArtifact - web view, ReportCharts from result data"]
    FB["fallbackReport - when AI missing"]
    DL["DownloadMenu: downloadHtml DOM clone, downloadMarkdown, downloadPdf html2canvas and jsPDF"]
    WARN["amber footnote for unmatched numbers and unresolved flag"]
  end

  F --> XL --> ST1
  F --> PD --> ST1
  F --> DG --> LLM --> CL --> AR
  AR --> RT --> EX
  AR --> MT
  F --> VS
  AR --> VS
  RT --> VAL
  AR --> AJ
  DG --> UN --> AJ
  AJ --> RP
  F --> FB --> RP
  RP --> DL
  UN --> WARN
  WARN --> RP
```

Three independent builders (Python PDF/XLSX without AI or verification, Node AI report with verification section, browser exports). Detail: [06](06-report-generation.md).

## 8. Data lineage (Diagram 7)

```mermaid
flowchart LR
  subgraph RAW["Raw datasets - Data folder"]
    ZP["EICV7 zip: Cross_Section/CS_EICV7_poverty_file.dta - hhid, district, province, weight, pop_wt, pov_jan, epov_jan, clust, member, ur, sol_jan, Poverty_line"]
    ZH["EICV7 zip: CS_S01_S5_S7_Household.dta - s5cq14, weight, strata_id plus drivers columns"]
    ZV["EICV7 zip: CS_S9D1 to S9D5 modules - hhid, s9d1q1 Yes or No"]
    ZX["EICV7 zip: person, S9B, S10A, S10B, S10C, S5F modules for 40 driver variables"]
  end

  subgraph CALC["Computation"]
    WP["analysis.weighted_percentage by district and national"]
    PART["analysis: participants set, poverty.vup_participant"]
    BF["drivers.build_frame - household frame"]
    LPM["drivers._fit and _statistics - WLS LPM, beta x mean difference"]
    BS["drivers.decompose - 300 PSU bootstrap"]
    REL["reliability.assess_district and context Taylor SE"]
  end

  subgraph INTER["Intermediate outputs - checkpoint JSON"]
    A4["04-analyzing-evidence.json: all_districts, selected, national, comparators, contextual_analysis, reliability"]
    A5["05-finding-drivers.json: gap_points, explained_points, groups, profile, depth"]
    FJ["findings.json: poverty, modelled_change, grid_connection, vup_among_poor"]
    V8["08-preparing-findings.json: verification registry, analyst_brief, diagnosis"]
  end

  subgraph STMT["Report destinations"]
    PYR["investigation.pdf and xlsx - Python tables and prose"]
    DIG["buildDigest then LLM then ai-report.json"]
    VER["verification table section 5"]
    KN["key_numbers and main_points sentences"]
  end

  ZP -->|"pov_jan equals Poor, weight pop_wt"| WP
  ZP -->|"hhid and pov_jan"| PART
  ZV -->|"any s9d1q1 Yes"| PART
  PART -->|"weight, among poor households"| WP
  ZH -->|"s5cq14 grid values, weight, valid denominators"| WP
  WP --> A4
  ZP --> REL
  ZH --> REL
  REL --> A4
  ZP --> BF
  ZH --> BF
  ZX --> BF
  BF --> LPM --> BS --> A5
  A4 --> FJ
  A4 --> V8
  A5 --> V8
  FJ --> V8
  V8 --> PYR
  FJ --> DIG
  V8 --> DIG
  V8 --> VER
  DIG --> KN
  VER --> KN
```

Five indicators traced in [07](07-data-lineage.md): district poverty (`pov_jan`, `pop_wt`), national poverty (same, hard-gated at 27.4), electricity (`s5cq14`), VUP (`s9d1q1` in five S9D modules among poor households), Oaxaca-Blinder contribution (`drivers.decompose`).

## 9. Error handling (Diagram 8)

```mermaid
flowchart TB
  START["POST run, worker spawned"] --> DL

  subgraph DSET["Dataset loading"]
    DL["catalog.discover and calculate_eicv7 read Data folder"]
    DLF{"archive count not 1, ids not unique, labels conflict, VUP modules disagree, national not 27.4 or 85.3, unknown district"}
    DLF2["ValueError raised"]
    DISK["disk full or scratch under 2 GB - OSError, nothing saved"]
    ENC["Latin-1 fallback notice recorded as reader_warnings, calculation continues"]
  end

  subgraph STG["Stage wrapper Investigation.stage"]
    SF["stage Failed, error appended, events.jsonl, manifest Failed"]
    SW["stage Warning for soft conditions, run continues"]
    CK["checkpoint JSON per stage"]
  end

  subgraph OPT["Optional analyses"]
    OP["FinScope 2024, 2020, 2016, trends each in try-except"]
    UNV["value status Unavailable with reason"]
  end

  subgraph SRCF["Official source retrieval"]
    RF["HTTPError, URLError, TimeoutError, bad PDF, redirect off-site, non-HTTPS"]
    R304["304 Not Modified revalidates cached hash"]
    CF["cached_evidence from earlier run register"]
    RW["stage 2 Warning, claims become not_externally_verified"]
  end

  subgraph LLMF["LLM requests"]
    L1["provider 1 Groq call"]
    L429{"HTTP 429 with Retry-After at most 30 s and not daily limit"}
    L2["one retry after sleep"]
    LD["daily token limit - raised, not retried"]
    LP["next provider NVIDIA"]
    LJ["bad JSON - one more attempt then lenientJson repair - Node only"]
    LX["all providers failed: Python ai_review Warning, Node HTTP 500 and UI error"]
  end

  subgraph VALF["Validation of AI text"]
    VN["narrative sentence fails ID, length, number or causal check - dropped alone"]
    VR["whole review rejected - next provider"]
    VC["clean throws incomplete report"]
    VD["direction contradiction - sentence replaced and logged"]
    VU["unmatched numbers - footnote only"]
  end

  subgraph RPTF["Report generation"]
    PE["exception in prepare or export - stage 8 Failed"]
    FR["fallbackReport when AI absent"]
    UE["browser export error message"]
  end

  subgraph RECOV["Recovery"]
    HB["lease heartbeat older than 120 s - reported as Failed interrupted"]
    WF["child exit non-zero - watchWorker marks manifest Failed"]
    RES["POST resume - reuse Completed and Warning checkpoints, refuse if data signature changed"]
  end

  DL --> DLF
  DLF -->|yes| DLF2 --> SF
  DL --> DISK --> SF
  DL --> ENC --> SW
  SF --> WF --> RES
  HB --> RES
  RES --> CK
  OP -->|exception| UNV
  RF --> R304
  RF --> CF
  RF --> RW --> SW
  L1 --> L429
  L429 -->|yes| L2 --> LP
  L429 -->|daily| LD --> LP
  L1 -->|other HTTP error or timeout| LP
  LP --> LX
  L1 --> LJ
  VN --> VR
  VR --> LP
  VC --> UE
  PE --> SF
  LX --> FR
```

Detail: [08](08-error-handling.md). Not implemented: automatic retries of a run, alerting, circuit breakers, blocking on unverified evidence.

## 10. Component inventory summary

50 components catalogued in [09](09-component-inventory.md): 40 implemented and confirmed, 1 partial (`variable_checks.py`, test-only), 7 not implemented (official-publication discovery, Excel retrieval, key rotation, Ollama, database/queue, approval workflow, runtime independent recomputation), 1 referenced but not found (Base44 backend), 1 unknown (production hosting).

Core implemented components: `engine.Investigation`; `analysis.calculate_eicv7`; `context.design_variance`; `reliability.assess_district`; `drivers.decompose` and `consumption_view`; `finance`, `finscope2012/2016/2020`, `trends`; `sources.check_sources`; `verification.verify_evidence`; `ai.review_evidence`; `llm.complete`; `ai-report.writeAiReport`; `reportTemplate.assembleReport`; `reportChecks.reviewText`; `reports.export_reports`; `vite-api.investigationApi`.

## 11. Critical weaknesses

| ID | Severity | Weakness |
|---|---|---|
| W1 | Critical | The single "verified match" in Kamonyi is a copy of the NISR value into both fields (`verification.py:289-292`) yet it drives the headline "1 of 15 match" |
| W2 | Critical | Report/PDF produced after 20 of 24 official sources failed; `unresolved: 0` because only discrepancies count; export has a warning prop only |
| W3 | High | `reportChecks.reviewText` flagged a true VUP sentence (the pattern for "poor households" also means poverty) and replaced it with a two-claim sentence (reproduced offline) |
| W4 | High | `unmatchedNumbers` is a footnote; "never say verified" is prompt-only; the Python number check is context-wide, not per-claim |
| W5 | High | `verify_source` fallback ignores `source-cache/<id>.json`; a valid cached `eicv7-main` PDF went unused |
| W6 | High | No runtime second implementation; only hard-coded 27.4/85.3, one SE check (needs a live PDF), arithmetic identities |
| W7 | High | Definition equivalence is hand-flagged; grid never verifies, VUP has no comparator |
| W8 | High | Taylor SE (no FPC, normal limits) and decomposition inference not corroborated beyond the poverty SE |
| W9-W17 | Medium/Low | Provider inconsistency, narrative non-reproducibility, citations of failed sources, digest omits reliability grades, scale-out limits, poor auditability, no authentication, doc drift, unstaged steps |

Full register with code evidence and the ten focus-question answers: [10](10-architectural-weaknesses.md).

**Direct answers.** Independent statistical verification at runtime: **No**. Independent evidence verification: **Partly** (deterministic and non-AI, but a fixed claim list and brittle when sources fail). Critical paths that bypass validation: **Yes** - source failure to report/export (W2); self-referential verified match (W1); AI narrative numbers outside the Python reviewer (W4).

## 12. Questions requiring further investigation

Full list in [12](12-open-questions.md). Highest value first:

1. Raw LLM prompts/responses and the reason both providers failed in stage 8 (not stored).
2. Whether earlier run registers existed at 18:55Z (cache fallback), and the contents of the three trashed Kamonyi runs.
3. A re-run of `calculate_eicv7` and `decompose` to prove numeric reproducibility (not done here).
4. NISR design-based SEs for VUP, grid and insurance to test the Taylor approximation.
5. Sensitivity of the Oaxaca-Blinder shares to the reference coefficients and to a logit specification.
6. Intended production topology (the only API is a dev-server plugin).

## Evidence base of this audit

Code read in full: `engine.py`, `analysis.py`, `drivers.py`, `context.py`, `reliability.py`, `verification.py`, `sources.py`, `ai.py`, `results.py`, `reports.py`, `vite-api.mjs`, `llm.mjs`, `ai-report.mjs`, `ai-chat.mjs`, `reportChecks.js`, `reportVerification.js`, `reportTemplate.js`, `reportData.js`; outlines of the remaining modules. Stored artifacts: Kamonyi run `1d3f9adc-17ba-44ba-b52a-56597f243a69`. Tests run: Node 41/41 pass; `test_verification` 27/27 pass. Mermaid diagrams were validated with a structural linter, not the official parser (see README).
