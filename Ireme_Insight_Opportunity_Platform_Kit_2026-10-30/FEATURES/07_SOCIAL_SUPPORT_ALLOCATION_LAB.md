# 07 Social Support Allocation Lab

**Outcome:** Use competitor-inspired budget/targeting what-if comparisons to help humans plan social-support coverage without unsupported causal or individual entitlement claims.

**Primary actors:** NISR analyst; government planner; programme owner (approved aggregate only)

## Required user workflow

1. Choose district or national period, approved source dataset and programme budget.
2. Compare transparent strategies (existing allocation, equal geographic amount, poverty-weighted, unmet-need-weighted, manual policy weights) with sensitivity analysis.
3. Show persons/households potentially reached, cost per participant, need and estimated coverage with defined denominators; if denominator unavailable, show 'not calculable'.
4. Show assumptions, source revision, data availability, fairness risk and uncertainty/projection limitations.
5. Save a scenario as draft; request human programme review and never auto-enroll a named beneficiary.

## State machine

`draft -> reviewed -> shared_for_policy -> archived; never transforms into approved benefit decision automatically`

## Existing UI and proposed extension

Add lightweight Allocation Lab tab under Other Analysis or District Investigation handoff; use existing charts and map; side-by-side bars and scenario assumptions drawer.

## Supabase entities and interfaces

allocation_scenarios (aggregate inputs, weights, results, owner, source hash), programme_policy_recommendations, opt-in action request link.

## Hard business and security rules

- Show all projections as hypothetical; estimated reach is not measured impact.
- Do not copy competitors' unverified fixed coefficients or trained scores.
- No use of survey microdata in browser or unsolicited transfer to AI vendor.
- Never extrapolate unsupported sector or cell statistics.

## Feature acceptance tests

- [ ] Same inputs reproduce same outputs; changes in budget reflect formula, audit and source.
- [ ] One can compare five strategies with metadata and constraints.
- [ ] Analyst can save and send aggregate, safe scenario to programme manager.
- [ ] Unknown inputs produce explicit unavailable status, not invented numbers.

## Required implementation artifacts

- Git diff and UI screenshots for desktop/tablet/mobile.
- API/Edge contract with unauthorized/failure responses.
- Migration and RLS positive+negative tests.
- Idempotency/retry and audit behavior if money or evidence is handled.
- Demonstration vs production labeling and provider/blocker status.
