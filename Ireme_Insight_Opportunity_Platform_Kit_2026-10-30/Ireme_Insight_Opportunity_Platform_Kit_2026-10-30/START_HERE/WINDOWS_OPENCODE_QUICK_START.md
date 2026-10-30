# Windows / OpenCode — How to Use This ZIP

1. Download and extract `Ireme_Insight_Opportunity_Platform_Kit_2026-10-30.zip` in a separate folder inside your current local project checkout, e.g. `C:\Projects\Poverty-Analysis-Reduction\Ireme_Insight_Opportunity_Platform_Kit_2026-10-30`.
2. Open your **existing** Ireme project folder in terminal/VS Code. Do NOT start a new Vite project and do NOT drag draft SQL into production migrations.
3. Inspect the kit `README.md`, the kit `AGENTS.md`, and `START_HERE/*`. If your repository already has an `AGENTS.md`, do not overwrite it; merge differences in a reviewed commit.
4. Launch `opencode` from the project root (if installed). Read `PROMPTS/MASTER_OPENCODE_PROMPT.md` and paste the block marked BEGIN/END into OpenCode, pointing it at your extracted kit folder.
5. OpenCode should verify the latest repository, local changes, current Supabase database and CLI installation before writing or migrating anything.
6. Start with Phase 0. Ask the agent to create a feature gap matrix and a small, testable first PR, then continue each dependency-respecting phase. Keep the ongoing AI Engine working tree intact.
7. Use `QA/ACCEPTANCE_MATRIX.csv` to track real tested completion; do not mark a feature `PASS` because its React page merely renders.

**Do not paste real API keys, personal banking details, or restricted respondent microdata into prompts or code.**
