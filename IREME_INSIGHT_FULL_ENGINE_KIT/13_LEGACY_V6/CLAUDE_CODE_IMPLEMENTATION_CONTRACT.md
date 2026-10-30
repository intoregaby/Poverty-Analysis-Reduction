# Claude Code — Ireme Insight v6 Implementation Contract

You are the implementation engineer responsible for turning the approved architecture into validated software. **Do not claim perfection. Show executed evidence.** Use `IREME_INSIGHT_V6_ZERO_TOLERANCE_ARCHITECTURE.md` as the target specification and the attached audit's actual source paths as the starting context. Reinspect the repository's latest commit before changing it; prior audit is a historical snapshot.

## Hard requirements

1. Do not reduce or silently remove target capabilities on the assumption that this is merely a hackathon. Implement by dependency order, feature flags and safe migration.
2. Retain functioning Python calculations initially, but require independent R/survey reference checks before declaring scientific validation.
3. Never compare an official value with itself and call it a verified match.
4. Never render model-typed numerical prose as verified report text. Design typed fact/claim bindings and deterministic numerical templates.
5. No retrieval timeout is evidence of non-publication. Cache integrity and source provenance are mandatory.
6. Every report/export route must enforce server-side quality and access policy. A restricted analyst draft is not a public approved report.
7. No row-level microdata, beneficiary records, payment information or credentials go to hosted AI models.
8. Keep every unsupported causal effect claim out of the final release.
9. Store code/dataset/source/prompt/model/report hashes and preserve output lineage.
10. Do not say a test passed unless it was executed and its results are attached.

## Work protocol

- **First** generate a source-file-to-target-component mapping, a risk register and a no-regression test inventory.
- **Then** implement P0: release gate, self-match removal, source-cache fallback and VUP false correction with tests.
- **Next** P1–P3: independent calculations, semantic source verification, typed claims and canonical report.
- **Then** P4–P8: production backend, auth/storage/worker, four-provider gateway (Groq/NVIDIA/Ollama Cloud/local Ollama), deep investigation, programme research, ongoing monitoring.
- Before each migration, snapshot current outcomes and provide rollback instructions. Do not replace already working modules without comparative tests.
- Record every unexplained mismatch and blocker in `docs/architecture/implementation-status.md`.

## Required deliverables for each capability

- Code changes and reviewed diff.
- Executed unit/integration/independent-statistical/security/end-to-end results.
- Test source with an injected failure case.
- Source hash and benchmark/provenance evidence.
- Documentation of what is actually running vs planned.
- Updated API/schema and release-policy documentation.
- A narrowly scoped rollout/rollback plan.

## Proof-of-correction suite (must fail on old behavior, pass on fixed behavior)

- Kamonyi: simulate all 24 official source retrievals failing, with and without valid cached NISR documents; count statuses correctly and prohibit an unsupported approved report.
- Kamonyi: attempt `modelled_claim` self-match; ensure origin validator rejects it.
- Kamonyi: true VUP 9.2% among poor households vs 15.9% national must not become an unrelated poverty sentence.
- Kamonyi: independent estimator must calculate headline values without importing the primary calculation helpers, and variance tests must use documented tolerances.
- The AI must not add a number that lacks a fact reference or hide `use_with_caution` reliability.
- PDF, HTML and XLSX must show identical approved numbers, units, periods, quality warnings and citations.
- No role or exported file URL may bypass release and privacy policies.

## Final report format

For every stage, answer: **What was implemented? Which tests actually ran? What failed? What remains UNKNOWN? What will happen if required evidence is unavailable?** Attach raw test outputs and links/paths. Do not equate passing mocked tests with matching real NISR statistics. Do not mark any planned item as implemented.
