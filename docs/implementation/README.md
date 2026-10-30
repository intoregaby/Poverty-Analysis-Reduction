# Ireme Insight engine: implementation registry

Source of truth for what must be built and how completion is decided.

| File | Purpose |
|---|---|
| `registry.json` | Requirements (EP-01..16), the 95 kit acceptance scenarios, audit defects W1-W17, blockers, required approvals. Generated/merged by `scripts/bootstrap_registry.py`. Holds **no pass/fail verdicts**. |
| `evidence/verification_run.json` | Output of the last `scripts/verify_engine_completion.py` run (git head, per-scenario verdict, digest). |
| `evidence/*.json` | Measured real-data evidence (e.g. EICV7 microdata vs NISR Table A9.23). |
| `DECISIONS.md` | ADRs. |
| `FINDINGS.md` | Scientific/engineering findings that need a human decision. |
| `STATUS.md` | Current wave status and next actions (read this first when resuming). |
| `approvals.json` | Human sign-offs, bound to the evidence digest. Absent until real reviewers sign. |

## How verdicts are produced
`python scripts/verify_engine_completion.py` discovers `engine/tests/test_*.py`, runs them, and maps tests
decorated with `@acceptance("SCI-01", evidence="synthetic"|"real")` to scenarios. A scenario is PASS only if every
linked test passes (skips = BLOCKED), a matching `acceptance_tests` integration mapping is explicitly
recorded, and, for scenarios in `real_evidence_required`, passing real evidence exists. Without a scoped
mapping, passing tests are reported as `COMPONENT_ONLY`, not acceptance. The script exits 0 only when
all 95 scenarios pass, W1-W17 regressions pass, no blocker is open,
approvals match the current digest, and `npm test`, `npm run lint`, `npm run build` pass.

Run: `python scripts/verify_engine_completion.py` (add `--no-repo-suites` for the fast engine-only view).
Use `--offline` to suppress hosted-provider calls; those tests are explicitly skipped and completion cannot pass.
Engine tests alone: `cd engine && python -m unittest discover -s tests -t tests`.
