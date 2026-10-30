"""Real-data evidence: licensed EICV7 microdata vs the real NISR EICV7 Main Indicators Report (Table A9.23).

Registered BEFORE running (ADR-005): the standard-error corroboration tolerance is 0.10 percentage points
(published SEs carry two decimals plus NISR rounding of weights). Point estimates are compared with the
rounding tolerance registered from the published precision (0.005 pp). Where they disagree beyond it, the
pipeline must report `external_mismatch` -- these tests assert that it does, and they write every measured
difference to docs/implementation/evidence so the discrepancy list is auditable, not hidden.
"""
import json
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from acceptance import acceptance  # noqa: E402
from ireme import data_eicv7, extract, provenance, survey as sv, survey_reference as ref  # noqa: E402
from ireme.evidence_sets import ToleranceRegistry  # noqa: E402
from ireme.semantics import Equivalence, EquivalenceRegistry  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "investigations" / "source-cache" / "eicv7-main-6105321b6eda.pdf"
CAPTION = "Table A9.23: Headcount Poverty rate (%) by area of residence, province and district"
OUT = ROOT / "docs" / "implementation" / "evidence" / "eicv7_vs_nisr_table_a9_23.json"
SE_TOL_PP = 0.10
READY = data_eicv7.available() and PDF.exists()


