# 11 - Kamonyi Execution Trace (case study)

## Evidence base and its limits

| Evidence | Status |
|---|---|
| Stored run `investigations/runs/1d3f9adc-17ba-44ba-b52a-56597f243a69/` (district Kamonyi, status `Warning`, started 2026-10-29T18:55:42Z) | Present: `manifest.json`, stage checkpoints `01`-`08`, `events.jsonl`, `findings.json`, `action-plan.json`, `ai-report.json`, `investigation.pdf/xlsx` |
| Three more Kamonyi runs (status `Warning`, 08:20Z, 11:03Z, 12:38Z same day) | Present only as deleted runs in `investigations/trash/`; their contents were **not** examined |
| Runtime logs of the Python process and of the Vite process | **Not available**: worker stdio ignored; Vite logs not stored |
| Raw LLM request/response bodies | **Not available**; only `provider`, `model`, `generated_at` and post-processed text are stored |
| Re-execution of the engine for this audit | **Not done**; values below are read from stored checkpoints, not recomputed |

"Designed to" = what the code does. "Proven" = what the stored artifacts show happened on this run.

## Stage timeline (proven, `manifest.json` / `events.jsonl`)

| Stage | Status | Time (UTC) | Note |
|---|---|---|---|
| Discovering Data | Warning | 18:55:57-18:55:59 | 16 files, 315 tables, 15 988 variables; catalog loaded for unchanged hashes; 1 historical table unreadable |
| Checking Sources | Warning | 18:55:59-18:58:53 | 4 of 24 sources retrieved; 20 failed (SSL handshake timeouts, read timeouts, DNS failures) |
| Connecting Datasets | Completed | 18:58:53 | same-survey table check |
| Analyzing Evidence | Warning | 18:58:53-18:58:56 | `uncertainty_validated: false`, `published_se_points: null` |
| Finding Drivers | Warning | 18:58:56-18:59:24 | only 25% of gap explained by causes and access factors |
| Comparing Districts | Completed | 18:59:24 | comparators Nyaruguru 39.7, Nyanza 43.3, Gisagara 45.6 |
| Reviewing Solutions | Completed | 18:59:30 | |
| Preparing Findings | Completed | 18:59:30-19:01:39 | verification ran at 18:59:30; `ai_review` Warning: Groq timeout, NVIDIA URLError |
| AI report written (separate request) | n/a | 19:10:35 | Groq `openai/gpt-oss-120b`, `unmatched_numbers: []` |

## Figure-by-figure trace

| Reported figure | Designed producer | Stored evidence | Verdict |
|---|---|---|---|
| **District poverty 39.7%** | `analysis.calculate_eicv7` -> `weighted_percentage(pov_jan == "Poor", pop_wt)` (`analysis.py:95`) | `selected.poverty = 39.7` in `04-analyzing-evidence.json`; same value in `findings.json`; also in the one-off offline recomputation `docs/audits/nisr-judging-2026-10-29/independent-poverty.json` (Kamonyi: calculated 39.7, 484 households, which equals the engine value; that recomputation imports no engine code) | Computed by engine, proven by checkpoint. Not externally verified in this run (source unavailable). |
| **National 27.4%** | same function over all households; hard gate at `analysis.py:117` | `national.poverty = 27.4`; `national_reconciliation` matches 27.4 | Proven; the hard-coded gate guarantees it equals NISR's published value or the run would have failed. |
| **Electricity 29.1%** | `weighted_percentage` on `s5cq14` (`analysis.py:98`) | `selected.grid_connection = 29.1`, national 50.8, finding present because gap >= 5 | Proven computed. NISR tables describe lighting source; claim is a `methodology_mismatch` by design when the PDF is readable; here it was `not_externally_verified` (PDF unavailable). |
| **VUP 9.2%** | `weighted_percentage(poor, vup_participant, "weight")` (`analysis.py:97`) | `selected.vup_among_poor = 9.2`, national 15.9, reliability grade for VUP is "Use with caution" | Proven computed; no published comparator exists (`published: []`). |
| **Oaxaca-Blinder** | `drivers.decompose` (300 bootstrap draws, seed 20240117) | gap 12.32 pp (CI 5.84-19.18), explained 4.52, unexplained 7.80, explained excluding markers 3.11 (25.2%), weighted R2 0.254; largest groups: durables +2.10 (marker), livelihood +0.98, housing assets -0.92 (marker), finance +0.69, energy +0.53; water/sanitation "Not established" | Proven computed. Arithmetic identity checked by `methods_review`. Not compared with any external source (and could not be). |
| **Evidence verification "1 of 15"** | `verification.verify_evidence` -> `reportVerification.verificationSection` headline | `summary.counts`: 1 `verified_match`, 10 `not_externally_verified`, 4 `new_analytical_finding`, 0 discrepancies; audit trail shows "eicv7-main Table A9.23: source unavailable" | The count is real but misleading: see below. |
| **AI sentence correction** | `assembleReport` -> `reviewText` -> `directionProblems` + `describeFacts` | `ai-report.json` `report.verification.corrections[0]`: original "Just 9.2% of poor households report participation in a VUP component, lower than the national 15.9%." corrected to a two-claim sentence; `validation: {direction_problems:1, corrections:1}` | The correction record is proven. The false-positive cause was confirmed by re-running `reviewText` offline on the stored facts (output identical to the stored text). |

