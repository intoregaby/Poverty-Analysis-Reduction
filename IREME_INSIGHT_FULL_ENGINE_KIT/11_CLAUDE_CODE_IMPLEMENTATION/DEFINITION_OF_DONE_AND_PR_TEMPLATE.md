# Definition of Done and pull request evidence template

## PR must provide
- [ ] Change scope and affected `W*` audit weaknesses, with links to relevant code.
- [ ] Public or private data classifications and any egress effects.
- [ ] Backward compatible API / schema migrations or explicit version deprecation.
- [ ] Unit, contract, integration, independent scientific and failure-mode tests as relevant.
- [ ] Statistical estimator definition and tests for changed methods.
- [ ] Reproducibility metadata and immutable source hashes.
- [ ] Attack/abuse case check for ingestion, AI and report export.
- [ ] Executed commands, exit codes and logs. No 'tested' without logs.
- [ ] Rollback and disaster-recovery procedure for stateful changes.
- [ ] Updated Mermaid diagram only when architecture truly changed.
- [ ] Signed scientific and security reviews for restricted-data changes.

## PR report format
`Title, commit, files modified, problem, design decision, tests actually run, tests skipped/blocked, synthetic vs real-data evidence, benchmark deltas, source lookup outcome, security findings, remaining uncertainty, reviewer list, deployment and rollback.`

## DoD for an investigation report
Immutable dataset/code/policy manifest; traceable facts; independent method pass; official comparisons correctly classified; necessary CI/reliability; typed claims; privacy clearance; reviewer authority; frozen AST; identical cross-format numbers; signed artifacts; appropriate audience; operational monitoring link.