@unittest.skipUnless(READY, "licensed EICV7 microdata and cached NISR report are required")
class RealEicv7(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.frame, cls.archive_sha = data_eicv7.load_eicv7()
        cls.design = data_eicv7.person_design(cls.frame)
        cls.y = data_eicv7.poor_indicator(cls.frame)
        cls.official = extract.extract_poverty_table(PDF.read_bytes(), "eicv7-main", CAPTION, "2025-07-10")["facts"]
        cls.districts = sorted(set(cls.frame.district))

    def domain(self, geo):
        return None if geo == "Rwanda" else (self.frame.district == geo).to_numpy()

    def calc_fact(self, geo):
        e = sv.ratio_estimate(self.design, self.y, domain=self.domain(geo))
        return e, {"fact_id": f"calc:{geo}", "indicator_id": "pov_rate_person", "definition_version": "eicv7-pov_jan-v1",
                   "geography_id": geo, "period": "2023/24", "dataset_sha256": self.archive_sha,
                   "estimator_version": "ireme.survey/taylor-1", "unit": "percent", "point_estimate": 100 * e.point,
                   "standard_error": 100 * e.se, "confidence_level": 0.95, "ci_lower": 100 * e.ci_low,
                   "ci_upper": 100 * e.ci_high, "sample_unit": "person", "valid_n": e.n_obs, "psu_count": e.n_psu_domain,
                   "reliability": "reliable", "scientific_verdict_id": f"v:{geo}", "origin_type": "computed_microdata",
                   "origin_artifact_hash": f"calc-{geo}-{self.archive_sha[:12]}", "sensitivity": "restricted_aggregate"}

    @acceptance("SCI-11", evidence="real")
    def test_published_standard_errors_corroborated_for_all_domains(self):
        tol = ToleranceRegistry()
        tol.register("pov_rate_person", 2, "adr-005 (pending statistician approval)")
        eq = EquivalenceRegistry()
        eq.add(Equivalence("pov_rate_person", "eicv7-pov_jan-v1", "poverty_headcount_official", "person", "percent",
                           "FGT0, EICV7 pov_jan vs national poverty line, person weights pop_wt",
                           "adr-005-reviewer-pending", "Same estimand as NISR Table A9.23"))
        store = provenance.FactStore()
        report, worst_se = [], 0.0
        for off in self.official:
            geo = off["geography_id"]
            if geo != "Rwanda" and geo not in self.districts:
                continue                                           # area/province rows not in this domain set
            e, cf = self.calc_fact(geo)
            store.add_calculated(cf)
            store.add_official(off)
            cmp_ = provenance.compare(store, eq, cf["fact_id"], off["official_fact_id"],
                                      tol.tolerance_for("pov_rate_person"), "ireme-automated")
            se_diff = abs(100 * e.se - off["standard_error"])
            worst_se = max(worst_se, se_diff)
            report.append({"geography": geo, "nisr_estimate": off["point_estimate"], "ireme_estimate": round(100 * e.point, 3),
                           "point_diff_pp": round(100 * e.point - off["point_estimate"], 3), "nisr_se": off["standard_error"],
                           "ireme_se": round(100 * e.se, 3), "se_diff_pp": round(100 * e.se - off["standard_error"], 3),
                           "comparison_status": cmp_["status"], "nisr_location": off["table_location"]})
            self.assertLessEqual(se_diff, SE_TOL_PP, geo)
        self.assertEqual(len(report), 31)
        matched = sum(r["comparison_status"] == "externally_matched" for r in report)
        mism = [r["geography"] for r in report if r["comparison_status"] == "external_mismatch"]
        self.assertEqual(matched + len(mism), 31)                  # nothing silently dropped or mislabeled
        OUT.write_text(json.dumps({"archive_sha256": self.archive_sha, "se_tolerance_pp": SE_TOL_PP,
                                   "point_tolerance_pp": tol.tolerance_for("pov_rate_person"),
                                   "externally_matched": matched, "external_mismatch": mism,
                                   "max_se_diff_pp": round(worst_se, 4), "rows": report}, indent=1, sort_keys=True) + "\n",
                       encoding="utf-8")
        self.assertGreaterEqual(matched, 20)                       # measured: 22 of 31 within published rounding

    @acceptance("SCI-20", evidence="real")
    def test_entire_30_district_batch_runs_and_cross_validates(self):
        self.assertEqual(len(self.districts), 30)
        rows = []
        for dname in self.districts:
            m = self.domain(dname)
            e = sv.ratio_estimate(self.design, self.y, domain=m)
            jk_pt, jk_se = ref.jackknife_ratio(self.design.weights, self.y, None, self.design.strata,
                                               self.design._psu_key, domain=m)
            g = sv.reliability_grade(e)
            rows.append((dname, e, jk_pt, jk_se, g))
            self.assertAlmostEqual(e.point, jk_pt, places=12, msg=dname)                  # point estimates identical
            self.assertLess(abs(e.se - jk_se) / jk_se, 0.03, dname)                        # SE: Taylor vs JKn within 3%
            self.assertGreater(e.n_psu_domain, 5, dname)
        self.assertEqual(len({r[0] for r in rows}), 30)
        self.assertTrue(all(r[4]["grade"] in ("high", "moderate", "low") for r in rows))

    @acceptance("SCI-04", evidence="real")
    def test_real_design_has_no_singleton_strata_and_expected_structure(self):
        self.assertEqual(self.design.singleton_strata, [])
        self.assertEqual(self.design.df, 1614)                 # 1674 PSUs - 60 strata, as in the NISR design
        self.assertEqual(self.design.n, 15054)


class CoverageSimulation(unittest.TestCase):
    @acceptance("SCI-19")
    def test_ci_coverage_close_to_nominal_under_repeated_sampling(self):
        rng = np.random.default_rng(20240117)
        S, PSU_POP, M = 8, 60, 40                               # strata, PSUs per stratum in population, units per PSU
        pop = {}
        for h in range(S):
            for j in range(PSU_POP):
                p = 1 / (1 + np.exp(-(-0.8 + 0.25 * h + rng.normal(0, 0.6))))
                pop[(h, j)] = (rng.random(M) < p).astype(float)
        truth = np.mean([v.mean() for v in pop.values()])      # equal PSU sizes -> mean of PSU means
        hits, reps, n_h = 0, 600, 10
        for _ in range(reps):
            st, ps, y = [], [], []
            for h in range(S):
                for j in rng.choice(PSU_POP, n_h, replace=False):
                    sub = rng.choice(M, 12, replace=False)
                    for v in pop[(h, j)][sub]:
                        st.append(h); ps.append(j); y.append(v)
            d = sv.Design(np.ones(len(y)), np.array(st), np.array(ps))
            e = sv.ratio_estimate(d, np.array(y), ci="t")
            hits += e.ci_low <= truth <= e.ci_high
        cov = hits / reps
        self.assertTrue(0.925 <= cov <= 0.975, f"coverage {cov}")


if __name__ == "__main__":
    unittest.main()
