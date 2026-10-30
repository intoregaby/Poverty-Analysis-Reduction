"""Release profiles: HACKATHON_DEMO vs GOVERNED_PRODUCTION.

This module defines the two release profiles required by the NISR 2026 Hackathon.

HACKATHON_DEMO:
- Allows correctly validated, authorized, non-sensitive investigation outputs to be viewed
- Clearly labels unapproved research outputs as DEMONSTRATION / NOT INDEPENDENTLY CERTIFIED
- Keeps official/production report publication protected by the original governance gates
- Does NOT enable public access to private datasets or confidential microdata
- Uses test identities for MFA/role separation testing
- Test signatures are kept separate from real approval records
- Includes Admin MFA Toggle: MFA disabled by default for quick testing, admin can toggle ON for strict testing

GOVERNED_PRODUCTION:
- Full production governance gates remain mandatory
- Independent scientific ownership and approval required
- Authentic human report approvals (AAL2, distinct reviewers)
- Production infrastructure (Postgres, encrypted object store, hosted IdP/MFA)
- Three distinct AAL2 reviewers + publication authority
- Real reviewer identities, not test identities

The profiles are selected via environment variable IREME_PROFILE at startup.
"""
from __future__ import annotations
import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Optional


class Profile(str, Enum):
    HACKATHON_DEMO = "HACKATHON_DEMO"
    GOVERNED_PRODUCTION = "GOVERNED_PRODUCTION"


@dataclass(frozen=True)
class ProfileConfig:
    """Configuration for a release profile."""
    name: Profile
    description: str

    # Report/review gates
    require_independent_scientific_approval: bool
    require_three_distinct_reviewers: bool
    require_aal2_for_review: bool
    require_publication_authority: bool
    allow_demonstration_exports: bool
    demonstration_label: str

    # Identity/AUTH
    allow_test_identities: bool
    test_identity_prefix: str
    separate_test_signatures: bool

    # Infrastructure
    require_production_infrastructure: bool
    allow_local_sqlite: bool
    allow_local_object_store: bool

    # Data access
    allow_public_datasets_only: bool
    allow_microdata_access: bool

    # Export/visibility
    allow_hackathon_visibility: bool
    hackathon_label: str

    # Verification
    skip_external_approvals_in_verification: bool

    # MFA Configuration
    mfa_enabled: bool = True
    admin_mfa_toggle: bool = False  # Allow admin to toggle MFA ON/OFF via admin panel


# =============================================================================
# Profile definitions
# =============================================================================

HACKATHON_DEMO_CONFIG = ProfileConfig(
    name=Profile.HACKATHON_DEMO,
    description=(
        "NISR 2026 Hackathon demonstration profile. "
        "Allows validated, authorized, non-sensitive outputs with DEMONSTRATION labels. "
        "Uses test identities. Does NOT grant production certification. "
        "MFA is disabled by default for quick testing; admin can toggle ON via admin panel."
    ),

    # Report/review gates - relaxed for demo
    require_independent_scientific_approval=False,
    require_three_distinct_reviewers=False,
    require_aal2_for_review=False,  # Test identities can use aal1
    require_publication_authority=False,
    allow_demonstration_exports=True,
    demonstration_label="DEMONSTRATION / NOT INDEPENDENTLY CERTIFIED",

    # Identity - allow test identities
    allow_test_identities=True,
    test_identity_prefix="test-,hackathon-",
    separate_test_signatures=True,

    # MFA Configuration - disabled by default for demo, but admin can toggle
    mfa_enabled=False,
    admin_mfa_toggle=True,  # Allow admin to toggle MFA ON/OFF via admin panel

    # Infrastructure - allow local dev
    require_production_infrastructure=False,
    allow_local_sqlite=True,
    allow_local_object_store=True,

    # Data - public datasets only
    allow_public_datasets_only=True,
    allow_microdata_access=False,

    # Export - hackathon visibility
    allow_hackathon_visibility=True,
    hackathon_label="HACKATHON DEMO",

    # Verification - don't require external approvals
    skip_external_approvals_in_verification=True,
)

GOVERNED_PRODUCTION_CONFIG = ProfileConfig(
    name=Profile.GOVERNED_PRODUCTION,
    description=(
        "Full production governance profile. All research-grade capabilities mandatory. "
        "Independent scientific ownership, authentic human approvals, production infrastructure required."
    ),

    # Report/review gates - strict
    require_independent_scientific_approval=True,
    require_three_distinct_reviewers=True,
    require_aal2_for_review=True,
    require_publication_authority=True,
    allow_demonstration_exports=False,
    demonstration_label="",

    # Identity - real identities only
    allow_test_identities=False,
    test_identity_prefix="",
    separate_test_signatures=False,

    # MFA Configuration - always enabled in production
    mfa_enabled=True,
    admin_mfa_toggle=False,  # No toggle in production

    # Infrastructure - production required
    require_production_infrastructure=True,
    allow_local_sqlite=False,
    allow_local_object_store=False,

    # Data - full access with proper permissions
    allow_public_datasets_only=False,
    allow_microdata_access=True,

    # Export - no hackathon visibility
    allow_hackathon_visibility=False,
    hackathon_label="",

    # Verification - full requirements
    skip_external_approvals_in_verification=False,
)

