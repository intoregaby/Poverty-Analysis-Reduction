# Context and sampling uncertainty

The investigation now uses EICV7 cross-section residence area (`ur`), household size (`member`), population and household weights, sampling cluster (`clust`), and household-module sampling stratum (`strata_id`). Household records are joined only inside EICV7 after uniqueness and geography checks. No household records enter the AI request or exports.

The workspace shows rural population share, household-weighted average household size, and poverty rates within rural/urban groups and the prespecified household-size bands 1–3, 4–5 and 6+ members. Subgroups with fewer than 30 surveyed households are withheld. These are measured associations, not causal explanations or intervention evaluations.

Approximate uncertainty uses ultimate-cluster Taylor linearization of a population-weighted ratio. All sampled clusters remain in the domain calculation, including zero influence outside a district. Stratum contributions use `m/(m-1)` times the sum of squared deviations of cluster influence totals. Singleton strata cause a visible failure instead of an invented standard error. There is no finite-population correction because the required population sampling counts are not configured. Intervals use the normal 1.96 approximation.

District gap calculations use differences of the two district influence vectors, retaining their covariance. The three selected pairwise comparisons use Holm adjustment for their tests; the displayed 95% gap intervals are individual, unadjusted intervals. These approximations do not replace a full official survey-design review. The engine checks its selected district poverty standard error against NISR Table A9.23; if reconciliation is unavailable or differs by more than 0.1 percentage points, test interpretations are withheld.

For the executed Gisagara calculation, the standard error was 2.688 points, compared with NISR's published 2.69. All three selected pairwise differences remained unclear after Holm adjustment. That does not establish equal poverty rates, and it does not explain the causes of poverty.

The estimator follows the documented general approach of [SAS SURVEYMEANS Taylor linearization](https://support.sas.com/documentation/cdl/en/statug/68162/HTML/default/statug_surveymeans_details06.htm). The [R survey reference](https://r-survey.r-forge.r-project.org/survey/html/surveysummary.html) also documents survey-weighted domain means, variances and contrasts. This implementation uses Python rather than those packages. NISR's [EICV7 Main Indicators](https://statistics.gov.rw/sites/default/files/documents/2025-07/EICV7_Main%20Indicator%20Report.pdf) supplies the external standard-error check.

Livelihoods, employment status, age composition and multivariable models still require validated definitions, denominators and methods. No residual difference is automatically attributed to those factors. Claims about policy effectiveness or transferring interventions require programme and evaluation evidence.

# Rotated Groq key verification

The rotated server key was detected without printing it. The Python client's initial HTTP 403 was a security-filter response to its default client header. An explicit application User-Agent resolved the failure. A live source-constrained review completed successfully with the configured `openai/gpt-oss-120b` model. Groq is the configured inference provider; this is not an xAI Grok integration.

The model may select existing evidence references and research questions. It cannot invent statistics, change calculations or approve an action. New investigations use the corrected client; old saved runs preserve their original Skipped/Warning status.
