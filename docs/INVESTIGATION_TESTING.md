# Investigation verification

Verification completed on 26 October 2026 (Africa/Johannesburg). These results cover the local analytical worker and existing National Analyst demo interface. They do not certify a hosted backend or operational authorization.

| Check executed | Result |
| --- | --- |
| Python investigation suite | 18 tests passed, including identified provider client header, clustered survey variance and analyst-brief coverage |
| Node local API and existing Groq client suites | 5 tests passed |
| ESLint on changed investigation frontend files | Passed |
| Production build | Passed; existing large-bundle and missing configuration warnings remain |
| Full-project lint | Failed with 12 pre-existing unused-import errors in unrelated programme/government components |
| Full-project typecheck | Failed with 84 existing errors; zero errors mention DistrictInvestigation or FindingGraphic |
| Gisagara actual processing | Completed with explicit catalog and published-source warnings |
| Repeat Gisagara | Same input hashes and identical aggregate values; zero poverty-rate change between runs |
| Nyanza actual processing | Completed using the same analytical code |
| Added aggregate dataset | Isolated fixture grew from 16 to 17 files and 15,988 to 15,992 variables; no duplicate analytical evidence |
| Resume original failed run | Same investigation ID; prior stages retained and failed calculation retried successfully |
| Official retrieval | Latest supported runs verified six registered NISR/LODA publications; earlier DNS/TLS failures remain in history |
| Excel | Eight sheets opened with openpyxl; editable chart references Data Tables cells; real exported values checked |
| PDF | Report rendered and visually inspected; revised edition adds a dedicated analyst-conclusion page, followed by evidence, comparisons, sources and limits |
| Browser downloads | PDF and XLSX downloaded through Chrome; their SHA256 values equal the worker's saved report files |
| Analyst review | Test request-data note saved and restored after browser reload; no operational authority granted |
| Operational writes | approve, act and follow-up endpoints returned 403; review cannot elevate a note into approval |
| Responsive UI | Chrome desktop plus 768px tablet and 390px mobile; no document horizontal overflow; chart help works through click |

Machine-readable aggregate evidence is in `docs/investigation-verification.json`. The real run IDs, calculations, exact source versions, stage events, worker heartbeat and reports are retained under the ignored `investigations/runs/` folder.

Commands executed:

```powershell
.\.venv\Scripts\python.exe -m unittest tools.investigation.test_investigation -q
node --test tools/investigation/vite-api.test.mjs supabase/functions/chart-insight/groq.test.mjs
npx eslint src/pages/DistrictInvestigation.jsx src/pages/AnalystDashboard.jsx src/components/investigation/FindingGraphic.jsx --quiet
npm run lint
npm run typecheck
npm run build
.\.venv\Scripts\python.exe -m tools.investigation.verify_acceptance
.\.venv\Scripts\python.exe -m tools.investigation.engine resume --id 1e6430ff-6f1b-46e4-b842-360f5fb56235
```

## Remaining acceptance boundaries

- The rotated Groq key has now completed a live constrained review after correcting the Python client header. Older runs retain their original Skipped/Warning status. See CONTEXTUAL_ANALYSIS.md for the update.
- Existing demo roles cannot establish trusted server permissions or geographic authorization. Approval, task creation, programme-record access and follow-up writes remain blocked.
- No approved action or verified follow-up dataset exists. No programme outcome or poverty-reduction effect is claimed.
- Additional subjects such as employment, agriculture and district financial inclusion need validated variable definitions, survey design and analytical adapters; catalog discovery does not imply analytical validity.
- Broader automated official-source search and production worker hosting remain integration work. Current retrieval is limited to the registered sources.
- The newly added CSV acceptance test verifies discovery and safe non-duplication; it does not claim automatic validation of arbitrary external datasets.

## Main files changed

- `src/pages/DistrictInvestigation.jsx`, `src/components/investigation/FindingGraphic.jsx`
- `src/pages/AnalystDashboard.jsx`, `src/App.jsx`, `src/lib/roles.js`
- `vite.config.js`, `.gitignore`
- `tools/investigation/`: discovery, validation/calculation, official sources, optional AI, results, checkpoint engine, reports, local API, tests, acceptance and documentation scripts
- `docs/`: architecture, inventory, source register, Gisagara findings and verification

The rotated local provider key completed live AI review and a chart-coverage regression check. Its value is not documented or exposed in browser data. No deployment or Git push was performed.
