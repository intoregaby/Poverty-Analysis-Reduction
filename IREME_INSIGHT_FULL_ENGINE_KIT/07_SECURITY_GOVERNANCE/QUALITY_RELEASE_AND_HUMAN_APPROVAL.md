# Quality release gate and human approvals — executable policy specification

## Machine gate evaluation
The backend freezes `ReportDocument` and checks: scientific facts validated; variance and reliability mandatory fields present or explicit reason unestimable; official evidence comparison accurate and source provenance independent; no unresolved critical source conflict; claims fully typed/resolved; charts/exports consistent; suppression and data rights passed; report version links all hashes; expected review signatures present. Gate runs even if Node/React/browser attempts direct export.

## Allowed outcomes
- `restricted_draft`: may show diagnostic findings to authorized investigators with red banners and unresolved errors.
- `qa_failed`: cannot circulate to official/public users; requires remediation and rerun of affected stages.
- `awaiting_review`: all automated critical checks pass, analyst judgment needed.
- `approved`: required reviewers authorized and no expired source/validation conditions.
- `published`: immutable release snapshot and access rights established.
- `superseded`: newer revision exists; old evidence preserved for audit, marked outdated.
- `revoked`: critical defect found postrelease; withdraw access where supported, issue incident and correction notice.

## Human approval levels
1. Statistical-method reviewer — sample design, estimator/uncertainty/model interpretation.
2. Evidence reviewer — official document, comparability/source conflict.
3. Privacy reviewer — aggregate suppression and release audience.
4. Publication authority — final policy language, release scope, legal/institutional conditions.
Roles may be combined for low-risk internal drafts if explicit policy permits; no auto-approval for high-impact public reports or beneficiary-impacting recommendations. The request author cannot satisfy an independence requirement with self-approval.

## Blocking examples
Self-comparison `external_matched`; missing required confidence interval with unsupported 'precise' claim; wrong household/person denominator; cloud disclosure; claim with uncited number; incorrect comparison direction; cached fact changed under a report; report files created independently with conflicting figures; revoked approval signature; modelled historical figure masquerading as observed trend.

## Quality metric dashboards
- Comparable official claim match coverage (excluding original analyses from denominator).
- Retrieval success/cache hit, false-negative table detection, source freshness, source conflicts.
- Independent-statistical agreement and SE coverage test quality.
- Unsupported claim rejection rate, prompted disclosure attempts, quality by model/task/language.
- Report version lineage coverage, release gate bypass attempts, revocations, postrelease corrections, time to detection.
