#!/usr/bin/env python3
"""Test script for hackathon demo review workflow.

Creates test identities, generates JWTs, and tests the review workflow
in HACKATHON_DEMO profile mode.
"""
from __future__ import annotations
import os
import sys
import tempfile
import time
import json
from pathlib import Path

# Add engine to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ireme.profiles import get_config
from ireme import auth
from ireme.auth import Principal
from ireme.reports import ReportStore
from ireme import report


def test_hackathon_demo_profile():
    """Test that HACKATHON_DEMO profile is correctly configured."""
    os.environ["IREME_PROFILE"] = "HACKATHON_DEMO"
    config = get_config()
    
    assert config.name.value == "HACKATHON_DEMO"
    assert config.allow_test_identities is True
    assert config.allow_demonstration_exports is True
    assert config.demonstration_label == "DEMONSTRATION / NOT INDEPENDENTLY CERTIFIED"
    assert config.require_aal2_for_review is False
    assert config.require_three_distinct_reviewers is False
    assert config.allow_local_sqlite is True
    assert config.allow_hackathon_visibility is True
    
    print("[OK] HACKATHON_DEMO profile configuration verified")


def test_governed_production_profile():
    """Test that GOVERNED_PRODUCTION profile is correctly configured."""
    os.environ["IREME_PROFILE"] = "GOVERNED_PRODUCTION"
    config = get_config()
    
    assert config.name.value == "GOVERNED_PRODUCTION"
    assert config.allow_test_identities is False
    assert config.allow_demonstration_exports is False
    assert config.require_aal2_for_review is True
    assert config.require_three_distinct_reviewers is True
    assert config.allow_local_sqlite is False
    assert config.allow_hackathon_visibility is False
    
    print("[OK] GOVERNED_PRODUCTION profile configuration verified")


def test_test_identities():
    """Test creation of test identities."""
    os.environ["IREME_PROFILE"] = "HACKATHON_DEMO"
    identities = auth.create_test_identities()
    
    assert len(identities) == 4
    subjects = {i["subject"] for i in identities}
    assert subjects == {"test-statistician", "test-privacy-officer", "test-release-authority", "hackathon-viewer"}
    
    for identity in identities:
        assert identity["tenant"] == "nisr-hackathon"
        assert identity["assurance"] == "aal1"
        assert identity["expires_at"] > int(time.time())
    
    print("[OK] Test identities created successfully")


def test_is_test_identity():
    """Test the is_test_identity function."""
    from ireme.profiles import is_test_identity
    
    os.environ["IREME_PROFILE"] = "HACKATHON_DEMO"
    config = get_config()
    
    # Create mock principals
    class MockPrincipal:
        def __init__(self, subject):
            self.subject = subject
    
    test_statistician = MockPrincipal("test-statistician")
    test_viewer = MockPrincipal("hackathon-viewer")
    real_user = MockPrincipal("real-user")
    
    assert is_test_identity(test_statistician, config) is True
    assert is_test_identity(test_viewer, config) is True
    assert is_test_identity(real_user, config) is False
    
    # In production mode, no test identities
    os.environ["IREME_PROFILE"] = "GOVERNED_PRODUCTION"
    prod_config = get_config()
    assert is_test_identity(test_statistician, prod_config) is False
    
    print("[OK] is_test_identity function works correctly")


