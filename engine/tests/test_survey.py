import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from acceptance import acceptance  # noqa: E402
from ireme import survey as sv  # noqa: E402
from ireme import survey_reference as ref  # noqa: E402
from ireme import validation as val  # noqa: E402


def tiny():
    # 5 persons, hand-computable: poor are rows 0 and 2 at line 100
    cons = np.array([50, 200, 80, 300, 500.0])
    w = np.array([1, 2, 3, 4, 10.0])
    d = sv.Design(w, np.array(["A"] * 5), np.array([1, 1, 2, 2, 3]), unit="person")
    return d, cons


def two_by_two():
    # y = [1,3 | 5,9], w=1, one obs per PSU: hand-derived Taylor SE = sqrt(1.25)
    return (sv.Design(np.ones(4), np.array(["S1", "S1", "S2", "S2"]), np.array([1, 2, 1, 2])),
            np.array([1, 3, 5, 9.0]))


def simulated(seed=7, n_strata=6, psus=5, per=12):
    rng = np.random.default_rng(seed)
    st, ps, w, y, x = [], [], [], [], []
    for h in range(n_strata):
        for j in range(psus):
            eff = rng.normal(0, 0.8)
            for _ in range(per):
                st.append(f"S{h}"); ps.append(j)
                w.append(rng.uniform(50, 300))
                x.append(rng.integers(1, 8))
                y.append(float(rng.random() < 1 / (1 + np.exp(-(-1 + eff + 0.3 * h)))))
    return np.array(w), np.array(y), np.array(x, float), np.array(st), np.array(ps)


