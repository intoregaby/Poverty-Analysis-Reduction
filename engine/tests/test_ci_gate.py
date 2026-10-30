"""The completion gate cannot be talked into PASS by a failing or unmapped test (OPS-10).

These tests exercise the gate's own decision function, so a regression in the CI/release gate is
caught by the same suite it gates. No acceptance verdict is claimed for any scenario here.
"""
import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from acceptance import acceptance  # noqa: E402

spec = importlib.util.spec_from_file_location("completion_gate", ROOT / "scripts" / "verify_engine_completion.py")
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class CiGate(unittest.TestCase):
    @acceptance("OPS-10")
    def test_a_failing_critical_test_can_never_pass(self):
        linked = [("test_x", "synthetic")]
        self.assertEqual(gate.evaluate_scenario(linked, {"test_x": "fail"}, False, ["test_x"])["verdict"], "FAIL")
        # A skipped or missing acceptance test is not evidence either.
        self.assertEqual(gate.evaluate_scenario(linked, {"test_x": "skip"}, False, ["test_x"])["verdict"], "BLOCKED")
        self.assertEqual(gate.evaluate_scenario(linked, {}, False, ["test_x"])["verdict"], "BLOCKED")
        self.assertEqual(gate.evaluate_scenario(linked, {"test_x": "error"}, False, ["test_x"])["verdict"], "FAIL")

    @acceptance("OPS-10")
    def test_component_tests_and_unmapped_claims_do_not_pass(self):
        linked = [("test_x", "synthetic")]
        self.assertEqual(gate.evaluate_scenario([], {}, False, [])["verdict"], "NOT RUN")
        self.assertEqual(gate.evaluate_scenario(linked, {"test_x": "pass"}, False, [])["verdict"], "COMPONENT_ONLY")
        # Claiming a test that is not linked to the scenario fails the gate outright.
        self.assertEqual(gate.evaluate_scenario(linked, {"test_x": "pass"}, False, ["test_y"])["verdict"], "FAIL")
        # A scenario that requires real evidence is not satisfied by a synthetic pass.
        self.assertEqual(gate.evaluate_scenario(linked, {"test_x": "pass"}, True, ["test_x"])["verdict"], "BLOCKED")
        real = [("test_x", "real")]
        self.assertEqual(gate.evaluate_scenario(real, {"test_x": "pass"}, True, ["test_x"])["verdict"], "PASS")


if __name__ == "__main__":
    unittest.main()
