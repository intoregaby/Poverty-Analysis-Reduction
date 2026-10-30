import io
import re
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from acceptance import acceptance  # noqa: E402
from ireme import contracts, lab, policy, release_gate  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "investigations" / "source-cache" / "eicv7-main-6105321b6eda.pdf"


def groups(seed=3, n=4000):
    rng = np.random.default_rng(seed)
    xa, xb = rng.normal(12, 3, n), rng.normal(10, 3, n)
    ya = 1.0 + 0.50 * xa + rng.normal(0, 1, n)
    yb = 0.5 + 0.35 * xb + rng.normal(0, 1, n)
    return (np.c_[np.ones(n), xa], ya, np.ones(n), np.c_[np.ones(n), xb], yb, np.ones(n))


class Lab(unittest.TestCase):
    @acceptance("SCI-14")
    def test_decomposition_identity_and_reference_sensitivity(self):
        r = lab.oaxaca(*groups())
        self.assertEqual(set(r["by_reference"]), {"group_A", "group_B", "average", "pooled"})
        for v in r["by_reference"].values():
            self.assertAlmostEqual(v["explained"] + v["unexplained"], r["gap"], places=9)
        # explained share genuinely depends on the reference coefficients -> flagged, never a single "the" answer
        self.assertTrue(r["reference_sensitive"])
        self.assertGreater(r["explained_share_range"], 0.10)
        self.assertIn("not a causal", r["interpretation"])
        # when both groups share identical coefficients the ambiguity disappears
        rng = np.random.default_rng(1)
        xa, xb = rng.normal(12, 3, 3000), rng.normal(10, 3, 3000)
        ya, yb = 1 + 0.5 * xa + rng.normal(0, 1, 3000), 1 + 0.5 * xb + rng.normal(0, 1, 3000)
        same = lab.oaxaca(np.c_[np.ones(3000), xa], ya, np.ones(3000), np.c_[np.ones(3000), xb], yb, np.ones(3000))
        self.assertFalse(same["reference_sensitive"])

    @acceptance("SCI-16")
    def test_synthetic_methodology_break_blocks_naive_trend(self):
        reg = lab.WaveRegistry()
        reg.add(lab.Wave("EICV5", "2016/17", "old"))
        reg.add(lab.Wave("EICV7", "2023/24", "new"))
        with self.assertRaises(lab.IncompatibleWaves):
            reg.comparable_value("EICV5", 39.1, "new")
        with self.assertRaises(ValueError):
            reg.add_harmonised("EICV5", "new", 39.8, "")

    @unittest.skipUnless(PDF.exists(), "real NISR EICV7 report required")
    @acceptance("SCI-16", evidence="real")
    def test_real_nisr_statement_of_new_series_and_modelled_2016_17_rate(self):
        from pypdf import PdfReader
        pages = PdfReader(io.BytesIO(PDF.read_bytes())).pages[:16]
        text = " ".join((p.extract_text() or "") for p in pages)
        text = re.sub(r"\s+", " ", text)
        self.assertRegex(text, r"mark the beginning of a new series")
        m = re.search(r"2016/17.{0,60}would have been (\d+\.\d)%", text)
        self.assertIsNotNone(m)
        value = float(m.group(1))
        reg = lab.WaveRegistry()
        reg.add(lab.Wave("EICV5", "2016/17", "pre-2023 methodology"))
        reg.add(lab.Wave("EICV7", "2023/24", "new series"))
        with self.assertRaises(lab.IncompatibleWaves):
            reg.comparable_value("EICV5", 39.1, "new series")            # published EICV5 figure cannot be trended directly
        reg.add_harmonised("EICV5", "new series", value, "NISR EICV7 Main Indicators Report, foreword (modelled)")
        got = reg.comparable_value("EICV5", 39.1, "new series")
        self.assertEqual(got["value"], 39.8)
        self.assertIn("harmonised", got["basis"])

    @acceptance("SCI-17")
    def test_unsupported_small_domains_refused_and_ranks_carry_uncertainty(self):
        self.assertFalse(lab.domain_supported(n_psu_in_domain=3, n_obs=60, planned_domain=False)["supported"])
        self.assertTrue(lab.domain_supported(54, 484, True)["supported"])
        r = lab.rank_with_uncertainty(["A", "B", "C"], [40.0, 39.0, 10.0], [3.0, 3.0, 1.0])
        self.assertLess(r["ranks"]["A"]["rank_low"], r["ranks"]["A"]["rank_high"] + 1)
        self.assertGreater(r["ranks"]["A"]["rank_high"], 1)                # A cannot be asserted to be strictly first
        self.assertEqual((r["ranks"]["C"]["rank_low"], r["ranks"]["C"]["rank_high"]), (3, 3))
        self.assertEqual(lab.rank_with_uncertainty(["A", "B"], [1, 2], [1, 1]), lab.rank_with_uncertainty(["A", "B"], [1, 2], [1, 1]))

    @acceptance("SCI-18")
    def test_prediction_requires_out_of_time_split_and_blocks_leakage(self):
        rng = np.random.default_rng(5)
        n = 600
        wave = np.repeat([2010, 2014, 2017], n // 3)
        X = rng.normal(size=(n, 3))
        y = 2 + X @ np.array([1.0, -0.5, 0.2]) + 0.1 * (wave - 2010) + rng.normal(0, 0.3, n)
        ok = lab.temporal_holdout(X, y, wave, [2010, 2014], [2017])
        self.assertTrue(ok["beats_baseline"])
        with self.assertRaises(lab.LeakageError):
            lab.temporal_holdout(X, y, wave, [2010, 2017], [2014, 2017])
        with self.assertRaises(lab.LeakageError):
            lab.temporal_holdout(X, y, wave, [2010, 2014], [2017], feature_waves=wave + 3)


class Policy(unittest.TestCase):
    def cost(self, kind="estimate", src=None):
        c = policy.CostModel()
        c.add("transport", 1000.0, kind, src)
        return c

    @acceptance("POL-01", "POL-03")
    def test_association_cannot_be_labelled_causal_or_a_trial_result(self):
        with self.assertRaises(policy.PolicyViolation):
            policy.describe_evidence("cross_sectional_association", "causal effect")
        with self.assertRaises(policy.PolicyViolation):
            policy.describe_evidence("matching_or_regression", "trial result")
        self.assertEqual(policy.describe_evidence("randomised_trial", "trial result")["causal_status"], "identified")
        opt = policy.build_option("o1", "Kamonyi", ["f1"], "cash plus", "cross_sectional_association", "association",
                                 self.cost(), ["rural households may be excluded"], "MINALOC", "mp-1")
        self.assertEqual((opt["causal_status"], opt["decision"]), ("association_only", "pilot_and_evaluate"))

    @acceptance("POL-02")
    def test_competing_hypotheses_cannot_be_silently_discarded(self):
        r = policy.HypothesisRegistry()
        r.add("h1", "low land productivity", "agent-1")
        r.add("h2", "weak market access", "agent-2")
        with self.assertRaises(policy.PolicyViolation):
            r.set_status("h2", "rejected", "agent-1")                  # no evidence
        with self.assertRaises(policy.PolicyViolation):
            r.delete("h2")
        r.set_status("h2", "weakened", "analyst", ["ev-9"])
        self.assertEqual({h["id"] for h in r.ranked()}, {"h1", "h2"})
        self.assertEqual(r.items["h2"]["history"][-1], ("weakened", "analyst", ["ev-9"]))

    @acceptance("POL-04")
    def test_invented_budget_cannot_be_labelled_actual(self):
        c = policy.CostModel()
        with self.assertRaises(policy.PolicyViolation):
            c.add("district budget", 5e6, "measured_budget", None)
        c.add("district budget", 5e6, "estimate", None)
        self.assertEqual(c.status(), "estimated")
        self.assertIn("ESTIMATE", c.trace()[0]["label"])
        v = policy.CostModel(); v.add("approved budget line", 5e6, "measured_budget", "budget-2026-doc")
        self.assertEqual(v.status(), "validated")

    @acceptance("POL-05")
    def test_analysis_cannot_initiate_transfers_or_ingest_beneficiary_fields(self):
        for a in ("initiate_payment", "approve_beneficiary", "allocate_benefit"):
            with self.assertRaises(policy.PolicyViolation):
                policy.research_action(a)
        self.assertEqual(policy.research_action("recommend_audit"), "recommend_audit")
        with self.assertRaises(policy.PolicyViolation):
            policy.assert_aggregate_only(["district", "take_up_rate", "mobile_money_id"])
        policy.assert_aggregate_only(["district", "take_up_rate"])

    @acceptance("POL-06")
    def test_post_hoc_outcome_cannot_be_declared_success(self):
        p = policy.Preregistry()
        with self.assertRaises(policy.PolicyViolation):
            p.declare_success("s1", "consumption", 100.0)               # never registered
        p.register("s1", "consumption", "DiD, district clusters", 10.0, "lead")
        self.assertTrue(p.declare_success("s1", "consumption", 20.0))
        with self.assertRaises(policy.PolicyViolation):
            p.declare_success("s1", "savings", 20.0)                    # outcome switched after the fact
        p.register("s2", "x", "plan", 50.0, "lead")
        with self.assertRaises(policy.PolicyViolation):
            p.declare_success("s2", "x", 40.0)                          # registered after data access
        with self.assertRaises(policy.PolicyViolation):
            p.register("s1", "other", "plan", 11.0, "lead")             # registrations are immutable

    @acceptance("POL-07")
    def test_equity_risk_is_mandatory_and_exclusion_is_surfaced(self):
        with self.assertRaises(policy.PolicyViolation):
            policy.build_option("o", "Kamonyi", ["f1"], "x", "randomised_trial", "trial result",
                                self.cost("measured_budget", "doc-1"), [], "MINALOC", "mp")
        opt = policy.build_option("o", "Kamonyi", ["f1"], "x", "randomised_trial", "trial result",
                                  self.cost("measured_budget", "doc-1"), ["benefit uptake needs smartphone"], "MINALOC", "mp",
                                  underserved_areas_excluded=["Rutobwe sector"])
        self.assertTrue(any("Rutobwe" in r for r in opt["equity_risks"]))
        self.assertEqual(opt["decision"], "pilot_and_evaluate")          # exclusion prevents scale recommendation
        ok = policy.build_option("o", "Kamonyi", ["f1"], "x", "randomised_trial", "trial result",
                                 self.cost("measured_budget", "doc-1"), ["benefit uptake needs smartphone"], "MINALOC", "mp")
        self.assertEqual(ok["decision"], "consider_scale")

    @acceptance("POL-08")
    def test_underpowered_programme_inference_abstains(self):
        r = policy.programme_inference_allowed(n_per_arm=30, sd=10.0, deff=2.0, expected_effect=1.0)
        self.assertFalse(r["allowed"])
        self.assertEqual(r["decision"], "investigate_more")
        self.assertIn("abstaining", r["message"])
        self.assertTrue(policy.programme_inference_allowed(5000, 10.0, 2.0, 1.0)["allowed"])
        opt = policy.build_option("o", "K", ["f1"], "x", "untested", "unclear", self.cost(), ["risk"], "o", "mp")
        self.assertEqual(opt["decision"], "investigate_more")

    @acceptance("POL-09")
    def test_draft_recommendation_cannot_be_shared_as_official(self):
        self.assertIn("DRAFT", policy.dissemination_label("approved", "analyst"))
        with self.assertRaises(policy.PolicyViolation):
            policy.dissemination_label("qa_failed", "public")
        self.assertEqual(policy.dissemination_label("published", "public"), "official")
        opt = policy.build_option("o", "K", ["f1"], "x", "untested", "unclear", self.cost(), ["risk"], "o", "mp")
        contracts.validate("intervention-option", opt)

    @acceptance("POL-03", "POL-07")
    def test_scale_requires_a_complete_monitoring_plan_with_sourced_baselines(self):
        def plan(**overrides):
            values = dict(plan_id="mp-1", metrics=("coverage",),
                          baselines={"coverage": {"value": 0.4, "source_id": "admin-report-2026", "period": "2026"}},
                          design="comparison_group", comparison="matched comparison sectors",
                          evaluation_date="2027-06-30",
                          success_criteria={"coverage": {"direction": "above", "threshold": 0.55}},
                          cost_denominator="beneficiary households")
            values.update(overrides)
            return policy.MonitoringPlan(**values)

        self.assertEqual(plan().validate()["causal_status"], "designed_comparison")
        self.assertEqual(plan(design="pre_post_observational").validate()["causal_status"], "not_established")
        self.assertIn("not a causal", plan(design="pre_post_observational").validate()["warning"])
        for broken in (plan(baselines={}), plan(success_criteria={}), plan(comparison=" "),
                       plan(evaluation_date="next year"), plan(design="vibes"), plan(metrics=())):
            with self.subTest(broken=broken), self.assertRaises(policy.PolicyViolation):
                broken.validate()

        scaled = policy.build_option("o", "K", ["f1"], "x", "randomised_trial", "trial result",
                                     self.cost("measured_budget", "budget-doc"), ["risk"], "owner", "mp-1")
        self.assertEqual(scaled["decision"], "consider_scale")
        with self.assertRaises(policy.PolicyViolation):
            policy.require_monitoring(scaled, None)
        with self.assertRaises(policy.PolicyViolation):
            policy.require_monitoring(scaled, plan(plan_id="other"))
        self.assertEqual(policy.require_monitoring(scaled, plan())["plan_id"], "mp-1")


if __name__ == "__main__":
    unittest.main()
