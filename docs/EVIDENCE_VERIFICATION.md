# Official statistical evidence verification

Every district investigation now checks its main findings against published official evidence before a report is produced.
The engine's own numbers always come from its own calculations. Verification only reads published tables and reports what it found.

## What it does

1. The engine runs its deterministic analysis for the district.
2. `tools/investigation/verification.py` builds a **registry** of claims (poverty rate, health insurance, grid electricity, VUP, sample size, standard error, and so on).
3. For each claim it looks up the matching row in a published NISR table, in a document the engine has already retrieved over HTTPS and cached.
4. It decides whether the two figures are **comparable** (same period, population, unit, geography and definition) and only then compares the values.
5. It records one of five statuses, a citation (document, table, PDF page and printed page, version, retrieval time) and notes.
6. The report writer receives the results as data. It may report them but never decides which number is official.
7. The report's wording is checked against the data. A sentence that contradicts the numbers is replaced by one built from the data, and the replacement is shown in the report.

## Statuses

| Status | Meaning |
|---|---|
| Verified match | The internal value equals the published value within rounding (0.1 points). This confirms the value only, not the whole calculation. |
| Discrepancy requiring review | A comparable published value differs, or two official publications disagree. The internal value is never changed. Counts as an unresolved issue. |
| Methodology mismatch | The published figure measures something different (period, population, unit or definition), so a difference is not an error. |
| Not externally verified | No published figure was found, or the source could not be retrieved or read. |
| New analytical finding | The engine's own analysis with no published counterpart. |

## Where the published figures come from

Documents are fetched by `tools/investigation/sources.py` (HTTPS only, conditional requests, SHA-256 version, retrieval time) and cached in
`investigations/source-cache/`. Page text is read from the cached copy, so a table row can be cited with its PDF page and printed page.
If a document cannot be retrieved and no cached copy exists, claims that depend on it are reported as *Not externally verified*; nothing is ever
marked verified without a row that was actually read.

Tables used today (EICV7 2023/24, NISR): Main Indicators Report Tables 9.1, 9.2, A9.23, A3.7, A5.14; Utilities and Amenities Thematic Report Table B.7;
Poverty Profile annex (modelled 2016/17 estimates, labelled as modelled).

## Findings from the Rusizi report

* The sentence "Both figures are below the national averages of 50.8% and 85.3%" was wrong for electricity: 66.0% is above 50.8%. The wording check now detects and corrects it.
* Poverty 44.2% against NISR Table A9.23 (44.16%, PDF page 109) and 27.4% against Table 9.1: verified. The 95% interval 37.43 to 50.9 is NISR's published design-adjusted interval (standard error 3.43), not one the engine recalculated.
* Health insurance 78.1% and 85.3% against Table A3.7 (78.09% and 85.31%): verified.
* Grid electricity: the published tables measure "main source of lighting" (78.85% locally, 72.02% nationally), not "has a grid connection". Reported as a **methodology mismatch**, not an error.
* VUP participation: no published district table, so not externally verified.

## Limits

* A match with a publication does not prove the internal method is right; the report says so.
* Only tables listed above are parsed. Other indicators are shown as not externally verified until a table is added to `CLAIMS`.
* The wording check recognises the indicators and comparison words it knows. It cannot find every possible misstatement; the numbers it protects are the ones in the registry.
* The project has no Ollama provider. Narrative generation uses the existing Groq and NVIDIA providers with fallback; verification itself uses no AI.

## Tests

* `tools/investigation/test_verification.py`: table lookup, every comparison case (match, different year, different definition, different denominator, conflicting publications, unavailable source, missing row), the decomposition review, and the Rusizi regression against the real cached documents.
* `src/lib/reportChecks.test.mjs`, `src/lib/rusiziReport.test.mjs`, `src/lib/reportTemplate.test.mjs`: wording checks, the Rusizi correction end to end, the verification table and the Markdown export.
* `src/lib/pdfPagination.test.mjs`: page-break rules (no cut through a line, no heading alone at the foot of a page, no blank page).
