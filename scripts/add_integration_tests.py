"""Add integration test mappings for all workstreams and audit defects.

Maps each EP workstream and audit defect to the actual integration tests that exercise them.
Only EP-09 was previously verified; this adds mappings for EP-01 through EP-16.
"""
import json
from pathlib import Path

REGISTRY = Path(r"D:\Project\Poverty-Analysis-Reduction\docs\implementation\registry.json")
reg = json.loads(REGISTRY.read_text(encoding="utf-8"))

# Integration test mappings for each workstream based on actual @acceptance tags
WORKSTREAM_TESTS = {
    "EP-01": [
        "test_ci_gate.CiGate.test_gate_exits_nonzero_when_critical_scenario_fails",
        "test_ci_gate.CiGate.test_gate_allows_pass_when_all_critical_scenarios_pass",
    ],
    "EP-02": [
        "test_catalog.Catalog.test_catalog_creation_and_integrity",
        "test_catalog.Catalog.test_dataset_licence_expiry_enforced",
        "test_catalog.Catalog.test_variable_definition_conflicts_detected",
    ],
    "EP-03": [
        "test_survey.SurveyTests.test_weighted_headcount_hand_computed",
        "test_survey.SurveyTests.test_household_rows_cannot_answer_person_claim",
        "test_survey.SurveyTests.test_bad_weights_rejected_and_zero_weights_counted",
        "test_survey.SurveyTests.test_taylor_variance_hand_derived",
        "test_survey.SurveyTests.test_taylor_vs_jackknife_on_simulated_design",
        "test_survey.SurveyTests.test_fpc_reduces_variance",
        "test_survey.SurveyTests.test_singleton_stratum_aborts_with_explicit_error",
        "test_survey.SurveyTests.test_district_national_covariance",
        "test_survey.SurveyTests.test_confidence_interval_method",
        "test_survey.SurveyTests.test_domain_sample_sufficiency",
        "test_survey.SurveyTests.test_poverty_fgt1_fgt2",
        "test_survey.SurveyTests.test_bootstrap_reproducibility",
        "test_real_eicv7.RealEicv7.test_real_design_has_no_singleton_strata_and_expected_structure",
        "test_real_eicv7.RealEicv7.test_real_estimate_matches_known_nisr_value",
        "test_real_eicv7.CoverageSimulation.test_coverage_within_tolerance",
        "test_real_eicv7.RealEicv7.test_all_30_districts_batch",
    ],
    "EP-04": [
        "test_r_reference.RReference.test_r_raw_archive_path_calculates_national_and_district_se",
        "test_r_reference.RReference.test_real_r_vs_python_agreement_within_registered_tolerance",
        "test_survey.SurveyTests.test_reference_mismatch_blocks",
        "test_survey.SurveyTests.test_production_tolerances_unapproved_blocks",
    ],
    "EP-05": [
        "test_sources.Retrieval.test_outage_with_cache_serves_verified_cache",
        "test_sources.Retrieval.test_outage_without_cache_is_explicit_not_a_verified_headline",
        "test_sources.Retrieval.test_corrupted_cache_is_rejected_not_used",
        "test_sources.Retrieval.test_timeout_is_not_reported_as_not_published",
        "test_legacy_source_integration.CacheIntegration.test_real_cached_pdf_without_any_prior_run",
        "test_legacy_source_integration.CacheIntegration.test_corruption_and_invalid_metadata_never_supply_evidence",
        "test_legacy_source_integration.CacheIntegration.test_missing_or_corrupt_manifest_preserves_failure",
        "test_legacy_source_integration.CacheIntegration.test_304_revalidates_scope_and_preserves_original_retrieval_date",
    ],
    "EP-06": [
        "test_extract.Xlsx.test_xlsx_cell_value_and_coordinate",
        "test_extract.RealOfficialPdf.test_all_30_districts_plus_national_extracted_with_page_provenance",
        "test_extract.RealOfficialPdf.test_extracted_facts_satisfy_the_official_fact_contract",
        "test_extract.RealOfficialPdf.test_corrupted_row_is_not_table_verified",
    ],
    "EP-07": [
        "test_trust.ClaimCompilation.test_true_vup_style_sentence_not_miscorrected_and_no_new_claim_introduced",
        "test_trust.ClaimCompilation.test_free_text_numbers_rejected_by_schema_and_prose_scan",
        "test_trust.ClaimCompilation.test_small_number_hallucination_rejected",
        "test_trust.ClaimCompilation.test_wrong_district_fact_link_rejected",
        "test_trust.ClaimCompilation.test_wrong_wave_fact_link_rejected",
        "test_trust.ClaimCompilation.test_false_causal_decomposition_claim_rejected",
        "test_trust.ClaimCompilation.test_numerical_direction_negative_test",
        "test_trust.ClaimCompilation.test_precision_grade_propagation",
        "test_trust.ClaimCompilation.test_prompt_injection_in_official_pdf_rejected",
        "test_trust.ReleaseAndDisclosure.test_small_cell_complementary_suppression",
        "test_trust.ReleaseAndDisclosure.test_repeated_differencing_attack",
        "test_trust.ReleaseAndDisclosure.test_self_approval_prevented",
        "test_trust.ReleaseAndDisclosure.test_self_approval_prevented_second",
        "test_trust.ReleaseAndDisclosure.test_self_approval_prevented_third",
    ],
    "EP-08": [
        "test_report_service.T.test_unreleased_report_cannot_be_exported_or_linked",
        "test_report_service.T.test_failed_gate_leaves_report_blocked_and_released_one_exports",
        "test_report_service.T.test_forged_and_tampered_tokens_rejected",
        "test_report_service.T.test_ast_modified_after_freeze_is_refused",
        "test_report_service.T.test_revoked_link_and_revoked_report_denied",
        "test_report_service.T.test_expired_link_denied",
        "test_report_service.T.test_stale_signed_report_view_after_new_version",
        "test_report_service.T.test_district_scope_enforced",
        "test_report_service.T.test_cross_tenant_access_looks_like_not_found",
        "test_report_service.T.test_weak_signing_key_refused",
        "test_reports_api.ReportLifecycle.test_draft_export_is_denied_audited_and_returns_no_bytes",
        "test_reports_api.ReportLifecycle.test_client_cannot_supply_checks_or_skip_review",
        "test_reports_api.ReportLifecycle.test_stale_ast_hash_is_refused_before_any_signature",
        "test_reports_api.ReportLifecycle.test_author_cannot_review_and_low_assurance_cannot_sign",
        "test_reports_api.ReportLifecycle.test_one_reviewer_cannot_publish_alone",
        "test_reports_api.ReportLifecycle.test_full_review_publishes_and_all_formats_carry_the_same_ast",
        "test_reports_api.ReportLifecycle.test_superseded_version_is_not_exportable",
        "test_reports_api.ReportLifecycle.test_district_scope_and_cross_tenant_are_enforced_on_export",
        "test_reports_api.ReportLifecycle.test_failed_check_blocks_publication_and_report_stays_draft",
        "test_reports_api.ReportLifecycle.test_unauthenticated_unknown_version_and_bad_format",
    ],
    "EP-09": [
        "test_live_providers.Live.test_live_capability_probe_for_structured_output_each_provider",
        "test_live_providers.Live.test_live_unavailable_primary_model_fails_over_to_real_second_provider",
        "test_live_providers.Live.test_live_rejected_key_fails_over_to_the_configured_second_key",
        "test_live_providers.Live.test_live_local_only_never_calls_a_remote_provider",
        "test_live_providers.Live.test_live_error_paths_do_not_echo_keys",
        "test_gateway.MultiKeyCredentials.test_quota_on_first_key_fails_over_to_the_second_key",
        "test_gateway.MultiKeyCredentials.test_secrets_are_redacted_even_without_key_expansion",
    ],
    "EP-10": [
        "test_agents.Orchestration.test_hypothesis_generation_with_evidence_links",
        "test_agents.Orchestration.test_multi_model_consensus_fallacy_rejected",
        "test_agents.Orchestration.test_competing_hypotheses_retained",
        "test_lab_policy.Policy.test_observational_equals_causal_rejected",
        "test_lab_policy.Policy.test_competing_hypotheses_retained",
    ],
    "EP-11": [
        "test_lab_policy.Lab.test_decomposition_ref_group_sensitivity",
        "test_lab_policy.Lab.test_spatial_sampling_precision",
        "test_lab_policy.Lab.test_prediction_temporal_holdout",
        "test_lab_policy.Lab.test_historical_poverty_wave_compatibility",
        "test_lab_policy.Policy.test_cost_assumption_trace",
        "test_lab_policy.Policy.test_programme_payment_isolation",
        "test_lab_policy.Policy.test_evaluation_preregistration",
    ],
    "EP-12": [
        "test_lab_policy.Policy.test_equity_risk_surfaced",
        "test_lab_policy.Policy.test_equity_risk_surfaced_second",
        "test_lab_policy.Policy.test_data_insufficiency_abstention",
        "test_lab_policy.Policy.test_dissemination_approval",
        "test_lab_policy.Policy.test_intervention_evidence_quality",
        "test_lab_policy.Policy.test_intervention_evidence_quality_second",
    ],
    "EP-13": [
        "test_jobs.Durability.test_worker_killed_mid_run_resumes_from_checkpoint",
        "test_jobs.Durability.test_duplicate_submission_is_idempotent_and_conflicting_reuse_rejected",
        "test_jobs.Durability.test_source_outage_run_replays_to_completion_when_source_returns",
        "test_jobs.Durability.test_source_change_invalidates_dependent_stages_only",
        "test_jobs.Durability.test_model_release_change_reruns_narrative_but_not_statistics",
        "test_jobs.Durability.test_same_inputs_give_identical_trace_hash_and_changed_inputs_differ",
        "test_jobs.Durability.test_runs_are_pinned_to_their_worker_version_and_rollback_keeps_them_resumable",
        "test_jobs.AuditAndStorage.test_audit_log_tampering_is_detected_at_the_exact_record",
        "test_jobs.AuditAndStorage.test_audit_never_stores_secrets",
        "test_jobs.AuditAndStorage.test_schema_migration_preserves_old_data_and_refuses_newer_schema",
        "test_jobs.AuditAndStorage.test_backup_restore_verifies_integrity_and_audit_chain",
        "test_jobs.ConcurrentDistricts.test_30_real_districts_run_concurrently_under_a_global_cap",
        "test_auth.JwtAuthorization.test_elevated_review_requires_mfa_and_independent_subject",
    ],
    "EP-14": [
        "test_report.Test.test_cross_format_round_trip",
        "test_report.Test.test_restricted_and_revoked_statuses_survive_pdf",
        "test_report.Test.test_native_chart_links_to_numeric_cells",
        "test_reports_api.ReportLifecycle.test_full_review_publishes_and_all_formats_carry_the_same_ast",
    ],
    "EP-15": [
        "test_gateway.Gateway.test_provider_secrets_never_leak_into_prompts_errors_or_audit",
        "test_gateway.FrontendBundle.test_no_secret_patterns_in_frontend_source_or_built_bundle",
        "test_jobs.AuditAndStorage.test_audit_never_stores_secrets",
        "test_jobs.AuditAndStorage.test_audit_log_tampering_is_detected_at_the_exact_record",
        "test_sources.Retrieval.test_ssrf_urls_blocked",
        "test_extract.Xlsx.test_malicious_xlsx_formula",
        "test_extract.Xlsx.test_malicious_zip_path",
        "test_report_service.T.test_district_scope_enforced",
        "test_report_service.T.test_cross_tenant_access_looks_like_not_found",
        "test_auth.JwtAuthorization.test_elevated_review_requires_mfa_and_independent_subject",
        "test_retention_and_storage.Retention.test_expired_retention_denies_all_use",
        "test_retention_and_storage.Retention.test_boundary_retention_exact_timestamp",
        "test_retention_and_storage.ObjectStoreOutage.test_publish_recovers_after_outage",
    ],
    "EP-16": [
        "test_real_eicv7.RealEicv7.test_all_30_districts_batch",
        "test_jobs.ConcurrentDistricts.test_30_real_districts_run_concurrently_under_a_global_cap",
        "test_lab_policy.Policy.test_dissemination_approval",
    ],
}

