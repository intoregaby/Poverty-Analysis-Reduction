# Reproducibility, reference science and code-independent checks

## Immutable scientific run manifest
Must include survey archive SHA-256, approved file paths/internal ZIP members, extracted tables and hashes, dictionary versions, licensed access scope, code commit hash, container digest, interpreter/packages lockfile, configuration, indicator registry hash, survey design mapping, geographic crosswalk, random seeds, R reference implementation commit, reference source artifacts, corrections and QA verdicts.

## Independence test (not just different languages)
Primary and independent estimators must: load the raw survey file independently; be implemented/maintained in separate code modules owned by different reviewers; avoid shared calculations, generated intermediate values or copied formula code; use independent unit tests with tiny truth-known fixtures. Shared approved *definition* contracts are allowed because both must compute the same estimand, but provenance of their implementations must differ. Review correlated failure modes such as identical mistaken survey variable mappings by tracing back to documentation, not merely two programs agreeing.

## Scientific benchmark suites
- Gold fixtures: tiny handcrafted samples, published NISR tables with complete definition match, separately audited reference samples.
- Property-based and metamorphic fixtures.
- CI under known sampling design simulation: validate coverage and false-positive rate under repeated design-based sampling.
- Dataset wave compatibility tests: distinguish modelled historical rates from direct historical observations.
- Decomposition synthetic known-effect cases and pure correlation scenarios.
- Policy inference red-team: report cannot claim estimated contribution equals an intervention effect.

## Approval gates for scientific code changes
Any change to estimator, weighting, row-filter, geography, missingness or CI logic triggers benchmark suite, independent calculation suite, statistical review, old-vs-new diffs for 30 districts and national, and versioned invalidation of affected fact snapshots and reports. Publish new versions; do not overwrite past accepted outputs.
