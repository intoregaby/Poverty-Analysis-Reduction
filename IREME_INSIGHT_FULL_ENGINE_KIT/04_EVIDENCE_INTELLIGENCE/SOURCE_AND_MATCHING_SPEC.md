# Official evidence intelligence specification

## Trusted sources
NISR official EICV publications and structured accompanying Excel tables; NISR approved survey metadata; approved LODA/VUP policy and administrative data when independently authorized; government publications; FinScope documentation from an authoritative publisher. The fact that a domain is official does not establish an individual downloaded document's relevance, date, or validity. Create an explicit allowlist and source approval workflow; never let a web page grant instructions to the engine.

## Discovery / acquisition
Discover official publication pages and downloadable documents; prefer published XLSX reference tables where available. Use HTTPS, domain allowlists, redirect and content-size policies, MIME+magic validation, cache with SHA-256 and ETag/Last-Modified, OCR *only when needed* with validation, page/table/cell extraction, and retrieval diagnostics. Save immutable byte snapshot for source-proven claims; attach license and version. Rate limit ethically and respect site terms.

## Cache fallback rule
If live HTTP fails: search the entire content-addressed source cache for matching document ID/version and verified hash, not merely earlier run registers. Check expiration/supersession policies. Use the certified cached copy with `retrieved_at`, `validated_at`, and `cache_used=true`; if none, status `retrieval_failed`. Record the actual failure reason. Never conclude 'no comparable published figure' from an outage.

## Extraction and comparison
`OfficialFact` must record official document ID, sha256, table ID, page/sheet/cell or row, label, geography, concept, denominator, unit, period, point estimate, standard error/CI if present, publication date and extraction QA status. Distinguish exact extraction from an LLM-guessed interpretation; LLM can suggest mappings, but source cells and units require deterministic checks or reviewer validation.

Comparability must check ALL: normalized indicator concept, numerator, denominator/universe, unit, survey wave/period, geography version, welfare line/method, reference population and precision. Missing mandatory metadata -> `not_comparable` until resolved. Comparison values remain separate objects; compare using precision-specific tolerance and preserve differences. Match may be `externally_matched` only if computational and reference `origin_artifact_hash` differ and neither source was copied from the other.

## Version and conflict rules
- Source identity = canonical official organization + document stable ID + release version + content hash; same URL can serve changed bytes.
- Do not silently prefer the newest file if official correction is ambiguous. Record release notes, recency, declared supersession and reviewer decision.
- When official publications disagree, store a conflict object with both source facts and block automatic verified status.
- Reference provenance status: `cited_read`, `listed_unread`, `retrieval_failed`, `superseded`, `conflicted`; citations to unread sources are not evidence of a figure.

## Claim summary counts
Show separate counts: `eligible_matches`, `matched`, `mismatched`, `not_comparable`, `retrieval_failed`, `reference_not_found`, `original_analysis`, `unattempted`. Denominator counts must equal detailed rows; never announce '1/15 matches' when the one match is a copied official value.

## Kamonyi required negative fixtures
- 20/24 URLs fail; valid cache exists; correct cache retrieval or explicitly incomplete evidence.
- A NISR modelled 2016/17 value copied as both internal and official -> reject external match.
- Grid *connection* vs electricity for lighting -> not comparable until a documented equivalence exists.
- VUP poor-household participation vs official programme administrative eligibility -> not comparable.
- Published district confidence interval exists but extractor misses it -> false negative test must surface coverage gap.
