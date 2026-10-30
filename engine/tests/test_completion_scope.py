import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.verify_engine_completion import evaluate_scenario


class AcceptanceScope(unittest.TestCase):
    def test_component_success_is_not_acceptance(self):
        result = evaluate_scenario([('unit', 'synthetic')], {'unit': 'pass'})
        self.assertEqual(result['component_verdict'], 'PASS')
        self.assertEqual(result['verdict'], 'COMPONENT_ONLY')

    def test_explicit_executed_scope_can_pass(self):
        result = evaluate_scenario([('integration', 'synthetic')], {'integration': 'pass'},
                                   acceptance_tests=['integration'])
        self.assertEqual(result['verdict'], 'PASS')

    def test_fixture_evidence_cannot_satisfy_real_requirement(self):
        result = evaluate_scenario([('integration', 'synthetic')], {'integration': 'pass'},
                                   require_real=True, acceptance_tests=['integration'])
        self.assertEqual(result['verdict'], 'BLOCKED')

    def test_real_evidence_still_requires_scope_mapping(self):
        self.assertEqual(evaluate_scenario([('test', 'real')], {'test': 'pass'}, True)['verdict'], 'COMPONENT_ONLY')

    def test_mapping_to_unrelated_test_is_rejected(self):
        result = evaluate_scenario([('unit', 'synthetic')], {'unit': 'pass', 'unrelated': 'pass'},
                                   acceptance_tests=['unrelated'])
        self.assertEqual(result['verdict'], 'FAIL')

    def test_failures_skips_and_missing_results_cannot_be_masked(self):
        for outcome, expected in [('fail', 'FAIL'), ('error', 'FAIL'), ('skip', 'BLOCKED'), ('missing', 'BLOCKED')]:
            with self.subTest(outcome=outcome):
                result = evaluate_scenario([('test', 'real')], {'test': outcome}, acceptance_tests=['test'])
                self.assertEqual(result['verdict'], expected)
        self.assertEqual(evaluate_scenario([], {})['verdict'], 'NOT RUN')
