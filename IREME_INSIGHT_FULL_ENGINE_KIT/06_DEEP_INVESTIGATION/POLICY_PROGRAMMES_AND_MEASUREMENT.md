# Policy and programme evidence-to-action architecture

## Programme data is governed separately
VUP, Girinka, cooperative jobs/skills, health insurance and cash-transfer programme records are not interchangeable with EICV survey responses. Administrative eligibility and individual transactions stay in separate, explicitly authorized systems. The AI may inspect approved aggregates and suggest questions, not approve beneficiaries, initiate payments or allocate programme benefits.

## Intervention option record
- Targeted district / demographic scope and beneficiary criteria source.
- Diagnosed need and associated uncertainty; competing explanations.
- Intervention category, responsible implementing agency and actual authorization.
- Evidence base quality: trial, quasi-experiment, observational, qualitative, expert consensus, not yet tested.
- Transferability assessment to Rwanda/district, assumptions and expected heterogeneity.
- Costs: measured budget line vs estimated illustrative ranges; fiscal feasibility, funding source and confidence.
- Equity: who benefits, potential exclusion, access barriers and potential harm.
- Policy dependencies, legal/procurement requirements and operational risks.
- Monitoring metrics, baseline, control/comparison strategy, evaluation date and success/failure criteria.

## Action recommendation classes
1. `investigate_more` for unknown causes or missing data.
2. `audit_programme_delivery` when participation appears low but eligibility is unclear.
3. `pilot_and_evaluate` when evidence is suggestive, limited or context-dependent.
4. `consider_scale` only when credible effect evidence, feasibility and authority support it.
5. `do_not_recommend` where evidence contradicts benefits or material adverse risks exist.

## Programme monitoring design
Track coverage, take-up, dropout, time-to-delivery, beneficiary feedback, exclusion risks, outcomes and cost (with source and denominator). Avoid treating before/after movement as a causal programme result without a credible evaluation design. Update action priorities when reliable data or implementation outcomes arrive, with review/versioning.
