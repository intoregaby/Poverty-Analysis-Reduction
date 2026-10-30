# Scientific, AI, security and operational acceptance strategy

## Test classes
1. **Structural contract:** JSON Schema, API schema compatibility, reference relations, determinism and hash/origin validity.
2. **Scientific gold:** hand-computed fixtures and NISR official values with identical definition; tests of weighted means, covariance, SE, domains, missingness, poverty depth and reliability.
3. **Independence:** primary vs separately owned R implementation, no shared estimator code, pre-registered tolerances and different underlying numerical routines.
4. **Extraction & meaning:** PDF/XLSX table cell extraction, source date/hash, cache fallback, official conflicts, unavailable vs unpublished, grid vs lighting and VUP participation vs eligibility.
5. **AI & claim:** schema fuzzing, unsupported number and causal language, wrong denominator, stale references, hallucinated citations, adversarial prompts, model failover and rate limits.
6. **Data privacy/security:** prohibited microdata egress, small-cell reconstruction, authz bypass, SSRF, malicious PDFs/Excel, secret leakage and signed-link revocation.
7. **End-to-end:** 30 districts and national, parity across JSON/HTML/PDF/XLSX/map and export authorization, source outage, worker crashes, reproducibility and approvals.
8. **Research & policy:** competing hypotheses, causal ID rules, intervention provenance, unsupported benefit claims and programme isolation.
9. **Performance/reliability:** concurrent district runs, peak model quotas, high-latency official sources, backups/restores and version rollbacks.

## Test tiers and status definitions
- `PASS`: test actually executed with retained evidence, reviewer and expected output verified.
- `FAIL`: executed and violated requirement.
- `BLOCKED`: could not execute due to missing environment, license, reference or independent reviewer; state why.
- `NOT RUN`: no execution. No passing inference from a unit test to real-data certification.

## Required acceptance evidence
Every test has ID, preconditions, inputs/version/hashes, operation, expected output, actual output, logs, run timestamps, responsibility and defect link. Real official NISR reference data should be downloaded under valid use policy and immutable hash; do not include restricted survey microdata inside this ZIP.

## Release conditions
Critical tests covering fake verification, independent statistical disagreements, invented numerical claims, disclosure, official source failure and export bypass must all PASS before external report release. Human approval must be valid and not self-signed when independence policy applies.
