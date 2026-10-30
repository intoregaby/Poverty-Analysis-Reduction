# Typed claims, evidence binding and deterministic narrative compiler

## Problem being eliminated
The audited Kamonyi pipeline used regex text correction that misread `poor households` as the poverty-rate concept and inserted a new poverty statement. The target **must not let the model type arbitrary numerical prose and hope regex later repairs it**.

## Claim resolution algorithm
1. Receive only schema-conformant `ClaimProposal` (no `value` string, no free `numeric_text`).
2. Authorize access to facts by report audience, purpose, geography and sensitivity.
3. Assert `fact_id` exists and is independently validated; resolve source fields from immutable fact registry.
4. Assert same universe, unit, time, geography or registered valid comparison transformation across referenced facts.
5. For `above/below`, compute difference from unrounded values; apply registered uncertainty/comparison significance policy and use language appropriate to evidential strength.
6. Render point estimate and CI from facts with approved rounding rules; preserve reliability label and mandatory warning.
7. For `causal_effect`, require a methodological approval object and linked study; otherwise reject with `CAUSAL_NOT_ESTABLISHED`.
8. Link source table coordinate or original analysis provenance to each numeric sentence; assign citation with read status.
9. Serialize rendered claim into `ReportDocument` AST and run cross-format equivalence checks.

## Example: claim (sanitized, illustrative only)
```json
{
  "claim_id": "c-poverty-compare-kamonyi",
  "claim_type": "comparison",
  "fact_ids": ["fact-kamonyi-pov", "fact-rwanda-pov"],
  "relation": "above",
  "qualification_code": "observational_difference",
  "evidence_ids": ["comparison-kamonyi-pov"],
  "section": "executive_summary"
}
```
The compiled statement is built using resolved estimates and statistical rules; the AI never types `39.7` as authoritative output.

## Narrative risks beyond numerics
- Negative facts, causal implications, unsupported generalizations and missing coverage must be checked using proposition-level review and human sign-off. Schema validation alone cannot guarantee truth of qualitative claims.
- Claims from unsupported explanatory hypotheses must carry labels like `hypothesis_not_confirmed` and cannot be presented as established drivers.
- Translations must use immutable placeholders for facts and independent language review; translation cannot alter the estimate, uncertainty or reference.

## Canonical outputs
`ReportDocument` AST holds normalized section IDs, claim IDs, table/chart spec IDs, policy flags, evidence IDs, preapproved text blocks, glossary, citations, approval signatures, and artifact manifests. Every export uses this same AST, not independent Python/Node/browser report builders. The XLSX contains native chart objects using workbook data references and retains metadata and verification sheet.
