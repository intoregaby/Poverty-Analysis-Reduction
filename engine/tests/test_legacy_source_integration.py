"""Exercise the application's actual source worker during injected HTTP outages."""
import hashlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError, HTTPError

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from tools.investigation import sources
from acceptance import acceptance

PDF = ROOT / 'investigations/source-cache/eicv7-main-6105321b6eda.pdf'


class CacheIntegration(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.cache = Path(self.temp.name) / 'source-cache'
        self.cache.mkdir()
        self.source = next(s for s in sources.OFFICIAL_SOURCES if s['id'] == 'eicv7-main')

    def save(self, content):
        target = self.cache / 'main.pdf'
        target.write_bytes(content)
        self.record = {**self.source, 'status': 'Completed', 'version': hashlib.sha256(content).hexdigest(),
                       'local_cache': str(target), 'retrieved_at': '2026-10-25T00:00:00+00:00'}
        self.manifest()
        return target

    def manifest(self):
        (self.cache / 'eicv7-main.json').write_text(json.dumps(self.record), encoding='utf-8')

    def outage(self):
        with patch.object(sources, 'urlopen', side_effect=URLError('injected outage')):
            return sources.verify_source(self.source, self.cache)

    @unittest.skipUnless(PDF.exists(), 'real NISR PDF unavailable')
    @acceptance('EVD-02', evidence='real')
    def test_real_cached_pdf_without_any_prior_run(self):
        content = PDF.read_bytes()
        target = self.save(content)
        result = self.outage()
        self.assertEqual(result['status'], 'Failed')
        self.assertIn('injected outage', result['error'])
        self.assertTrue(result['cache_used'])
        selected = sources.evidence_source({'sources': [result]}, self.source['id'])
        self.assertEqual(selected['local_cache'], str(target))
        self.assertEqual(selected['version'], hashlib.sha256(content).hexdigest())
        self.assertEqual(selected['retrieved_at'], self.record['retrieved_at'])
        self.assertIn('validated_at', selected)

    def test_corruption_and_invalid_metadata_never_supply_evidence(self):
        for reason in ('corrupt', 'outside', 'superseded', 'expired', 'wrong_url', 'wrong_id', 'revoked'):
            with self.subTest(reason=reason):
                target = self.save(b'%PDF fixture bytes')
                if reason == 'corrupt':
                    target.write_bytes(b'%PDF changed bytes')
                elif reason == 'outside':
                    outside = Path(self.temp.name) / 'outside.pdf'
                    outside.write_bytes(target.read_bytes())
                    self.record['local_cache'] = str(outside)
                elif reason == 'superseded':
                    self.record['superseded_by'] = 'new-release'
                elif reason == 'expired':
                    self.record['expires_at'] = '2000-01-01T00:00:00Z'
                elif reason == 'wrong_url':
                    self.record['url'] = 'https://unrelated.example/file.pdf'
                elif reason == 'wrong_id':
                    self.record['id'] = 'different-source'
                else:
                    self.record['revoked'] = True
                self.manifest()
                result = self.outage()
                self.assertIsNone(sources.evidence_source({'sources': [result]}, self.source['id']))

    def test_missing_or_corrupt_manifest_preserves_failure(self):
        for content in (None, '{broken json'):
            if content:
                (self.cache / 'eicv7-main.json').write_text(content)
            result = self.outage()
            self.assertEqual(result['status'], 'Failed')
            self.assertNotIn('cached_evidence', result)

    def test_304_revalidates_scope_and_preserves_original_retrieval_date(self):
        self.save(b'%PDF fixture bytes')
        def check():
            error = HTTPError(self.source['url'], 304, '', {}, io.BytesIO())
            try:
                with patch.object(sources, 'urlopen', side_effect=error):
                    return sources.verify_source(self.source, self.cache)
            finally:
                error.close()
        result = check()
        self.assertEqual(result['status'], 'Completed')
        self.assertEqual(result['retrieved_at'], self.record['retrieved_at'])
        self.assertIn('validated_at', result)
        self.record['revoked'] = True
        self.manifest()
        result = check()
        self.assertEqual(result['status'], 'Failed')
        self.assertNotIn('cached_evidence', result)