class SurveyTests(unittest.TestCase):
    @acceptance("SCI-01")
    def test_weighted_headcount_hand_computed(self):
        d, c = tiny()
        e = sv.fgt_poverty(d, c, 100.0, alpha=0)
        self.assertAlmostEqual(e.point, 4 / 20, places=12)  # (1+3)/20

    @acceptance("SCI-13")
    def test_fgt1_fgt2_hand_computed(self):
        d, c = tiny()
        self.assertAlmostEqual(sv.fgt_poverty(d, c, 100.0, alpha=1).point, (0.5 * 1 + 0.2 * 3) / 20, places=12)
        self.assertAlmostEqual(sv.fgt_poverty(d, c, 100.0, alpha=2).point, (0.25 * 1 + 0.04 * 3) / 20, places=12)

    @acceptance("SCI-02")
    def test_household_rows_cannot_answer_person_claim(self):
        d = sv.Design(np.ones(484), np.array(["A"] * 484), np.arange(484) % 40, unit="household")
        with self.assertRaises(sv.UniverseMismatch):
            sv.proportion_estimate(d, np.zeros(484), expected_unit="person")
        sv.proportion_estimate(d, np.zeros(484), expected_unit="household")  # matching universe is fine

    @acceptance("SCI-03")
    def test_bad_weights_rejected_and_zero_weights_counted(self):
        s, p = np.array(["A"] * 4), np.array([1, 1, 2, 2])
        for bad in ([1, 2, -1, 1], [1, np.nan, 1, 1], [1, np.inf, 1, 1], [0, 0, 0, 0]):
            with self.assertRaises(sv.InvalidWeights):
                sv.Design(np.array(bad, float), s, p)
        with_zero = sv.Design(np.array([1, 2, 0, 1.0]), s, p)
        self.assertEqual(with_zero.n_zero_weights, 1)
        base = sv.ratio_estimate(sv.Design(np.array([1, 2, 1.0]), s[:3], p[:3]), [1, 0, 1]).point
        self.assertAlmostEqual(sv.ratio_estimate(with_zero, [1, 0, 7, 1]).point, base, places=12)

    @acceptance("SCI-04")
    def test_taylor_variance_hand_derived(self):
        d, y = two_by_two()
        e = sv.ratio_estimate(d, y)
        self.assertAlmostEqual(e.point, 4.5, places=12)
        self.assertAlmostEqual(e.se, np.sqrt(1.25), places=12)
        self.assertEqual(e.df, 2)

    @acceptance("SCI-04")
    def test_taylor_vs_jackknife_on_simulated_design(self):
        w, y, x, st, ps = simulated()
        d = sv.Design(w, st, ps)
        dom = x > 2
        t = sv.ratio_estimate(d, y, x, domain=dom)
        j_pt, j_se = ref.jackknife_ratio(w, y, x, st, ps, domain=dom)
        self.assertAlmostEqual(t.point, j_pt, places=12)
        self.assertLess(abs(t.se - j_se) / j_se, 0.02)  # linearisation vs replication agree to 2%

    @acceptance("SCI-04")
    def test_fpc_reduces_variance(self):
        w, y, x, st, ps = simulated()
        a = sv.ratio_estimate(sv.Design(w, st, ps), y).se
        b = sv.ratio_estimate(sv.Design(w, st, ps, fpc_psu={f"S{h}": 10 for h in range(6)}), y).se
        self.assertAlmostEqual(b / a, np.sqrt(1 - 5 / 10), places=10)

    @acceptance("SCI-05")
    def test_singleton_strata_explicit_policy(self):
        s = np.array(["A", "A", "B", "B", "C"])
        p = np.array([1, 2, 1, 2, 1])
        w, y = np.ones(5), np.array([1, 2, 3, 4, 10.0])
        with self.assertRaises(sv.SingletonStratumError):
            sv.Design(w, s, p)
        adj = sv.ratio_estimate(sv.Design(w, s, p, singleton="adjust"), y)
        cert = sv.ratio_estimate(sv.Design(w, s, p, singleton="certainty"), y)
        self.assertGreater(adj.se, cert.se)  # adjust adds the lone PSU's deviation; certainty drops it
        self.assertEqual(adj.diagnostics["singleton_strata"], 1)

    @acceptance("SCI-06")
    def test_district_vs_national_covariance(self):
        w, y, x, st, ps = simulated()
        d = sv.Design(w, st, ps)
        dist = (st == "S1") | (st == "S2")
        nat = np.ones(len(w), bool)
        joint = sv.difference_estimate(d, y, None, dist, nat)
        va = sv.ratio_estimate(d, y, domain=dist).se ** 2
        vb = sv.ratio_estimate(d, y, domain=nat).se ** 2
        naive = np.sqrt(va + vb)

        def theta(weights):
            return (np.sum(weights * y * dist) / np.sum(weights * dist)) - (np.sum(weights * y) / np.sum(weights))
        _, jk_se = ref.jackknife(theta, w, st, ps)
        self.assertLess(joint.se, naive)                     # positive covariance must be subtracted
        self.assertLess(abs(joint.se - jk_se) / jk_se, 0.02)  # and matches replication

    @acceptance("SCI-07")
    def test_ci_uses_t_with_design_df_and_logit_stays_in_bounds(self):
        d, y = two_by_two()
        e = sv.ratio_estimate(d, y)
        self.assertAlmostEqual((e.ci_high - e.ci_low) / 2, 4.302652729911275 * e.se, places=9)  # t(.975, 2)
        w, ind = np.ones(40), np.array([1.0] + [0.0] * 39)
        dd = sv.Design(w, np.repeat(["A", "B"], 20), np.tile(np.arange(10), 4))
        t = sv.proportion_estimate(dd, ind, ci="t")
        lg = sv.proportion_estimate(dd, ind, ci="logit")
        self.assertLess(t.ci_low, 0.0)
        self.assertTrue(0.0 < lg.ci_low < lg.point < lg.ci_high < 1.0)

    @acceptance("SCI-08")
    def test_gate_rejects_hard_coded_constant_and_shared_code_path(self):
        r1 = val.Reference(0.274, 0.0, "python-jackknife", "hard_coded_constant")
        self.assertEqual(val.cross_validate(0.274, 0.01, "taylor", r1).status, "blocked")
        r2 = val.Reference(0.274, 0.01, "taylor", "computed")
        v = val.cross_validate(0.274, 0.01, "taylor", r2)
        self.assertEqual(v.status, "blocked")
        self.assertIn("not independent", v.reasons[0])

    @acceptance("SCI-10")
    def test_reference_mismatch_blocks(self):
        w, y, x, st, ps = simulated()
        t = sv.ratio_estimate(sv.Design(w, st, ps), y)
        j_pt, j_se = ref.jackknife_ratio(w, y, None, st, ps)
        # point must agree to fixture tolerance; SE differs between Taylor and JKn, so the gate (correctly) flags it
        v = val.cross_validate(t.point, t.se, "taylor", val.Reference(j_pt, j_se, "python-jackknife", "computed"))
        self.assertEqual(v.status, "mismatch")
        self.assertTrue(any("standard error" in r for r in v.reasons))
        self.assertFalse(any("point estimate" in r for r in v.reasons))
        bad = val.cross_validate(t.point, t.se, "taylor", val.Reference(j_pt + 0.01, j_se, "python-jackknife", "computed"))
        self.assertTrue(any("point estimate" in r for r in bad.reasons))

    @acceptance("SCI-10")
    def test_production_tolerances_unapproved_blocks(self):
        v = val.cross_validate(0.1, 0.01, "taylor", val.Reference(0.1, 0.01, "r-survey", "computed"), tier="production")
        self.assertEqual(v.status, "blocked")

    @acceptance("SCI-12")
    def test_domain_sample_sufficiency(self):
        w, y, x, st, ps = simulated()
        d = sv.Design(w, st, ps)
        small = np.zeros(len(w), bool); small[:6] = True
        g = sv.reliability_grade(sv.ratio_estimate(d, y, domain=small))
        self.assertEqual(g["grade"], "unreliable")
        self.assertFalse(g["publishable"])
        self.assertTrue(sv.reliability_grade(sv.ratio_estimate(d, y))["publishable"])

    @acceptance("SCI-15")
    def test_bootstrap_reproducible_with_fixed_seed(self):
        from ireme.resample import bootstrap_psu_se
        w, y, x, st, ps = simulated()
        a = bootstrap_psu_se(w, y, st, ps, reps=200, seed=20240117)
        b = bootstrap_psu_se(w, y, st, ps, reps=200, seed=20240117)
        c = bootstrap_psu_se(w, y, st, ps, reps=200, seed=1)
        self.assertEqual(a, b)
        self.assertNotEqual(a, c)


if __name__ == "__main__":
    unittest.main()
