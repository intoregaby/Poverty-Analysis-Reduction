# OpenCode targeted phase: Finance and financial access

Run **after Phase 0** and prior reviewed dependencies. Work in current repo, do not initialize a new project. Read MASTER_OPENCODE_PROMPT.md and AGENTS.md first.

## Scope

Implement **bank mobile money referrals agreements ledger member benefit wages reconciliation** using current Vite/React/Supabase system. Ticket range: **OPS-301..OPS-305**. Open the related `FEATURES/` files and current implementation before editing. Keep page navigation, UX tokens, i18n and existing working capabilities. No AI Engine rewrites.

## Required sequence

1. Check recent commit and existing source code, identify what is already working.
2. Inspect actual hosted/local schema and policies and design a forward-only additive migration with rollback.
3. Implement one vertical slice from durable backend -> authenticated API -> existing UI -> end-to-end test.
4. Include correct audit, idempotency, error states, data source classification and scope controls.
5. Show a cross-role demo, a denial test, a network/retry test and a mobile screenshot.
6. Report changed files, tests and blockers. Don't call it completed until passing acceptance.

## Output requirement

No mock success, real bank actions or claim of implemented income gain; if external dependencies are absent show a status and deliver a safe offline/demo mode explicitly marked. Hand off to next phase only after release gate review.
