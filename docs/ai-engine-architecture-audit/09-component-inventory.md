# 09 - Component Inventory

Status vocabulary: **IC** = Implemented and confirmed in code; **PI** = Partially implemented; **RNF** = Referenced but not found; **NI** = Not implemented; **UNK** = Unknown. "Confirmed" means the source was read; it does not imply the component was exercised on the Kamonyi run unless noted (see [11](11-kamonyi-execution-trace.md)). Paths are relative to the repo root.

| # | Component | Responsibility | File path | Main functions | Inputs | Outputs | Dependencies | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Investigation page | Start/poll/resume runs, history, report panel | `src/pages/DistrictInvestigation.jsx` | `start`, `loadState`, `runChatAction`, `deleteHistory` | analyst clicks | API calls | `investigationApi.js`, `useAiReport` | IC |
| 2 | API client | fetch wrapper `/__local/investigations` | `src/lib/investigationApi.js` | `request`, `uploadFile` | path, body | JSON | fetch | IC |
| 3 | AI report hook | GET cached / POST write report | `src/components/investigation/useAiReport.js` | `useAiReport` | run id | `{status,data}` | API | IC |
| 4 | Report view and export | render, warn, download | `.../ReportArtifact.jsx`, `reportExport.js`, `reportData.js` | `ReportPanel`, `downloadHtml/Pdf/Markdown`, `fallbackReport` | ai report or result | HTML/MD/PDF | `reportTemplate.js`, html2canvas, jsPDF | IC |
| 5 | Verification view | show registry, corrections, unresolved | `.../VerificationSection.jsx`, `src/lib/reportVerification.js` | `verificationSection` | `result.verification` | section model | none | IC |
| 6 | Chat and notebook UI | questions, actions, uploads | `.../InvestigationChat.jsx`, `Notebook.jsx` | `runAction` | questions | actions executed on click | API | IC |
| 7 | Local investigation API | routes, spawn worker, files, auth by host/origin | `tools/investigation/vite-api.mjs` | `investigationApi`, `watchWorker`, `interrupted`, `listHistory` | HTTP | JSON, files | `llm.mjs`, `ai-*.mjs`, Python | IC (dev server only) |
| 8 | Vite wiring | inject keys, chart endpoint | `vite.config.js` | `localChartInsight` | env | plugins | vite, loadEnv | IC |
| 9 | Engine / checkpointing | stage runner, lock, heartbeat, manifest | `tools/investigation/engine.py` | `Investigation.stage/run/_run`, `data_signature`, `history`, `main` | district, id | run folder | all Python modules | IC |
| 10 | File helper | atomic replace with retry | `fileio.py` | `replace_file` | temp, target | file | os | IC |
| 11 | Catalog | inventory files/variables, 7-Zip extraction, usage flags | `catalog.py`, `used_columns.py` | `discover`, `refresh_usage`, `version`, `check_scratch_space` | Data dir | catalog JSON | pandas, pyreadstat, 7-Zip optional | IC |
| 12 | Source registry | static source list + extra sources | `registry.py`, `sources.py` (OFFICIAL_SOURCES) | `ADDITIONAL_SOURCES`, `load_extra`, `same_site` | literals, `extra_sources.json` (**file does not exist; no extra sources configured**) | source dicts | none | IC |
| 13 | Source retrieval | HTTPS fetch, cache, hash, fallback | `sources.py` | `verify_source`, `check_sources`, `evidence_source`, `_main_text` | registry | `02-checking-sources.json`, cache | urllib, pypdf | IC (**fallback partial**, see 05) |
| 14 | Official publication discovery / search | find NISR publications automatically | - | - | - | - | - | NI |
| 15 | Excel/XLSX retrieval of official tables | download and parse NISR xlsx | - | - | - | - | - | NI |
| 16 | EICV7 headline calculation | district + national rates | `analysis.py` | `calculate_eicv7`, `weighted_percentage` | EICV7 zip | `analysis` dict | pandas, numpy, context, reliability | IC |
| 17 | Survey variance | Taylor SE, comparisons, Holm | `context.py` | `design_variance`, `investigate_context`, `ratio` | frames | SE, p, CI | pandas | IC |
| 18 | Reliability grading | RSE grades, national reconciliation | `reliability.py` | `domain_ratio`, `grade`, `assess_district`, `reconcile_national` | frames | indicator entries | context | IC |
| 19 | Driver decomposition | Oaxaca-Blinder, bootstrap, depth, place effect | `drivers.py` | `build_frame`, `decompose`, `consumption_view`, `_depth`, `_place_effect`, `_grade`, `validate_education_work` | EICV7 modules | drivers dict | analysis (`_read`) | IC |
| 20 | Poverty gap and severity (FGT) | FGT1/FGT2 | `drivers.py` | `_depth` | frame | depth blocks | - | IC |
| 21 | Bootstrap estimation | stratified PSU, fixed seed | `drivers.py` | `decompose`, `consumption_view`, `_strata_clusters` | frame | CI, stability | numpy | IC |
| 22 | Diagnosis | rank drivers, hypotheses, research requests | `diagnosis.py`, `knowledge.py` | `diagnose`, `LIBRARY` | analysis, drivers, sources | diagnosis | - | IC (runs outside a stage) |
| 23 | FinScope 2024 | strand, association | `finance.py` | `finscope_access`, `assign_strand`, `reconcile`, `association` | `.dta` | access dict | pandas | IC (**not executed** if file missing -> Unavailable) |
| 24 | FinScope trend/series | 2012, 2016, 2020, 2024 | `finscope2012.py`, `finscope2016.py`, `finscope2020.py` | `summary`, `financial_series`, `finscope_trend` | sav/zip | series | finance | IC |
| 25 | Poverty trends | EICV3-5, modelled, panel | `trends.py` | `trend_analysis`, `load_rounds`, `panel_mobility`, `holm` | zips, sav | trends | pandas, pyreadstat | IC |
| 26 | Variable validation | recompute NISR published national figures | `variable_checks.py` | `calculate`, `run_checks` | Data | validated column sets | pandas | PI (imported only by `test_investigation.py`; **no call from `engine.py` or the API**; its results are not part of any run) |
| 27 | Problem profile | where district differs, z tiers | `problem_profile.py` | `build_profile` | analysis etc. | profile | - | IC |
| 28 | Findings and plan | findings, research options, draft plan | `results.py`, `brief.py`, `provenance.py` | `prepare_findings`, `research_options`, `draft_action_plan`, `analyst_brief`, `data_used` | analysis | findings, plan | sources | IC |
| 29 | Evidence verification | claim registry, comparison, statuses | `verification.py` | `verify_evidence`, `check_claim`, `find_row`, `decide`, `standard_error_claim`, `modelled_claim`, `methods_review`, `summarize` | analysis, sources | `result.verification` | sources, pypdf text | IC (**partial: PDF only; fixed 9 claims**) |
| 30 | AI evidence reviewer | LLM selects references + narrative | `ai.py` | `review_evidence`, `call_provider`, `validate_review`, `validate_narrative`, `providers_from_env` | findings context | `ai_review` | urllib | IC (failed on Kamonyi) |
| 31 | Node LLM client | provider loop, retry, JSON repair, vision | `llm.mjs` | `buildProviders`, `complete`, `describeImage`, `lenientJson` | prompts | text/JSON | fetch | IC |
| 32 | AI report writer | digest, prompt, clean, assemble | `ai-report.mjs` | `buildDigest`, `writeAiReport`, `unmatchedNumbers`, `clean` | findings | `ai-report.json` | llm, reportTemplate | IC |
| 33 | Report template | 8-section layout, glossary, corrections | `src/lib/reportTemplate.js`, `reportChecks.js` | `assembleReport`, `explainTerms`, `reviewText`, `directionProblems`, `factsFrom` | parts, result | report | - | IC |
| 34 | Chat | answers, actions, citations | `ai-chat.mjs` | `answerInvestigationQuestion`, `validateActions`, `splitActions` | messages | reply | llm, web-source, data-platform, site-index | IC |
| 35 | Notebook | summarise chat/review | `ai-notebook.mjs` | `organizeNotebook` | entries | notebook | llm | IC |
| 36 | Web/file ingestion | SSRF-guarded fetch, text extraction, summaries | `web-source.mjs`, `read_document.py` | `fetchWebSource`, `assertPublicUrl`, `summarizeSource`, `readFileWithPython` | URL/file | source item | dns, python | IC |
| 37 | Site crawler | robots-aware crawl, rendered pages | `site-index.mjs`, `browser-render.mjs` | `crawlSite`, `startCrawl`, `searchSites`, `makeRenderer` | URL | cached pages | puppeteer-core, local browser | IC |
| 38 | Data platform catalogue | data.gov.rw search | `data-platform.mjs` | `loadPlatformCatalog`, `searchPlatform` | question | passages | api.data.gov.rw | IC |
| 39 | Python report export | PDF + 11-sheet XLSX | `reports.py` | `export_reports`, `_pdf`, `_excel` | prepared dict | files | reportlab, xlsxwriter | IC |
| 40 | Priority board | run all districts, rank signals | `board.py` | `build_board`, `run_missing`, `write_board` | saved profiles | `priority_board.json` | engine | IC |
| 41 | Document evidence + acceptance scripts | docs, acceptance verification | `document_evidence.py`, `verify_acceptance.py`, `check_ai.py` | `main` | runs | docs/CSV | - | IC (dev tooling) |
| 42 | Tests | regression and unit tests | `test_investigation.py` (~1300 lines, many classes), `test_verification.py` (27 tests), `*.test.mjs` (41 node tests passed) | - | - | - | unittest, node:test | IC; **no CI config found (UNK)** |
| 43 | Chart Q&A | per-chart AI answers | `supabase/functions/chart-insight/{groq.mjs,index.ts}`, `src/lib/chartAi.js` | `answerChartQuestion` | chart context | answer | Groq | IC (separate from engine) |
| 44 | Provider key rotation | multiple keys per provider, rotation | - | - | - | - | - | NI |
| 45 | Ollama / local LLM | local inference | - (docs say none) | - | - | - | - | NI (mentioned only as absent in `docs/EVIDENCE_VERIFICATION.md:49`) |
| 46 | Database / queue / background service | durable store, scheduler | - | - | - | - | - | NI |
| 47 | Report approval workflow | gate publication | `vite-api.mjs:511` returns 403 | - | - | - | - | NI (endpoints deliberately disabled) |
| 48 | Independent runtime statistical recomputation | second implementation compared at run time | - | - | - | - | - | NI (a one-off offline recomputation exists: `docs/audits/.../independent-poverty.json`) |
| 49 | Base44 backend references | legacy app | `AGENTS.md`, `package.json` (`@base44/*`) | - | - | - | - | RNF (`base44/` deleted in working tree) |
| 50 | Production hosting of the engine | deployed worker/API | - | - | - | - | - | UNK |

**Count: 50 components catalogued.** By status: Implemented and confirmed = 40 (rows 13 and 29 carry caveats about partial behaviour), Partially implemented = 1 (row 26), Not implemented = 7 (rows 14, 15, 44-48), Referenced but not found = 1 (row 49), Unknown = 1 (row 50).