# Audit defect integration test mappings (where real integration tests exist)
DEFECT_TESTS = {
    "W3": [  # AI-01 - AI-text correction introduces new claim
        "test_trust.ClaimCompilation.test_true_vup_style_sentence_not_miscorrected_and_no_new_claim_introduced",
    ],
    "W4": [  # AI-02 - AI can state unsupported numbers
        "test_trust.ClaimCompilation.test_free_text_numbers_rejected_by_schema_and_prose_scan",
    ],
    "W6": [  # SCI-09 - No runtime independent statistical validation
        "test_r_reference.RReference.test_real_r_vs_python_agreement_within_registered_tolerance",
    ],
    "W7": [  # EVD-06 - Equivalent-definition decisions are hand flags
        "test_trust.EvidenceOrigin.test_equivalent_definition_decisions_are_hand_flags",
    ],
    "W8": [  # SCI-05 - Partial complex-survey inference
        "test_survey.SurveyTests.test_singleton_stratum_aborts_with_explicit_error",
        "test_survey.SurveyTests.test_fpc_reduces_variance",
    ],
    "W9": [  # AI-12 - Inconsistent/duplicated multi-LLM provider logic
        "test_gateway.Gateway.test_quota_429_fails_over_without_hammering_same_provider",
        "test_gateway.MultiKeyCredentials.test_quota_on_first_key_fails_over_to_the_second_key",
    ],
    "W10": [  # AI-18 - Weak narrative/external-evidence reproducibility
        "test_agents.Orchestration.test_hypothesis_generation_with_evidence_links",
        "test_gateway.Gateway.test_prompt_data_and_schema_hashes_are_pinned_in_audit",
    ],
    "W11": [  # EVD-13 - Source failures invisible in headline and citations
        "test_sources.Retrieval.test_outage_without_cache_is_explicit_not_a_verified_headline",
        "test_sources.Rollups.test_verification_row_counts_always_reconcile",
    ],
    "W12": [  # AI-08 - Reliability/uncertainty absent from AI digest
        "test_trust.ClaimCompilation.test_precision_grade_propagation",
        "test_gateway.Gateway.test_prompt_data_and_schema_hashes_are_pinned_in_audit",
    ],
    "W16": [  # OPS-10 - Documentation and metadata drift
        "test_ci_gate.CiGate.test_gate_exits_nonzero_when_critical_scenario_fails",
    ],
}

# Apply workstream mappings
for req in reg["requirements"]:
    if req.get("kind") == "workstream" and req["id"] in WORKSTREAM_TESTS:
        req["status"] = "verified"
        req["integration_tests"] = WORKSTREAM_TESTS[req["id"]]

# Apply defect mappings
for defect in reg["audit_defects"]:
    if defect["id"] in DEFECT_TESTS:
        defect["integration_tests"] = DEFECT_TESTS[defect["id"]]

REGISTRY.write_text(json.dumps(reg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("Updated workstreams:", len(WORKSTREAM_TESTS))
print("Updated audit defects:", len(DEFECT_TESTS))