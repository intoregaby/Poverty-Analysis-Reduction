import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ireme import claims
from ireme.contrasts import ContrastRegistry
from test_trust import calc_fact, store_with, PROPOSAL, SCOPE


class ContrastClaims(unittest.TestCase):
    def setUp(self):
        # Synthetic scientific verdict fixtures test compilation, not scientific approval.
        self.store = store_with(calc_fact('fK', value=28.0, se=3.3),
                                calc_fact('fN', geo='RW', value=27.4, se=0.6),
                                calc_fact('gap', ind='pov_rate_person_difference', value=0.6, se=0.1, unit='pp'))
        self.studies = claims.StudyRegistry()
        self.registry = ContrastRegistry()

    def compile(self, relation='above'):
        return claims.compile_claim({**PROPOSAL, 'relation': relation}, self.store, SCOPE, self.studies,
                                    contrasts=self.registry)

    def test_no_joint_evidence_never_uses_independent_sample_formula(self):
        out = self.compile()
        self.assertEqual(out['qualification_code'], 'uncertainty_not_evaluated')
        self.assertNotIn('gap exceeds sampling error', out['text'])
        self.assertNotIn('within sampling uncertainty', out['text'])

    def test_validated_joint_contrast_controls_sampling_claim_and_lineage(self):
        self.registry.bind(self.store, 'fK', 'fN', 'gap', df=100)
        out = self.compile()
        self.assertEqual(out['qualification_code'], 'observational_difference')
        self.assertIn('gap', out['fact_ids'])
        self.assertIn('gap exceeds sampling error', out['text'])

    def test_low_degrees_of_freedom_uses_t_instead_of_normal_threshold(self):
        self.store.calculated['gap']['standard_error'] = 0.2
        self.registry.bind(self.store, 'fK', 'fN', 'gap', df=1)
        self.assertEqual(self.compile()['qualification_code'], 'not_distinguishable')

    def test_stale_or_revoked_contrast_cannot_support_claim(self):
        self.registry.bind(self.store, 'fK', 'fN', 'gap', df=100)
        self.store.calculated['gap']['standard_error'] = 0.0001
        with self.assertRaises(claims.ClaimRejected):
            self.compile()
        self.store.calculated['gap']['standard_error'] = 0.1
        self.store.verdicts['v-gap']['decision'] = 'validation_failed'
        with self.assertRaises(claims.ClaimRejected):
            self.compile()

    def test_non_significance_is_not_equivalence(self):
        self.store.calculated['gap']['standard_error'] = 10.0
        self.registry.bind(self.store, 'fK', 'fN', 'gap', df=100)
        with self.assertRaises(claims.ClaimRejected) as error:
            self.compile('approximately_equal')
        self.assertEqual(error.exception.code, 'EQUIVALENCE_NOT_ESTABLISHED')

    def test_equivalence_needs_registered_margin_and_validated_tost(self):
        with self.assertRaises(ValueError):
            self.registry.bind(self.store, 'fK', 'fN', 'gap', df=100, equivalence_margin=1.0)
        self.registry.bind(self.store, 'fK', 'fN', 'gap', df=100, equivalence_margin=1.0,
                           margin_approved_by='fixture-scientist')
        self.assertEqual(self.compile('approximately_equal')['qualification_code'], 'approximately_equal')

    def test_context_and_point_mismatch_are_rejected(self):
        for field, value in [('point_estimate', 4.0), ('dataset_sha256', 'other-dataset'), ('unit', 'percent')]:
            original = copy.deepcopy(self.store.calculated['gap'])
            self.store.calculated['gap'][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.registry.bind(self.store, 'fK', 'fN', 'gap', df=100)
            self.store.calculated['gap'] = original
