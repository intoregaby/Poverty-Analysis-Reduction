import json
import sys
import unittest
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ireme import data_eicv7, r_reference, survey

ROOT = Path(__file__).resolve().parents[2]


class RealJointContrasts(unittest.TestCase):
    @unittest.skipUnless(data_eicv7.available() and r_reference.rscript_path(), 'Real EICV7 archive and R required')
    def test_python_and_r_joint_contrasts_all_districts(self):
        reference = r_reference.calculate(data_eicv7.zip_path())
        frame, sha = data_eicv7.load_eicv7()
        design, y = data_eicv7.person_design(frame), data_eicv7.poor_indicator(frame)
        national = survey.ratio_estimate(design, y)
        rows = []
        for row in reference['contrasts']:
            mask = (frame.district == row['geography']).to_numpy()
            own = survey.difference_estimate(design, y, None, mask, np.ones(len(y), bool))
            district = survey.ratio_estimate(design, y, domain=mask)
            independent_se = float(np.hypot(district.se, national.se))
            self.assertAlmostEqual(own.point, row['point'], delta=1e-12)
            self.assertAlmostEqual(own.se, row['se'], delta=1e-10)
            rows.append({'geography': row['geography'], 'python_point': own.point, 'r_point': row['point'],
                         'python_joint_se': own.se, 'r_joint_se': row['se'], 'wrong_independent_se': independent_se})
        self.assertEqual(len(rows), 30)
        self.assertTrue(all(abs(r['python_joint_se'] - r['wrong_independent_se']) > 1e-8 for r in rows))
        evidence = {'status': 'DIAGNOSTIC_ONLY_PENDING_INDEPENDENT_REVIEW', 'dataset_sha256': sha,
                    'r_code_sha256': reference['reference_code_sha256'],
                    'reference_code_utf8': reference['reference_code_utf8'], 'contrasts': rows}
        (ROOT / 'docs/implementation/evidence/python_r_joint_contrasts.json').write_text(json.dumps(evidence, indent=2))