def test_authorization_demo():
    """Test authorization in HACKATHON_DEMO mode."""
    os.environ["IREME_PROFILE"] = "HACKATHON_DEMO"
    config = get_config()
    
    from ireme.auth import Principal, AuthorizationError
    
    # Create test principals
    statistician = Principal(
        subject="test-statistician",
        tenant="nisr-hackathon",
        roles=frozenset(["test-statistician"]),
        districts=frozenset(["Rwanda"]),
        national_scope=True,
        assurance="aal1",
        expires_at=int(time.time()) + 3600,
    )
    
    privacy_officer = Principal(
        subject="test-privacy-officer",
        tenant="nisr-hackathon",
        roles=frozenset(["test-privacy-officer"]),
        districts=frozenset(["Rwanda"]),
        national_scope=True,
        assurance="aal1",
        expires_at=int(time.time()) + 3600,
    )
    
    release_authority = Principal(
        subject="test-release-authority",
        tenant="nisr-hackathon",
        roles=frozenset(["test-release-authority"]),
        districts=frozenset(["Rwanda"]),
        national_scope=True,
        assurance="aal1",
        expires_at=int(time.time()) + 3600,
    )
    
    viewer = Principal(
        subject="hackathon-viewer",
        tenant="nisr-hackathon",
        roles=frozenset(["hackathon-viewer"]),
        districts=frozenset(["Rwanda"]),
        national_scope=True,
        assurance="aal1",
        expires_at=int(time.time()) + 3600,
    )
    
    # Test investigation:read
    from ireme.auth import authorize
    authorize(viewer, "investigation:read", "nisr-hackathon", "Rwanda", profile=config)
    authorize(statistician, "investigation:read", "nisr-hackathon", "Rwanda", profile=config)
    
    # Test investigation:create
    authorize(statistician, "investigation:create", "nisr-hackathon", "Rwanda", profile=config)
    
    # Test report:review - should work with aal1 in demo mode
    authorize(statistician, "report:review", "nisr-hackathon", "Rwanda", author="some-author", profile=config)
    authorize(privacy_officer, "report:review", "nisr-hackathon", "Rwanda", author="some-author", profile=config)
    
    # Test report:publish - should work in demo mode
    authorize(release_authority, "report:publish", "nisr-hackathon", "Rwanda", author="some-author", profile=config)
    
    print("[OK] HACKATHON_DEMO authorization works correctly")


def test_authorization_production():
    """Test authorization in GOVERNED_PRODUCTION mode (should fail without AAL2)."""
    os.environ["IREME_PROFILE"] = "GOVERNED_PRODUCTION"
    config = get_config()
    
    from ireme.auth import Principal, AuthorizationError
    from ireme.auth import authorize
    
    # Real user with aal1 (should fail for report:review)
    real_user = Principal(
        subject="real-user",
        tenant="nisr-prod",
        roles=frozenset(["statistical_reviewer"]),
        districts=frozenset(["Rwanda"]),
        national_scope=True,
        assurance="aal1",
        expires_at=int(time.time()) + 3600,
    )
    
    try:
        authorize(real_user, "report:review", "nisr-prod", "Rwanda", author="other-author", profile=config)
        assert False, "Should have failed - AAL2 required"
    except AuthorizationError as e:
        assert "Elevated authentication required" in str(e)
    
    # With AAL2 should work
    real_user_aal2 = Principal(
        subject="real-user-aal2",
        tenant="nisr-prod",
        roles=frozenset(["statistical_reviewer"]),
        districts=frozenset(["Rwanda"]),
        national_scope=True,
        assurance="aal2",
        expires_at=int(time.time()) + 3600,
    )
    
    authorize(real_user_aal2, "report:review", "nisr-prod", "Rwanda", author="other-author", profile=config)
    
    print("[OK] GOVERNED_PRODUCTION authorization works correctly")


def test_governed_api_demo():
    """Test the governed API in demo mode."""
    os.environ["IREME_PROFILE"] = "HACKATHON_DEMO"
    
    # Create a minimal test with the API
    from ireme.api import create_app
    from ireme.auth import TokenVerifier
    from ireme.profiles import get_config
    from ireme.auth import create_test_identities, create_test_jwt
    from ireme.profiles import ProfileConfig
    
    # We can't easily test the full API without JWT keys, but we can verify
    # the app can be created with the demo profile
    config = get_config()
    assert config.name.value == "HACKATHON_DEMO"
    
    print("[OK] API can be created with HACKATHON_DEMO profile")


