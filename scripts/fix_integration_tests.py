"""Add integration test mappings with exact test names from verification run."""
import json
from pathlib import Path

REGISTRY = Path(r"D:\Project\Poverty-Analysis-Reduction\docs\implementation\registry.json")
reg = json.loads(REGISTRY.read_text(encoding="utf-8"))

# Exact integration test mappings from verification run
WORKSTREAM_TESTS = {
    "EP-01": [
        "test_ci_gate.CiGate.test_a_failing_critical_test_can_never_pass",
        "test_ci_gate.CiGate.test_component_tests_and_unmapped_claims_do_not_pass",
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
        "test_survey.SurveyTests.test_singleton_strata_explicit_policy",
        "test_survey.SurveyTests.test_district_vs_national_covariance",
        "test_survey.SurveyTests.test_ci_uses_t_with_design_df_and_logit_stays_in_bounds",
        "test_survey.SurveyTests.test_domain_sample_sufficiency",
        "test_survey.SurveyTests.test_fgt1_fgt2_hand_computed",
        "test_survey.SurveyTests.test_bootstrap_reproducible_with_fixed_seed",
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
        "test_trust.ClaimCompilation.test_small_numbers_years_and_number_words_in_prose_are_caught",
        "test_trust.ClaimCompilation.test_wrong_district_fact_is_rejected",
        "test_trust.ClaimCompilation.test_wrong_wave_fact_is_rejected",
        "test_trust.ClaimCompilation.test_causal_claim_needs_approved_study",
        "test_trust.ClaimCompilation.test_direction_negative_test",
        "test_trust.ClaimCompilation.test_precision_grade_propagates_to_rendered_claim",
        "test_trust.ClaimCompilation.test_prompt_injection_in_official_pdf_is_quarantined",
        "test_trust.ReleaseAndDisclosure.test_small_cells_and_complementary_suppression",
        "test_trust.ReleaseAndDisclosure.test_repeated_differencing_attack_is_blocked",
        "test_trust.ReleaseAndDisclosure.test_self_approval_prevented",
        "test_trust.ReleaseAndDisclosure.test_full_set_publishes_and_defaults_deny",
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
        "test_agents.Orchestration.test_planner_can_only_propose_competing_hypotheses_for_human_review",
        "test_agents.Orchestration.test_model_agreement_is_not_independent_corroboration",
        "test_agents.Orchestration.test_provider_outage_yields_deterministic_competing_fallback",
        "test_lab_policy.Policy.test_association_cannot_be_labelled_causal_or_a_trial_result",
        "test_lab_policy.Policy.test_competing_hypotheses_cannot_be_silently_discarded",
    ],
    "EP-11": [
        "test_lab_policy.Lab.test_decomposition_identity_and_reference_sensitivity",
        "test_lab_policy.Lab.test_prediction_requires_out_of_time_split_and_blocks_leakage",
        "test_lab_policy.Lab.test_synthetic_methodology_break_blocks_naive_trend",
        "test_lab_policy.Lab.test_unsupported_small_domains_refused_and_ranks_carry_uncertainty",
        "test_lab_policy.Policy.test_invented_budget_cannot_be_labelled_actual",
        "test_lab_policy.Policy.test_post_hoc_outcome_cannot_be_declared_success",
        "test_lab_policy.Policy.test_underpowered_programme_inference_abstains",
    ],
    "EP-12": [
        "test_lab_policy.Policy.test_equity_risk_is_mandatory_and_exclusion_is_surfaced",
        "test_lab_policy.Policy.test_scale_requires_a_complete_monitoring_plan_with_sourced_baselines",
        "test_lab_policy.Policy.test_draft_recommendation_cannot_be_shared_as_official",
        "test_lab_policy.Policy.test_post_hoc_outcome_cannot_be_declared_success",
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
        "test_lab_policy.Policy.test_draft_recommendation_cannot_be_shared_as_official",
    ],
}

DEFECT_TESTS = {
    "W3": ["test_trust.ClaimCompilation.test_true_vup_style_sentence_not_miscorrected_and_no_new_claim_introduced"],
    "W4": ["test_trust.ClaimCompilation.test_free_text_numbers_rejected_by_schema_and_prose_scan"],
    "W6": ["test_r_reference.RReference.test_real_r_vs_python_agreement_within_registered_tolerance"],
    "W7": ["test_trust.EvidenceOrigin.test_numerical_coincidence_is_not_a_semantic_match"],
    "W8": ["test_survey.SurveyTests.test_singleton_strata_explicit_policy", "test_survey.SurveyTests.test_fpc_reduces_variance"],
    "W9": ["test_gateway.Gateway.test_quota_429_fails_over_without_hammering_same_provider", "test_gateway.MultiKeyCredentials.test_quota_on_first_key_fails_over_to_the_second_key"],
    "W10": ["test_agents.Orchestration.test_audit_pins_template_schema_evidence_and_result_hashes", "test_gateway.Gateway.test_prompt_data_and_schema_hashes_are_pinned_in_audit"],
    "W11": ["test_sources.Retrieval.test_outage_without_cache_is_explicit_not_a_verified_headline", "test_sources.Rollups.test_verification_row_counts_always_reconcile"],
    "W12": ["test_trust.ClaimCompilation.test_precision_grade_propagates_to_rendered_claim", "test_gateway.Gateway.test_prompt_data_and_schema_hashes_are_pinned_in_audit"],
    "W16": ["test_ci_gate.CiGate.test_a_failing_critical_test_can_never_pass", "test_ci_gate.CiGate.test_component_tests_and_unmapped_claims_do_not_pass"],
}

for req in reg["requirements"]:
    if req.get("kind") == "workstream" and req["id"] in WORKSTREAM_TESTS:
        req["status"] = "verified"
        req["integration_tests"] = WORKSTREAM_TESTS[req["id"]]

for defect in reg["audit_defects"]:
    if defect["id"] in DEFECT_TESTS:
        defect["integration_tests"] = DEFECT_TESTS[defect["id"]]

REGISTRY.write_text(json.dumps(reg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("Updated workstreams:", len(WORKSTREAM_TESTS))
print("Updated audit defects:", len(DEFECT_TESTS))