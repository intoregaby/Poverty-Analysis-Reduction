# System invariants and release rules

## The 15 non-negotiable invariants
**P01 Origin separation:** `computed_estimate` comes from executable raw-data calculation. `reference_estimate` comes from a separately captured official table. Never use one record to populate both values. Origin hashes and extraction steps must differ.

**P02 Typed estimands:** Every measure specifies numerator, denominator, unit, universe, weighting variable, stratum, PSU, geography, time window, transform, exclusions, and missing-value behavior. If any mandatory field is unknown, status = `definition_incomplete`.

**P03 Scientific independence:** Headline estimates and SEs must be checked by a separately maintained reference implementation (e.g. R `survey`). Independence requires separate estimator code, separate fixtures, independently reviewed mapping, and no imports of the primary estimator's computational helpers.

**P04 Semantics before numbers:** Values are comparable only after matching concept, population, unit, reference time, methodology, and spatial boundary. Matching decimal values with different meanings are not validation.

**P05 No fabricated certainty:** Confidence intervals, sampling error, model fit, missing evidence, design limitations and assumptions are explicit. `unknown` is a valid scientific output.

**P06 Exact claim binding:** Models suggest typed claim IDs and evidence IDs, never editable numerical sentences. Numeric prose, directionality and uncertainty are rendered from approved facts by deterministic templates.

**P07 Correct source statuses:** A network timeout is `retrieval_failed`; a genuinely missing published indicator is `reference_not_found_after_completed_search`; unpublished or definition-mismatched estimates are not called externally verified.

**P08 All outputs from one canonical report version:** HTML, PDF, XLSX, JSON, charts, translations and sharing endpoints must render the same frozen data and quality status.

**P09 Fail closed on critical defects:** `critical` => no approved publication, no public export, no stale signed link; restricted diagnostic drafts are permitted only for authorized reviewers with explicit warnings.

**P10 Security before AI routing:** Classify data and sanitize or aggregate before provider selection; do not send beneficiary records, unapproved microdata, row-level content, secrets, or unsuppressed small cells to hosted LLMs.

**P11 Explicit uncertainty-sensitive decisions:** No automated programme benefit eligibility, payments, sanctions or individual recommendations from probabilistic or correlational analysis. Require lawful, separately authorized programme decision controls.

**P12 Immutable lineage:** Preserve dataset hash, dataset license/access policy, code commit, container digest, config schema version, estimator version, random seed, reference document hash, tool/model ID, digest/prompt hash, QA decisions and reviewer signatures in append-only events.

**P13 Idempotent durable execution:** Every side-effecting stage has a stable idempotency key; retry behavior must not duplicate reports, costs, approvals, notifications or beneficiary operations.

**P14 No model-to-model truth by consensus:** Agreement between Groq, NVIDIA and Ollama is not statistical verification. LLMs can propose critiques only; deterministic verifiers and qualified analysts decide acceptance.

**P15 Policy as code:** Release decision computed on backend against versioned policies; no UI badge, user role, client export route, model prompt or retry can override it.

## Exact status vocabulary
- Estimate: `calculated`, `independently_validated`, `validation_failed`, `insufficient_data`, `methodology_review_required`.
- Official comparison: `externally_matched`, `external_mismatch`, `not_comparable`, `retrieval_failed`, `reference_not_found`, `source_conflict`, `not_required_for_original_analysis`.
- Claim: `proposed`, `validated`, `rejected`, `needs_human_review`.
- Report: `draft`, `restricted_draft`, `qa_failed`, `awaiting_review`, `approved`, `published`, `superseded`, `revoked`.
- Document: `discovered`, `downloaded`, `parsed`, `table_verified`, `cited`, `unavailable`, `superseded`.

## Decision matrix
| Situation | Statistical result | Narrative | Official publication |
|---|---|---|---|
| Source retrieval timeout, valid independent estimator | internally validated with limitation | allowed as restricted draft with disclosed status | cannot label externally matched; required external-evidence policy may hold approval |
| Self-comparison or mismatched provenance | invalid verification result | reject assertion of verification | BLOCK |
| Typed claim has incorrect unit/direction | reject claim | return to structured regeneration or human edit | BLOCK if unresolved |
| Independent estimator disagreement outside precommitted tolerance | validation failed | only technical diagnostic, no conclusion | BLOCK |
| Two authenticated official publications conflict | source conflict | both values and dates can be described with context in restricted draft | REVIEW |
| Critical disclosure risk | confidential input held; do not call remote model | redact/suppress | BLOCK until remediated |
| No official published comparator for original model | internally validated, not externally matched | cautious original finding, not verification claim | possible after methodology review per risk policy |

## Mathematical honesty
Causal methods must state identifiability assumptions. Uncertainty intervals depend on assumptions and cannot guarantee truth. Statistical quality certification is a project-specific review result, not a governmental endorsement.
