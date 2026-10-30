import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from tools.investigation import sources, verification
from acceptance import acceptance

CACHE = ROOT / 'investigations/source-cache'
META = CACHE / 'eicv7-poverty.json'


class OfficialOriginIntegration(unittest.TestCase):
    @unittest.skipUnless(META.exists(), 'real NISR poverty profile unavailable')
    @acceptance('EVD-01', evidence='real')
    def test_modelled_reference_is_never_counted_as_independent_match(self):
        record = json.loads(META.read_text(encoding='utf-8'))
        pdf = CACHE / Path(record['local_cache']).name
        if not pdf.exists():
            self.skipTest('real NISR PDF unavailable')
        record['local_cache'] = str(pdf)
        records = {'sources': [record]}
        published = sources.published_modelled_comparison(records)
        self.assertIn('Kamonyi', published)
        claim = verification.modelled_claim('Kamonyi', records, [{'id': 'modelled_change'}], [])
        self.assertIsNotNone(claim)
        self.assertIsNone(claim['internal_value'])
        self.assertIsNone(claim['difference'])
        self.assertEqual(claim['published_value'], published['Kamonyi']['earlier_modelled'])
        summary = verification.summarize([claim], {})
        self.assertEqual(summary['counts'][verification.STATUS_VERIFIED], 0)
        self.assertFalse(claim['independent_comparison'])
