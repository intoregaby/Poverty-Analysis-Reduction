import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ireme.validation import Reference, cross_validate
from ireme import contracts


class ValidationSafety(unittest.TestCase):
    def test_nonfinite_values_cannot_enter_machine_contract_or_snapshot_hash(self):
        for invalid in (float('nan'), float('inf'), -float('inf')):
            with self.assertRaises(contracts.ContractViolation):
                contracts.validate('claim-proposal', {'nested': [invalid]})
            with self.assertRaises(ValueError):
                contracts.canonical_hash({'value': invalid})

    def test_nonfinite_quantities_cannot_validate(self):
        for bad in (float('nan'), float('inf'), -float('inf')):
            for position in range(5):
                args = [0.25, 0.03, 0.25, 0.03, 100.0]
                args[position] = bad
                with self.subTest(position=position, value=bad):
                    self.assertEqual(cross_validate(args[0], args[1], 'primary',
                        Reference(args[2], args[3], 'reference', 'computed'), scale=args[4]).status, 'blocked')

    def test_negative_se_invalid_scale_and_unknown_tier_block(self):
        for own_se, reference_se, scale, tier in ((-1, 1, 100, 'fixture_only'),
            (1, -1, 100, 'fixture_only'), (1, 1, 0, 'fixture_only'),
            (1, 1, -1, 'fixture_only'), (1, 1, 100, 'misspelled')):
            self.assertEqual(cross_validate(1, own_se, 'primary',
                Reference(1, reference_se, 'reference', 'computed'), scale=scale, tier=tier).status, 'blocked')
