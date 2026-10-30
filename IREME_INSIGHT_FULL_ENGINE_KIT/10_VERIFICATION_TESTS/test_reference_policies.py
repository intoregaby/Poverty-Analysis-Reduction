"""Run: python -m unittest discover -s 10_VERIFICATION_TESTS -p 'test_*.py' -v
These are policy-unit smoke tests, not tests of the user's actual engine.
"""
import unittest
from reference_policy_checks import external_match_allowed, claim_shape_allowed, publication_allowed

class ReferencePolicyTest(unittest.TestCase):
    def setUp(self):
        self.calc={"origin_type":"computed_microdata","origin_artifact_hash":"calculated-hash","point_estimate":39.7}
        self.official={"origin_type":"independent_official_document","origin_artifact_hash":"published-hash","point_estimate":39.7,"extraction_status":"table_verified"}
        self.cmp={k:True for k in ("concept_match","population_match","unit_match","period_match","geography_match","method_match","origins_independent")}
        self.cmp["registered_tolerance"]=0.05
    def test_valid_independent_comparison(self):
        self.assertTrue(external_match_allowed(self.calc,self.official,self.cmp))
    def test_fake_self_comparison_is_rejected(self):
        self.official["origin_artifact_hash"]=self.calc["origin_artifact_hash"]
        self.assertFalse(external_match_allowed(self.calc,self.official,self.cmp))
    def test_mismatched_meaning_is_rejected(self):
        self.cmp["concept_match"]=False
        self.assertFalse(external_match_allowed(self.calc,self.official,self.cmp))
    def test_unverified_extraction_is_rejected(self):
        self.official["extraction_status"]="needs_review"
        self.assertFalse(external_match_allowed(self.calc,self.official,self.cmp))
    def test_wrong_number_is_rejected(self):
        self.official["point_estimate"]=30.0
        self.assertFalse(external_match_allowed(self.calc,self.official,self.cmp))
    def test_unbound_numeric_prose_is_rejected(self):
        self.assertFalse(claim_shape_allowed({"claim_id":"1","fact_ids":["f"],"percentage":"99.9"}))
    def test_typed_claim_shape_allowed(self):
        self.assertTrue(claim_shape_allowed({"claim_id":"1","fact_ids":["f"],"relation":"above"}))
    def test_release_without_reviewer_is_rejected(self):
        checks={k:True for k in ("scientific_pass","origin_pass","claims_pass","privacy_pass","citation_pass","cross_format_pass","policy_pass")}
        self.assertFalse(publication_allowed(checks,set(),"author"))
    def test_author_cannot_independently_approve(self):
        checks={k:True for k in ("scientific_pass","origin_pass","claims_pass","privacy_pass","citation_pass","cross_format_pass","policy_pass")}
        self.assertFalse(publication_allowed(checks,{"author"},"author"))
    def test_failed_privacy_blocks_publication(self):
        checks={k:True for k in ("scientific_pass","origin_pass","claims_pass","privacy_pass","citation_pass","cross_format_pass","policy_pass")}
        checks["privacy_pass"]=False
        self.assertFalse(publication_allowed(checks,{"independent"},"author"))

if __name__ == '__main__':
    unittest.main()
