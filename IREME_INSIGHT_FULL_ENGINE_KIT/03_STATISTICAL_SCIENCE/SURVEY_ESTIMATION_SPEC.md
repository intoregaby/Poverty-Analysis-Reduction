# Scientific estimator contract — EICV / survey datasets

## Primary rule: define estimand BEFORE calculating
`IndicatorDefinition` contains numerator event, eligible universe, unit, household/person weights, strata, PSU, reference period, missingness and geographic domain. Derivation is approved by survey statistician and linked to NISR methodology.

### Headcount and ratio measures
For an eligible indicator with person weights `w_i` and poverty flag `y_i in {0,1}`, estimate `p_hat=sum(w_i*y_i)/sum(w_i)` using eligible population and an approved weight. Do not silently substitute household weights for a person-level poverty headcount. National includes district; for district–national variance include covariance via joint survey design, not independent-sample subtraction. Counts use documented population total and count uncertainty; never manufacture counts from unverified denominators.

### Poverty depth and severity
For welfare `c_i`, line `z>0`, define `g_i=max(0,(z-c_i)/z)`. FGT(alpha) = `sum(w_i*g_i**alpha)/sum(w_i)` for alpha 1 and 2; FGT0 uses poverty classification. Check welfare scale, adult-equivalence convention, temporal deflation, poverty line and sampling unit with NISR documentation. Do not treat models using different EICV methodologies as direct trends.

### Complex-survey variance
Compute design-based Taylor linearization for ratios, mean and proportion, using actual strata and PSU IDs. Singleton stratum handling must follow documented NISR design or a statistically reviewed alternative; do not invent PSU duplicates. Distinguish with/without-replacement and finite population correction depending on known design. Degrees of freedom, interval method and effective sample sizes shall be stored and surfaced. Domain estimation must retain full design information (not naively subset sample before variance if inappropriate). Cross-estimator differences use the covariance of the full vector.

### Reliability policy
Require: estimate, standard_error if estimable, CI level and bounds, design degrees of freedom, n observations, n independent PSUs, n strata, effective n, relative SE or CV when meaningful, flags for small domain/suppression, and statistical design notes. Classification is configurable, tested, and DOES NOT silently convert unreliable estimates into precise numbers. For values near zero use suitable absolute-precision checks instead of blindly dividing by zero. All reliability warnings are mandatory in LLM digest and canonical report.

### Indicators, start registry
| Concept | Proper denominator | Major failure to guard |
|---|---|---|
| Poverty rate | persons represented by approved population weights | household count called people count |
| Extreme poverty | people using current wave's compatible poverty definition | different poverty line/welfare convention |
| Grid connection | households, based on explicit grid variable mapping | confused with electricity as lighting source |
| VUP participation of poor households | sampled poor households under precisely approved component rules | participation confused with eligibility/coverage |
| Health insurance coverage | persons currently covered (definition/year) | household vs individual mix |
| Financial inclusion | FinScope-defined population (adults/individuals as specified) | join FinScope to EICV at person level without linkage |

### Statistical test suite
- Hand-calculated tiny fixtures including missingness, zero weights, two strata, multi-PSU and domain subsets.
- Independent Python primary vs R survey reference by both point estimate and design-based SE (the reference must load *raw* fixture inputs, not primary intermediate predictions).
- National–district difference with nonzero covariance and intentionally wrong independence assumption.
- Headcount boundary cases (0%, 100%), all-missing denominator (blocked), singleton strata (explicit reviewed behavior), suppression.
- Variance reference from official NISR where available, separate from independent recalculation.
- Metamorphic tests: row reordering, multiplicative weight scaling, duplicate-record rejection, labels and unit substitutions.

### Tolerance rule
Tolerance is **pre-registered per indicator, quantity and precision** in `tolerances.yaml`; e.g. decimal-rounding agreement for one-decimal published percentages must use the official rounding convention and source precision. Independent software equivalence may use tight absolute and relative tolerances justified on numeric conditioning. No global `0.1` tolerance across rates, standard errors, counts, or model outputs. If observed difference crosses a registered threshold, status `validation_failed`, explain mismatch and block approval. Do not loosen tolerance to make tests pass.

### Production recipe
1. Validate dataset/license/hash and version.
2. Load approved columns via indicator mapping and validate join cardinality.
3. Calculate point estimate and design-based uncertainty.
4. Independently recalculate with separate implementation/fixture.
5. Record both computed digests and pre-registered difference threshold.
6. Resolve disagreements or mark invalid; only after this create a frozen `CalculatedFact`.
7. Compare against official publications *independently* in evidence plane.
