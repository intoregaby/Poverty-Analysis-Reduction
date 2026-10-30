import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from acceptance import acceptance  # noqa: E402
from ireme import release_gate  # noqa: E402
from ireme.report_service import AccessDenied, Principal, ReportRepository  # noqa: E402

CHECKS = {k: True for k in release_gate.load_policy()["required"]}
SIGS = [{"reviewer_id": "r1", "role": "statistical_reviewer"}, {"reviewer_id": "r2", "role": "privacy_reviewer"},
        {"reviewer_id": "r3", "role": "release_reviewer"}]
render = lambda ast, fmt: f"{fmt}:{ast['body']}".encode()  # noqa: E731


def doc(rid="rep1", ver="1"):
    return {"report_id": rid, "report_version": ver, "investigation_id": "inv1", "fact_snapshot_sha256": "a",
            "comparison_snapshot_sha256": "b", "policy_version": "1.0", "status": "draft", "audience": "analyst",
            "sections": [{"section_id": "s1", "claim_ids": ["c1"]}], "claim_ids": ["c1"], "warnings": [],
            "approval_ids": []}


class T(unittest.TestCase):
    def setUp(self):
        self.now = 1000.0
        self.repo = ReportRepository(os.urandom(32), clock=lambda: self.now)
        self.analyst = Principal("u1", frozenset({"analyst"}), frozenset({"Kamonyi"}))
        self.reviewer = Principal("r3", frozenset({"release_reviewer"}))
        self.repo.create(doc(), {"body": "v1"}, "author", "Kamonyi")

    def release(self, ver="1"):
        return self.repo.approve("rep1", ver, CHECKS, set(), SIGS)

    @acceptance("PRIV-04")
    def test_unreleased_report_cannot_be_exported_or_linked(self):
        with self.assertRaises(AccessDenied) as cm:
            self.repo.export("rep1", "1", self.analyst, "pdf", render)
        self.assertEqual(cm.exception.code, "NOT_RELEASED")
        with self.assertRaises(AccessDenied):
            self.repo.sign_url("rep1", "1", self.analyst)
        with self.assertRaises(AccessDenied) as cm:
            self.repo.fetch_unsigned("rep1", "1", render)
        self.assertEqual(cm.exception.code, "UNAUTHENTICATED")

    @acceptance("PRIV-04")
    def test_failed_gate_leaves_report_blocked_and_released_one_exports(self):
        bad = self.repo.approve("rep1", "1", {**CHECKS, "privacy_and_disclosure_clearance": False}, set(), SIGS)
        self.assertEqual(bad.status, "deny")
        with self.assertRaises(AccessDenied):
            self.repo.export("rep1", "1", self.analyst, "xlsx", render)
        self.assertEqual(self.release().status, "publish")
        self.assertEqual(self.repo.export("rep1", "1", self.analyst, "xlsx", render), b"xlsx:v1")

    @acceptance("PRIV-04")
    def test_forged_and_tampered_tokens_rejected(self):
        self.release()
        tok = self.repo.sign_url("rep1", "1", self.analyst)
        self.assertEqual(self.repo.fetch(tok, render), b"html:v1")
        body, sig = tok.rsplit(".", 1)
        for bad in (body + "x." + sig, body + "." + "0" * 64, "garbage", body):
            with self.assertRaises(AccessDenied):
                self.repo.fetch(bad, render)
        other = ReportRepository(os.urandom(32), clock=lambda: self.now)
        with self.assertRaises(AccessDenied):
            other.fetch(tok, render)

    @acceptance("PRIV-04")
    def test_ast_modified_after_freeze_is_refused(self):
        self.release()
        self.repo.reports[("rep1", "1")]["ast"]["body"] = "tampered"
        with self.assertRaises(AccessDenied) as cm:
            self.repo.export("rep1", "1", self.analyst, "html", render)
        self.assertEqual(cm.exception.code, "INTEGRITY")

    @acceptance("PRIV-05")
    def test_revoked_link_and_revoked_report_denied(self):
        self.release()
        tok = self.repo.sign_url("rep1", "1", self.analyst)
        with self.assertRaises(AccessDenied):
            self.repo.revoke_token(tok, self.analyst)           # analyst lacks the role
        self.repo.revoke_token(tok, self.reviewer)
        with self.assertRaises(AccessDenied) as cm:
            self.repo.fetch(tok, render)
        self.assertEqual(cm.exception.code, "TOKEN_REVOKED")
        tok2 = self.repo.sign_url("rep1", "1", self.analyst)
        self.repo.revoke("rep1", "1", self.reviewer)
        with self.assertRaises(AccessDenied) as cm:
            self.repo.fetch(tok2, render)
        self.assertEqual(cm.exception.code, "REVOKED")

    @acceptance("PRIV-05")
    def test_expired_link_denied(self):
        self.release()
        tok = self.repo.sign_url("rep1", "1", self.analyst, ttl_s=60)
        self.now += 61
        with self.assertRaises(AccessDenied) as cm:
            self.repo.fetch(tok, render)
        self.assertEqual(cm.exception.code, "TOKEN_EXPIRED")

    @acceptance("OPS-14")
    def test_stale_signed_report_view_after_new_version(self):
        self.release()
        tok = self.repo.sign_url("rep1", "1", self.analyst)
        self.repo.create(doc(ver="2"), {"body": "v2"}, "author", "Kamonyi")
        self.release("2")
        with self.assertRaises(AccessDenied) as cm:
            self.repo.fetch(tok, render)
        self.assertEqual(cm.exception.code, "SUPERSEDED")
        self.assertIn("2", str(cm.exception))
        self.assertEqual(self.repo.fetch(self.repo.sign_url("rep1", "2", self.analyst), render), b"html:v2")

    @acceptance("PRIV-07")
    def test_district_scope_enforced(self):
        self.release()
        other = Principal("u2", frozenset({"analyst"}), frozenset({"Muhanga"}))
        with self.assertRaises(AccessDenied) as cm:
            self.repo.export("rep1", "1", other, "pdf", render)
        self.assertEqual(cm.exception.code, "FORBIDDEN")

    @acceptance("PRIV-08")
    def test_cross_tenant_access_looks_like_not_found(self):
        self.release()
        foreign = Principal("x", frozenset({"admin"}), frozenset(), tenant="other-org")
        with self.assertRaises(AccessDenied) as cm:
            self.repo.export("rep1", "1", foreign, "pdf", render)
        self.assertEqual(cm.exception.code, "NOT_FOUND")

    def test_weak_signing_key_refused(self):
        with self.assertRaises(ValueError):
            ReportRepository(b"short")


if __name__ == "__main__":
    unittest.main()