# Registry of all profiles
PROFILES = {
    Profile.HACKATHON_DEMO: HACKATHON_DEMO_CONFIG,
    Profile.GOVERNED_PRODUCTION: GOVERNED_PRODUCTION_CONFIG,
}


def get_profile() -> Profile:
    """Get the active profile from environment variable."""
    env = os.environ.get("IREME_PROFILE", "GOVERNED_PRODUCTION").upper()
    try:
        return Profile(env)
    except ValueError:
        raise ValueError(f"Invalid IREME_PROFILE: {env}. Valid: {[p.value for p in Profile]}")


def get_config(profile: Optional[Profile] = None) -> ProfileConfig:
    """Get configuration for the active or specified profile."""
    if profile is None:
        profile = get_profile()
    return PROFILES[profile]


# =============================================================================
# Profile-aware utilities
# =============================================================================

def require_production(profile: Optional[ProfileConfig] = None) -> None:
    """Raise if not running in GOVERNED_PRODUCTION profile."""
    if profile is None:
        profile = get_config()
    if profile.name != Profile.GOVERNED_PRODUCTION:
        raise RuntimeError(
            f"Operation requires GOVERNED_PRODUCTION profile, current: {profile.name.value}")


def require_aal2(principal, profile: Optional[ProfileConfig] = None) -> None:
    """Check AAL2 requirement based on profile."""
    if profile is None:
        profile = get_config()
    if profile.require_aal2_for_review and principal.assurance != 'aal2':
        from .auth import AuthorizationError
        raise AuthorizationError('Elevated authentication required (AAL2)')


def require_independent_reviewer(principal, author: str, profile: Optional[ProfileConfig] = None) -> None:
    """Check independent reviewer requirement based on profile."""
    if profile is None:
        profile = get_config()
    if profile.require_independent_scientific_approval and principal.subject == author:
        from .auth import AuthorizationError
        raise AuthorizationError('Independent reviewer required')


def is_test_identity(principal, profile: Optional[ProfileConfig] = None) -> bool:
    """Check if principal is a test identity."""
    if profile is None:
        profile = get_config()
    if not profile.allow_test_identities:
        return False
    # Support multiple prefixes: split by comma if provided
    prefixes = [p.strip() for p in profile.test_identity_prefix.split(",") if p.strip()]
    return any(principal.subject.startswith(p) for p in prefixes)


def get_demonstration_label(profile: Optional[ProfileConfig] = None) -> str:
    """Get the demonstration label for exports."""
    if profile is None:
        profile = get_config()
    return profile.demonstration_label


def can_export_demo(profile: Optional[ProfileConfig] = None) -> bool:
    """Check if demonstration exports are allowed."""
    if profile is None:
        profile = get_config()
    return profile.allow_demonstration_exports


def can_view_hackathon(profile: Optional[ProfileConfig] = None) -> bool:
    """Check if hackathon demo visibility is allowed."""
    if profile is None:
        profile = get_config()
    return profile.allow_hackathon_visibility


def verification_skip_external(profile: Optional[ProfileConfig] = None) -> bool:
    """Check if verification should skip external approval requirements."""
    if profile is None:
        profile = get_config()
    return profile.skip_external_approvals_in_verification


def is_mfa_enabled(profile: Optional[ProfileConfig] = None) -> bool:
    """Check if MFA is currently enabled for the profile."""
    if profile is None:
        profile = get_config()
    return profile.mfa_enabled


def set_mfa_enabled(enabled: bool, profile: Optional[ProfileConfig] = None) -> bool:
    """Set MFA enabled state (only works if admin_mfa_toggle is enabled)."""
    if profile is None:
        profile = get_config()
    if not profile.admin_mfa_toggle:
        return False  # Cannot change MFA state if toggle not allowed
    # Note: Since ProfileConfig is frozen, this would require a mutable state store
    # For now, we track MFA state separately in auth module
    from .auth import _set_mfa_state
    _set_mfa_state(enabled)
    return True


def get_admin_mfa_toggle_allowed(profile: Optional[ProfileConfig] = None) -> bool:
    """Check if admin MFA toggle is allowed for the profile."""
    if profile is None:
        profile = get_config()
    return profile.admin_mfa_toggle