### Why only 1 of 15 matched

1. `eicv7-main` (source of Tables A9.23, 9.1, 9.2, A3.7, A5.14), `eicv7-utilities` (B.7) were `Failed` in stage 2 (SSL handshake / read timeouts) and `cached_evidence` was `None`; `eicv7-poverty` succeeded.
2. Ten claims had no readable published value, so each became `not_externally_verified` with an explicit note "could not be retrieved ... so this claim was not verified".
3. The single `verified_match` is `poverty_2016_17_modelled` (53.0 vs 53.0). `modelled_claim` assigns the NISR-annex value to **both** the internal and published fields, so it can never disagree (`verification.py:289-292`). Its note says it is "copied, not recalculated". It reads from `eicv7-poverty`, the only NISR PDF that happened to be retrievable.
4. Therefore **zero of the engine's own calculated numbers (poverty, grid, VUP, insurance, SE, sample size) were compared with an official figure in this run.** The 4 `new_analytical_finding` entries (poverty gap 10.36, severity 3.94, explained 4.52, unexplained 7.80) have no published counterpart.
5. Evidence that the mechanism works when documents are cached: `RusiziRegressionTests` in `test_verification.py` verified district and national poverty for Rusizi against the cached PDFs.

### The AI sentence correction, step by step

* Model output (before correction) is stored only as `corrections[0].original`.
* `mentionsIn(clause)` returned `["vup_among_poor","poverty"]` because "poor households" matches the poverty pattern after the VUP pattern consumed "VUP".
* `claimedDirection` -> "below" (from "lower than the national"). Fact `poverty` is `above`, so `bad = {poverty}` and the sentence was replaced by `describeFacts(["vup_among_poor","poverty"])`.
* Result: a true sentence was replaced by one containing both statements, joined with "; The poverty rate..." (capital T retained).
* The same report's third main point therefore carries the VUP direction correctly but an extra poverty claim that the original model sentence did not make.
* Other Kamonyi text not covered by any check: "Livelihood and income sources, savings and credit access, and energy access each explain part of Kamonyi's poverty gap" - the word "explain" is only softened when followed by "N percentage points".

### What the report could not say because of the failures

* No published confidence interval for headline findings (`confidence_interval: None`), so key numbers appear without intervals.
* The district comparisons carry "Uncertainty validation required" instead of significance conclusions (`engine.py:249-256`).
* Reliability grades (poverty Reliable, VUP Use with caution, etc.) exist in `reliability` and the PDF/XLSX but never reached the AI digest.

## Design vs proof summary

* **Proven executed**: all 8 stages, statistics, driver decomposition, verification module (with 20 failed sources), Python PDF/XLSX export, Groq-written report, sentence correction, evidence-check headline text.
* **Designed but not proven for this run**: the Python AI reviewer produced no output (both providers failed); no NVIDIA call succeeded; FinScope/trend analyses presumably ran (checkpoint `05` is large) but their per-module `Unavailable` states were not individually inspected here.
* **Unknown**: whether earlier run registers existed to feed the cache fallback at 18:55Z (inference: `previous_id` was `null` for Kamonyi and the `runs/` folder now holds only this run, but other districts' runs may have existed then).
