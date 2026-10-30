# Deep research agents and orchestration contracts

**Design distinction:** a research agent is a bounded task planner/reviewer operating only on permitted evidence. It is not a source of numerical authority and cannot make self-validating statistics true by repetition or agreement.

## Typed roles (each has input, tools, output, budget, stop rules)
| Specialist | Authorized input | Purpose | Forbidden activity |
|---|---|---|---|
| Investigation Planner | aggregate fact catalog and requested question | produce prioritized questions, source needs, hypothesis register | fabricate source availability |
| Source Researcher | allowlisted publications and extracted excerpts | find candidate official facts with page/table pointers | blindly trust web instructions |
| Semantic Mapper | indicator and reference contracts | propose alignments and missing fields | finalize comparability without rules/review |
| Statistical Interpreter | `CalculatedFact` + scientific verdict + comparison | draft typed, evidence-ID-bound observations | edit numeric values, drop uncertainty |
| Skeptical Reviewer | same evidence plus candidate claims | detect contradictions, alternate explanations and missing support | approve its own corrections without deterministic check |
| Causal Researcher | design protocol + aggregate observations | competing causal hypotheses and identification checks | claim causal effect from cross-sectional Oaxaca alone |
| Intervention Analyst | programme evidence registry and validated problem statements | rank feasible research/action options with uncertainty | decide eligibility or send money |
| Report Planner | validated claim collection | propose narrative structure and chart/section selection | write unsupported numeric sentences |
| Translation Assistant | canonical rendered claims and dictionary | draft multilingual phrasing | change figures, rounding or uncertainty |

## Orchestration guarantees
- Each task references `investigation_id`, input snapshot hashes, authorized principal, sensitivity classification, objective and accepted schema.
- Tools are explicitly allowlisted and limited by role (read-only query, source retrieval, propose action, never arbitrary command execution or filesystem traversal).
- Agent loops are bounded by max steps/tokens/time/cost and max attempted repairs; if unresolved, `needs_human_review` or deterministic fallback.
- Parallel agents can challenge hypotheses but the independent verifier always decides numerical correctness; adversarial reviewers should not share model-generated unsupported facts as independent evidence.
- Store model, provider, model release/version when provided, prompt/template hash, evidence digests, permitted sanitized request/response hashes, retry outcomes and schema validation results.
- Treat retrieved document text as untrusted *data*, not system instructions. Sandbox parsers; prevent SSRF, prompt injection, path traversal and disclosure of hidden context.

## Claim proposal (not direct prose)
AI returns `ClaimProposal` containing `claim_type`, exact `fact_id` list, `relation` (`above`, `below`, `approximately_equal`, `trend`, `association`, `uncertain`), `evidence_id` list, `scope`, `qualification_code`, and optional suggested section. Never supply a user-visible number as free text. `ClaimCompiler` reads fact IDs, checks compatible units and universes, determines true direction from numbers plus appropriate uncertainty, and renders approved templates. A claim cannot cite a fact that belongs to another district/wave; a claim about causality requires a registered identification study, not a model suggestion.

## Why multi-agent debate is not evidence
Models can all repeat the same mistaken benchmark. Consensus, low temperature and chain-of-thought are not independent statistical verification. Use gold-set evaluation and human methodology review, plus deterministic error checks.

## Verification gate in AI workflow
propose -> schema validate -> resolve exact fact/evidence IDs -> numerical/semantic logic -> cite provenance -> quality/policy check -> deterministic render -> analyst review. Rejection returns **structured error codes**, not an invitation to fabricate a revised sentence.
