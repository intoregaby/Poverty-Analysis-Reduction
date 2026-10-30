"""Real raw bytes with synthetic permission fixtures: no actual licence approval is asserted."""
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ireme import data_eicv7
from ireme.catalog import Catalog


class GovernedData(unittest.TestCase):
    def test_missing_permission_denies_before_opening_nonexistent_archive(self):
        with tempfile.TemporaryDirectory() as temp:
            catalog = Catalog(Path(temp) / 'catalog.db', 'test', 'test-steward')
            try:
                with self.assertRaises(KeyError):
                    data_eicv7.load_governed(catalog, 'dataset', '1', 'absent', 'research', Path(temp) / 'absent.zip')
            finally:
                catalog.close()

    @unittest.skipUnless(data_eicv7.available(), 'EICV7 raw archive unavailable')
    def test_real_archive_hash_binding_with_fixture_permission_and_revocation(self):
        archive = data_eicv7.zip_path()
        sha = hashlib.sha256(archive.read_bytes()).hexdigest()
        with tempfile.TemporaryDirectory() as temp:
            catalog = Catalog(Path(temp) / 'catalog.db', 'test', 'fixture-steward')
            try:
                catalog.dataset('eicv7', '1', sha, 'confidential_microdata', 'b'*64)
                catalog.grant('fixture-only', 'eicv7', '1', ['research'], '2000-01-01T00:00:00Z',
                              '2099-01-01T00:00:00Z', 'c'*64)
                frame, found = data_eicv7.load_governed(catalog, 'eicv7', '1', 'fixture-only', 'research')
                self.assertEqual(found, sha)
                self.assertEqual(len(frame), 15054)
                self.assertEqual(frame.attrs['governance']['sensitivity'], 'confidential_microdata')
                unrelated = Path(temp) / 'wrong.zip'
                unrelated.write_bytes(b'not the approved survey')
                with self.assertRaises(ValueError):
                    data_eicv7.load_governed(catalog, 'eicv7', '1', 'fixture-only', 'research', unrelated)
                catalog.revoke('fixture-only', 'End synthetic test grant')
                with self.assertRaises(PermissionError):
                    data_eicv7.load_governed(catalog, 'eicv7', '1', 'fixture-only', 'research')
            finally:
                catalog.close()
