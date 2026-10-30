# 12 - Open Questions and Missing Evidence

Each item states what could not be established and what evidence would settle it. None is answered by assumption.

## Execution history

1. **What exactly did the LLM receive and return for Kamonyi?** Prompts, digests and raw responses are not stored. Needed: request/response logging (or the Vite process output) for 2026-10-29 19:10Z.
2. **Why did the Python AI review fail?** Both providers returned timeouts/URL errors (127 s). Whether this was local connectivity (also affecting the 20 failed source fetches in the same minutes) or provider-side cannot be determined from stored data.
3. **What happened in the three other Kamonyi runs (08:20Z, 11:03Z, 12:38Z)?** They are in `investigations/trash/`; only status and start time were read. Their verification counts would show whether "1 of 15" is typical.
4. **Were earlier run registers present at 18:55Z to feed the cache fallback?** `previous_id` was null; other districts' runs may have existed. Needed: file timestamps of `investigations/trash/*` deletion vs the Kamonyi start.
5. **Were FinScope and trend modules `Completed` or `Unavailable` for Kamonyi?** Checkpoint `05-finding-drivers.json` was not inspected per module.

## Data and statistics

6. **How were `pop_wt`, `strata_id`, `clust`, `Poverty_line`, `sol_jan` constructed by NISR?** The engine trusts them; no documentation inside the repository was cross-checked line by line.
7. **Do the Taylor SEs for VUP, grid and insurance agree with NISR's design-based values?** No official district tables are compared for these; needed: NISR design-based SE tables or replicate weights.
8. **Is the pooled-reference Oaxaca-Blinder split stable to the choice of reference coefficients?** The code uses all-Rwanda coefficients (district included); no sensitivity analysis exists in the repo.
9. **Does the decomposition's weighted LPM give consistent results with a logit-based decomposition?** Not implemented; the assumption is stated in `verification.methods_review`.
10. **Reproducibility under a new run**: stats are seeded and signature-checked, but this audit did not re-run `calculate_eicv7`/`decompose`. Needed: a re-run comparing numeric outputs with checkpoint `04`/`05`.
11. **Is `variable_checks.py` meant to run in production?** It is imported only by tests; its role in "Used" marking is test-only.

## Verification and evidence

12. **Parsing robustness of `find_row` across NISR PDF versions.** Only the cached 2025-07 files were available; behaviour on republished PDFs is unknown.
13. **Is the verification registry intended to include indicators beyond the nine `CLAIMS`?** The module header suggests extensibility but only these are coded.
14. **Why does `modelled_claim` count as a verified match?** Intent (showing NISR's modelled figure was reproduced from the annex) vs effect (a copy that cannot fail) should be settled by the owner.
15. **Does `extra_sources.json` exist elsewhere?** `load_extra()` reads it but the file is absent; analyst-added official sources therefore cannot currently reach `verification.py`.

## AI and reporting

16. **Should provider choice be recorded in the report body?** Currently only `ai-report.json` carries provider/model.
17. **Is staleness between `ai-report.json` and `08-preparing-findings.json` surfaced to users?** Only `generated_at` appears; UI logic for staleness was not traced.
18. **How is `ReportCharts.jsx` data bound?** Not traced line by line.
19. **PDF fidelity**: the browser PDF is rasterised; fidelity vs on-screen report was not tested.

## Deployment and operations

20. **Where is the engine meant to run in production?** Only a local Vite dev middleware exists; `AGENTS.md` references Base44, `base44/` is deleted, Supabase holds only USSD and chart functions.
21. **Concurrency across processes**: the in-memory `workers` map is per Vite process; only the per-run file lock protects against double execution.
22. **CI**: no CI configuration was found; whether tests are run automatically is UNKNOWN.
23. **Historical EICV datasets in narrative**: trends exist as code, but whether any downstream report text uses EICV3-5 directly (rather than modelled series) was not checked beyond `trends.py` docstring and `PUBLISHED_*` constants.

## Not tested in this audit

* Full Python suite (`test_investigation.py`), type-check, lint.
* Any live network call to NISR or LLM providers.
* Browser-side rendering of the report.
