# AI Engine Architecture Audit - Ireme Insight / District Investigation Engine

Read-only reverse-engineering of the engine **as implemented on 2026-10-29** (repository commit `919a77e` with uncommitted Base44-to-Supabase migration edits). No application code was changed. Purpose: give an independent architect everything needed to redesign the engine without further explanation.

Start with [MASTER-ARCHITECTURE.md](MASTER-ARCHITECTURE.md) (self-contained). The numbered files are the detailed chapters.

| File | Contents | Diagram |
|---|---|---|
| [MASTER-ARCHITECTURE.md](MASTER-ARCHITECTURE.md) | One-document synthesis of everything below | all 8 |
| [01-current-system-architecture.md](01-current-system-architecture.md) | Components, layers, external services | 1 - flowchart |
| [02-investigation-workflow.md](02-investigation-workflow.md) | Runtime sequence, entry points, bypassed stages | 2 - sequence |
| [03-statistical-engine.md](03-statistical-engine.md) | Estimators, weighting, bootstrap, decomposition | 3 - flowchart |
| [04-ai-orchestration.md](04-ai-orchestration.md) | Providers, prompts, validators, correction | 4 - flowchart |
| [05-evidence-verification.md](05-evidence-verification.md) | NISR retrieval, parsing, matching, statuses | 5 - flowchart |
| [06-report-generation.md](06-report-generation.md) | PDF, XLSX, AI report, HTML export | 6 - flowchart |
| [07-data-lineage.md](07-data-lineage.md) | Five indicators from raw variable to report | 7 - flowchart |
| [08-error-handling.md](08-error-handling.md) | Implemented failure handling only | 8 - flowchart |
| [09-component-inventory.md](09-component-inventory.md) | 50 components with status | - |
| [10-architectural-weaknesses.md](10-architectural-weaknesses.md) | 17 weaknesses, severity-ranked, plus the 10 focus questions | - |
| [11-kamonyi-execution-trace.md](11-kamonyi-execution-trace.md) | Kamonyi case study: designed vs proven | - |
| [12-open-questions.md](12-open-questions.md) | UNKNOWN items and the evidence needed | - |

## Method and evidence rules

* Read every Python module in `tools/investigation/` that participates in a run, the Node API and LLM layer, the report template/check libraries, the UI hooks that call them, and the stored run `investigations/runs/1d3f9adc-17ba-44ba-b52a-56597f243a69` (Kamonyi).
* Ran existing tests only: `node --test` on 6 files (41 pass, 0 fail) and `python -m unittest tools.investigation.test_verification` (27 pass). Re-executed `reviewText` offline on stored facts to confirm the Kamonyi correction. No engine re-run, no network calls, no LLM calls.
* No secrets were read or recorded (`.env.local` was not opened; key names only).
* Terms: **UNKNOWN** = cannot be determined from code or artifacts; "designed" = what code does; "proven" = what stored artifacts show.

## Working-tree note

The working tree kept changing while this audit ran (a Base44-to-Supabase migration by another actor: `vite.config.js` lost the `@base44/vite-plugin` and gained a path alias, many `src/` files and `package.json` changed). At the end of the audit, none of the engine files read here (`tools/investigation/**`, `src/lib/report*.js`) differed from the committed versions, so the architecture described is unaffected. The only files this audit added are in this folder.

## Mermaid validation

The Mermaid CLI (`mmdc`) and the `mermaid` npm package are **not installed** in this repository, and installing them was not authorised, so the diagrams were **not parsed by the official Mermaid parser**. They were checked with a custom structural linter (diagram type header, balanced brackets and quotes, subgraph/`end` balance, sequence `alt/loop/opt` balance, unique subgraph ids, no raw parentheses or `|` inside unquoted labels). The linter reported zero issues for all 16 blocks (8 chapter diagrams plus their 8 copies in the master document) after one rule was corrected: its first pass wrongly flagged fully quoted edge labels such as `-->|"text"|`, which Mermaid accepts. The script is saved as [lint_mermaid.py](lint_mermaid.py). Treat the linter as a smoke test; paste any diagram into a Mermaid live editor to confirm rendering.

## Diagram locations

| Diagram | File |
|---|---|
| 1 Complete system architecture | `01-current-system-architecture.md` (also in MASTER section 2) |
| 2 Investigation execution workflow | `02-investigation-workflow.md` (MASTER section 3) |
| 3 Statistical analysis architecture | `03-statistical-engine.md` (MASTER section 4) |
| 4 AI model and agent architecture | `04-ai-orchestration.md` (MASTER section 5) |
| 5 Evidence verification architecture | `05-evidence-verification.md` (MASTER section 6) |
| 6 Report generation architecture | `06-report-generation.md` (MASTER section 7) |
| 7 Data lineage architecture | `07-data-lineage.md` (MASTER section 8) |
| 8 Error handling and recovery | `08-error-handling.md` (MASTER section 9) |
