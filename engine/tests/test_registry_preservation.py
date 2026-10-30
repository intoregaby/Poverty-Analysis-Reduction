import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from scripts import bootstrap_registry


class RegistryPreservation(unittest.TestCase):
    def test_regeneration_preserves_engineering_history_and_evidence_mappings(self):
        registry = json.loads((ROOT / 'docs/implementation/registry.json').read_text())
        registry['scenarios'][0]['acceptance_tests'] = ['fixture-explicit-scope']
        registry['requirements'][0]['integration_tests'] = ['fixture-integration']
        registry['requirements'][0]['status'] = 'partial'
        registry['audit_defects'][0]['integration_tests'] = ['fixture-defect']
        registry['engineering_cycles'] = [{'scope': 'preserved history'}]
        with tempfile.TemporaryDirectory() as work:
            target = Path(work) / 'registry.json'
            target.write_text(json.dumps(registry))
            with patch.object(bootstrap_registry, 'OUT', target), contextlib.redirect_stdout(io.StringIO()):
                bootstrap_registry.main()
                once = json.loads(target.read_text())
                bootstrap_registry.main()
                twice = json.loads(target.read_text())
            self.assertEqual(once, twice)
            self.assertEqual(once['engineering_cycles'], registry['engineering_cycles'])
            self.assertEqual(once['scenarios'][0]['acceptance_tests'], ['fixture-explicit-scope'])
            self.assertEqual(once['requirements'][0]['integration_tests'], ['fixture-integration'])
            self.assertEqual(once['audit_defects'][0]['integration_tests'], ['fixture-defect'])
            self.assertEqual(len(once['scenarios']), 95)
            self.assertNotIn('verdict', once['scenarios'][0])
