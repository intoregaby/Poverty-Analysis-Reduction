"""Demo admin endpoints over the ASGI boundary.

The AI Engine console shows which demo freedoms are active, so any signed-in
principal may read the demo state, while only an admin may flip it. Production
must disclose nothing: even the read endpoints answer 403 there.
"""
import copy
import sys
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ireme import api  # noqa: E402
from ireme.profiles import (  # noqa: E402
    GOVERNED_PRODUCTION_CONFIG, HACKATHON_DEMO_CONFIG,
    get_bypass_status, reset_bypass_overrides,
)
import test_auth as fixture_auth  # noqa: E402


class DemoAdminEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fixture_auth.JwtAuthorization.setUpClass()

    def setUp(self):
        reset_bypass_overrides()
        self.addCleanup(reset_bypass_overrides)
        self.signer = fixture_auth.JwtAuthorization()
        self.signer.setUp()
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        base = Path(self.temp.name)
        self.client = TestClient(api.create_app(
            self.signer.verifier, base / "catalog.db", base / "audit.db",
            profile=HACKATHON_DEMO_CONFIG))
        self.addCleanup(self.client.close)
        self.prod = TestClient(api.create_app(
            self.signer.verifier, base / "catalog-prod.db", base / "audit-prod.db",
            profile=GOVERNED_PRODUCTION_CONFIG))
        self.addCleanup(self.prod.close)

    def token(self, roles, subject="analyst"):
        payload = copy.deepcopy(self.signer.payload)
        payload["sub"] = subject
        payload["app_metadata"] = {**payload["app_metadata"], "roles": list(roles)}
        return self.signer.token(payload)

    def get(self, client, path, roles):
        return client.get(path, headers={"Authorization": self.token(roles)})

    def post(self, client, path, roles, body):
        return client.post(path, json=body, headers={"Authorization": self.token(roles)})

    def test_analyst_can_read_the_demo_bypass_ledger(self):
        response = self.get(self.client, "/v1/admin/bypass/status", ["nisr_analyst"])
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["profile"], "HACKATHON_DEMO")
        self.assertTrue(body["bypass"]["bypass_human_approvals"])
        self.assertTrue(body["bypass"]["bypass_verification_gates"])
        self.assertEqual(set(body["bypass"]), {
            "bypass_independent_statistician", "bypass_human_approvals",
            "bypass_production_infra", "bypass_verification_gates",
        })

    def test_only_an_admin_may_flip_a_bypass(self):
        denied = self.post(self.client, "/v1/admin/bypass/toggle", ["nisr_analyst"],
                           {"bypass_human_approvals": False})
        self.assertEqual(denied.status_code, 403, denied.text)
        self.assertTrue(get_bypass_status()["bypass_human_approvals"])

        allowed = self.post(self.client, "/v1/admin/bypass/toggle", ["platform_admin"],
                            {"bypass_human_approvals": False})
        self.assertEqual(allowed.status_code, 200, allowed.text)
        self.assertFalse(allowed.json()["bypass"]["bypass_human_approvals"])
        self.assertFalse(get_bypass_status()["bypass_human_approvals"])

    def test_verification_gate_bypass_is_runtime_togglable(self):
        self.assertTrue(get_bypass_status()["bypass_verification_gates"])
        response = self.post(self.client, "/v1/admin/bypass/toggle", ["platform_admin"],
                             {"bypass_verification_gates": False})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertFalse(get_bypass_status()["bypass_verification_gates"])
        self.assertFalse(response.json()["bypass"]["bypass_verification_gates"])

    def test_analyst_can_read_mfa_state_in_the_demo(self):
        response = self.get(self.client, "/v1/admin/mfa/status", ["nisr_analyst"])
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["profile"], "HACKATHON_DEMO")
        self.assertTrue(response.json()["admin_toggle_allowed"])

    def test_production_discloses_no_demo_state(self):
        for path in ("/v1/admin/bypass/status", "/v1/admin/mfa/status"):
            response = self.get(self.prod, path, ["platform_admin"])
            self.assertEqual(response.status_code, 403, f"{path}: {response.text}")
        denied = self.post(self.prod, "/v1/admin/bypass/toggle", ["platform_admin"],
                           {"bypass_verification_gates": True})
        self.assertEqual(denied.status_code, 403, denied.text)


if __name__ == "__main__":
    unittest.main()
