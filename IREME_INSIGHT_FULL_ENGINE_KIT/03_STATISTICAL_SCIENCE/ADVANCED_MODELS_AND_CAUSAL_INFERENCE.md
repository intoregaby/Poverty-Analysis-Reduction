# Advanced scientific modelling, competing explanations and causal safeguards

## Scientific tiers
1. **Descriptive:** certified weighted rates, geography and trend under harmonized definitions.
2. **Associational:** adjusted regressions, Oaxaca-Blinder, partial correlations, robustness, heterogeneity; labelled noncausal.
3. **Predictive:** out-of-time and geographic holdouts, drift and calibration, stability, subgroup performance, misclassification and fairness; predicted risks never used alone for individual benefit decisions.
4. **Causal evaluation:** only when identification strategy is defensible; registration of estimand, DAG, assumptions, comparison groups, assignment mechanism, falsification, negative controls, sensitivity and uncertainty. If assumptions cannot be defended, abstain from causal claims.

## Decomposition review contract
- Register outcome and link function (e.g. weighted linear probability model), reference coefficients, covariate selection and grouping, missingness/imputation and survey weighting.
- District is part of Rwanda overall: investigate reference contamination and sensitivity to alternate reference choices; clearly state why modelled decomposition is **not a cause attribution**.
- Store total difference, explained and unexplained parts, group shares, bootstrap specification, confidence intervals, seed, resampling unit, sampling design and exact numeric reconciliation.
- Refit entire pipeline in each bootstrap replicate; check convergence, singularity, imputation effects, outcome bound and sign stability.
- Compare full sample vs held-out/alternative models, consumption-based comparisons and contextual threats; retain null or counterintuitive results.

## Responsible predictive and spatial analytics
- Exclude administrative target leakage, future features and post-treatment variables.
- Use spatial block cross-validation for spatially autocorrelated patterns; map observed data with uncertainty and suppression. Do not pretend census-like precision from small survey district cells.
- Forecasts require model backtesting, scenario ranges, distribution shift thresholds, reference baseline and revision conditions.
- Scenario simulation is **conditional**, not an official forecast or evidence that a programme will cause a reduction.

## Causal policy methods (select as applicable, not automatically)
- Randomized trials when ethically designed and properly authorized.
- Difference-in-differences with parallel trends checks and adequate comparison groups.
- Regression discontinuity where thresholds, manipulation and support assumptions are tested.
- Instrumental variables only with plausible exclusion and relevance analysis.
- Synthetic controls where sufficient donor pool and preperiod fit exist.
- Interrupted time series with seasonality/autocorrelation and concurrent shock review.
- Target-trial emulation or matching with explicit confounders and sensitivity to unmeasured confounding.

## Study register
A protocol has `study_id`, question, hypothesis, estimand, eligible datasets, design, identifying assumptions, analysis plan, preregistration timestamp, review, power/precision, endpoints, subgroup rules, correction for multiplicity, privacy plan and deviations. Require independent research review for causal conclusions. Never say an Oaxaca-Blinder contribution is a proven effect of adding a service.

## Equity, interventions and monitoring
For each programme option define target population, delivery owner, theory of change, eligibility source, constraints, rough budget assumption vs validated budget, potential spillovers and harms, equity tradeoffs, outcomes, counterfactual/evaluation design, data collection schedule and decision point. Uncertainty and implementation feasibility are first-class outputs.
