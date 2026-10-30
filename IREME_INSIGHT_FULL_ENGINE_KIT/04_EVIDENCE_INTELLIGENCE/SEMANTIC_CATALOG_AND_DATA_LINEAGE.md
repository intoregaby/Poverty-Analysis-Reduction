# Statistical semantics, ontology, geography and end-to-end lineage

## Machine-enforced indicator definition
Key `(concept_id, definition_version, survey_wave, universe, weight_scheme, geography_version, period, method)` determines whether two statistics have comparable semantics. Explicitly model `person` vs `household` and programme participation vs eligibility and programme receipt. A technical definition is immutable; corrections require a new version, migration review and a recomputation plan.

## Data lineage entities
`SourceDataset -> RawFile -> ExtractedTable -> JoinedAnalysisFrame -> EstimatorRun -> CalculatedFact -> ScientificVerdict -> OfficialComparison -> Claim -> ReportVersion -> PublishedArtifact -> DashboardWidget`. Each edge includes input hash, transformation code version, timestamp, principal, and approved license. Keep lineage queryable both forward (what reports were affected by a dataset change?) and backward (what created this cell?).

## Geographic crosswalk
Use Rwanda's official district IDs, names and boundaries with an effective date. Store mappings for boundary changes, unavailable sector detail, source coverage and spatial join confidence. Never estimate below the supported survey precision or represent ungeocoded records as precise points. Use spatial suppression appropriate to disclosure risk.

## Data quality checks
- File schema and label drift; missingness, duplicate household IDs, unique participant keys, mismatched merges.
- Strange weights and unit scaling, conflicting wave metadata, invalid geographic codes, suppressed data.
- Hash mismatch and source licensing changes.
- Survey period consistency, official paper/table source version.
- Reliability grade completeness, CI sanity, point estimate in range, data-leakage checks.

## Definitional drift examples
`Poverty line`: changed poverty estimation methodology across EICV waves; require harmonization or modelled comparison.
`Electricity`: grid connection is not necessarily electricity as main lighting source, and total electricity access may include solar.
`VUP`: participating households are not automatically all eligible poor households; administrative registry not interchangeable with survey self-report.
`Financial inclusion`: FinScope adult rates and EICV household service-use rates may describe distinct populations.
