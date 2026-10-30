"""Illustrative, executable negative-test oracle for basic design invariants.
NOT a production release gate; does not implement full semantic, statistical or privacy checks.
"""
from __future__ import annotations


def external_match_allowed(calculated: dict, official: dict, comparison: dict) -> bool:
    mandatory = ("concept_match", "population_match", "unit_match", "period_match", "geography_match", "method_match", "origins_independent")
    if not all(comparison.get(k) is True for k in mandatory):
        return False
    if calculated.get("origin_type") != "computed_microdata":
        return False
    if official.get("origin_type") != "independent_official_document":
        return False
    if not calculated.get("origin_artifact_hash") or not official.get("origin_artifact_hash"):
        return False
    if calculated["origin_artifact_hash"] == official["origin_artifact_hash"]:
        return False
    if official.get("extraction_status") != "table_verified":
        return False
    return abs(calculated["point_estimate"] - official["point_estimate"]) <= comparison["registered_tolerance"]


def claim_shape_allowed(claim: dict) -> bool:
    # A production check also must resolve and authorize fact IDs and ensure numerical meaning.
    banned = {"value", "numeric_text", "report_sentence", "number", "percentage", "free_text"}
    return not (set(claim) & banned) and bool(claim.get("fact_ids")) and bool(claim.get("claim_id"))


def publication_allowed(checks: dict, reviewer_ids: set[str], report_author: str) -> bool:
    required = ["scientific_pass", "origin_pass", "claims_pass", "privacy_pass", "citation_pass", "cross_format_pass", "policy_pass"]
    return all(checks.get(k) is True for k in required) and bool(reviewer_ids) and report_author not in reviewer_ids