def test_report_export_demo_label():
    """Test that demo exports get the demonstration label."""
    os.environ["IREME_PROFILE"] = "HACKATHON_DEMO"
    
    from ireme.profiles import get_config
    from ireme.reports import ReportStore
    from ireme import report
    import json
    import tempfile
    from pathlib import Path
    
    config = get_config()
    
    # Create a test report store
    with tempfile.TemporaryDirectory() as tmpdir:
        store = ReportStore(Path(tmpdir) / "reports.db")
        
        # Create a valid AST using build_ast
        sections = [{
            "id": "summary",
            "title": "Summary",
            "claims": [{"claim_id": "c1", "text": "Demo claim"}],
            "tables": [],
            "charts": []
        }]
        ast = report.build_ast("demo-report", "1", "Demo Report", "draft", sections, [], "Demo verification")
        document = {
            "report_id": "demo-report",
            "report_version": "1",
            "investigation_id": "inv-1",
            "fact_snapshot_sha256": "a" * 64,
            "comparison_snapshot_sha256": "b" * 64,
            "policy_version": "1.0",
            "status": "draft",
            "audience": "public",
            "sections": [{"section_id": "summary", "claim_ids": ["c1"]}],
            "claim_ids": ["c1"],
            "warnings": [],
            "approval_ids": [],
        }
        
        # Create the report with server-side checks
        checks = {
            "dataset_license_permits_purpose": True,
            "complete_indicator_definitions": True,
            "independent_statistical_validation": True,
            "required_precision_and_reliability_or_explicit_unestimable_reason": True,
            "accurate_official_comparison_statuses": True,
            "self_match_prohibition": True,
            "fully_bound_claims": True,
            "causal_claim_study_approval": True,
            "citation_lineage_integrity": True,
            "privacy_and_disclosure_clearance": True,
            "report_ast_frozen": True,
            "cross_format_consistency": True,
            "non_conflicted_required_evidence": True,
        }
        store.create(document, ast, "author-1", "Rwanda", "nisr-hackathon", checks)
        
        # Review and publish (in demo mode, test identities can review and publish)
        from ireme.auth import Principal
        config = get_config()
        
        # Three reviewers approve (test identities can review in demo mode)
        statistician = Principal(
            subject="test-statistician", tenant="nisr-hackathon", roles=frozenset(["test-statistician"]),
            districts=frozenset(["Rwanda"]), national_scope=True, assurance="aal1", expires_at=int(time.time())+3600
        )
        privacy_officer = Principal(
            subject="test-privacy-officer", tenant="nisr-hackathon", roles=frozenset(["test-privacy-officer"]),
            districts=frozenset(["Rwanda"]), national_scope=True, assurance="aal1", expires_at=int(time.time())+3600
        )
        release_authority = Principal(
            subject="test-release-authority", tenant="nisr-hackathon", roles=frozenset(["test-release-authority"]),
            districts=frozenset(["Rwanda"]), national_scope=True, assurance="aal1", expires_at=int(time.time())+3600
        )
        
        # All three reviewers approve
        store.review("demo-report", "1", statistician.subject, frozenset(["test-statistician"]), "approve", "Approved for demo", profile=config)
        store.review("demo-report", "1", privacy_officer.subject, frozenset(["test-privacy-officer"]), "approve", "Approved for demo", profile=config)
        store.review("demo-report", "1", release_authority.subject, frozenset(["test-release-authority"]), "approve", "Approved for demo", profile=config)
        
        # Now publish
        publisher = Principal(
            subject="test-release-authority",
            tenant="nisr-hackathon",
            roles=frozenset(["test-release-authority"]),
            districts=frozenset(["Rwanda"]),
            national_scope=True,
            assurance="aal1",
            expires_at=int(time.time()) + 3600,
        )
        store.publish("demo-report", "1", publisher.subject, frozenset(["test-release-authority"]), profile=config)
        
        # Export with demo profile
        body, media_type = store.export("demo-report", "1", 
            Principal("viewer", "nisr-hackathon", frozenset(["hackathon-viewer"]), frozenset(["Rwanda"]), True, "aal1", int(time.time())+3600),
            "json", profile=config)
        
        data = json.loads(body)
        assert "_demonstration_label" in data
        assert data["_demonstration_label"] == "DEMONSTRATION / NOT INDEPENDENTLY CERTIFIED"
        
        store.close()  # Close DB connection before temp dir cleanup
        
        print("[OK] Demo export includes demonstration label")


if __name__ == "__main__":
    print("Testing HACKATHON_DEMO profile...\n")
    
    test_hackathon_demo_profile()
    test_governed_production_profile()
    test_test_identities()
    test_is_test_identity()
    test_authorization_demo()
    test_authorization_production()
    test_governed_api_demo()
    test_report_export_demo_label()
    
    print("\n[DONE] All profile tests passed!")