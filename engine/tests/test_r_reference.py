import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from acceptance import acceptance
from ireme import data_eicv7, r_reference, survey, validation

ROOT = Path(__file__).resolve().parents[2]
REAL_COMPARISON = ROOT / "docs" / "implementation" / "evidence" / "python_r_eicv7_comparison.json"


class RReference(unittest.TestCase):
    @acceptance('SCI-09', evidence='real')
    def test_r_raw_archive_path_calculates_national_and_district_se(self):
        if not r_reference.rscript_path():
            self.skipTest('Rscript is not installed; R scientific reference execution blocked')
        if not data_eicv7.available():
            self.skipTest('EICV7 raw archive unavailable')
        result = r_reference.calculate(data_eicv7.zip_path())
        frame, archive_sha = data_eicv7.load_eicv7()
        design = data_eicv7.person_design(frame)
        y = data_eicv7.poor_indicator(frame)
        self.assertEqual(result['dataset_sha256'], archive_sha)
        for row in result['estimates']:
            domain = None if row['geography'] == 'Rwanda' else (frame.district == row['geography']).to_numpy()
            primary = survey.ratio_estimate(design, y, domain=domain)
            self.assertAlmostEqual(primary.point, row['point'], delta=1e-12)
            self.assertAlmostEqual(primary.se, row['se'], delta=1e-10)
        # Execution alone does not satisfy separately owned scientific validation.
        self.assertEqual(result['certification'], 'PENDING_INDEPENDENT_OWNERSHIP_AND_SCIENTIFIC_REVIEW')
        self.skipTest('R execution completed; independent ownership and scientific signoff are still required')

    @acceptance('SCI-10', evidence='real')
    def test_real_r_vs_python_agreement_within_registered_tolerance(self):
        """The pre-computed R/Python comparison meets fixture_only tolerance; still DIAGNOSTIC until scientific approval."""
        if not REAL_COMPARISON.exists():
            self.skipTest('real comparison artefact not found')
        comp = json.loads(REAL_COMPARISON.read_text(encoding='utf-8'))
        self.assertEqual(comp['status'], 'DIAGNOSTIC_ONLY_PENDING_SCIENTIFIC_APPROVAL')
        # All domain differences are inside the registered fixture_only tolerance (1e-10 pp for point, 1e-8 for SE)
        tol_pt = 1.0e-10
        tol_se = 1.0e-8
        for row in comp['domains']:
            pd = abs(row['python_point'] - row['r_point']) * 100.0
            sd = abs(row['python_se'] - row['r_se']) * 100.0
            self.assertLessEqual(pd, tol_pt, f"{row['geography']} point diff {pd:.3e} > {tol_pt}")
            self.assertLessEqual(sd, tol_se, f"{row['geography']} SE diff {sd:.3e} > {tol_se}")
        # Execution alone does not satisfy separately owned scientific validation.
        self.skipTest('R/Python agreement verified; independent ownership and scientific signoff are still required')

    def test_missing_runtime_has_explicit_failure(self):
        if r_reference.rscript_path():
            self.skipTest('Runtime installed: missing-runtime condition does not apply')
        with self.assertRaises(r_reference.ReferenceUnavailable):
            r_reference.calculate(Path('not-read-when-runtime-missing.zip'))
