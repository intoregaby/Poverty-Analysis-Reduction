"""Bind reviewed joint-design difference facts to the exact operand snapshots.

This registry is populated by the scientific service, never by model proposals.
The contrast itself must be a separately scientifically validated calculated fact.
"""
from dataclasses import dataclass, field
import math
from scipy.stats import t

from .contracts import canonical_hash


@dataclass
class ContrastRegistry:
    bindings: dict = field(default_factory=dict)

    def bind(self, store, left_id, right_id, contrast_id, df, equivalence_margin=None, margin_approved_by=None):
        if not isinstance(df, (int, float)) or not math.isfinite(df) or df <= 0:
            raise ValueError('Positive finite joint-design degrees of freedom required')
        if equivalence_margin is not None and (not isinstance(equivalence_margin, (int, float)) or
                not math.isfinite(equivalence_margin) or equivalence_margin <= 0 or not margin_approved_by):
            raise ValueError('Equivalence margin requires positive finite value and registered approver')
        ids = (left_id, right_id, contrast_id)
        facts = [store.calculated[i] for i in ids]
        if not all(store.validated(i) for i in ids):
            raise ValueError('Operands and joint contrast must have independent scientific verdicts')
        a, b, c = facts
        for key in ('indicator_id', 'definition_version', 'dataset_sha256', 'period', 'sample_unit', 'unit'):
            if a[key] != b[key]:
                raise ValueError('Contrast operands have different ' + key)
        for key in ('dataset_sha256', 'period', 'sample_unit'):
            if c[key] != a[key]:
                raise ValueError('Contrast context does not match operands')
        expected_unit = 'pp' if a['unit'] == 'percent' else a['unit']
        if c['unit'] != expected_unit or c['indicator_id'] != a['indicator_id'] + '_difference':
            raise ValueError('Contrast definition or unit does not match operands')
        difference = a['point_estimate'] - b['point_estimate']
        se = c.get('standard_error')
        if not math.isfinite(difference) or not isinstance(se, (int, float)) or not math.isfinite(se) or se < 0:
            raise ValueError('Finite contrast estimate and nonnegative SE required')
        if not math.isclose(difference, c['point_estimate'], rel_tol=1e-12, abs_tol=1e-12):
            raise ValueError('Contrast estimate differs from operand difference')
        self.bindings[(left_id, right_id)] = {'ids': ids, 'hashes': [canonical_hash(f) for f in facts],
            'df': df, 'equivalence_margin': equivalence_margin, 'margin_approved_by': margin_approved_by}

    def evaluate(self, store, left_id, right_id):
        binding = self.bindings.get((left_id, right_id))
        if binding is None:
            return None
        facts = [store.calculated[i] for i in binding['ids']]
        if [canonical_hash(f) for f in facts] != binding['hashes'] or not all(store.validated(i) for i in binding['ids']):
            raise ValueError('Contrast binding stale or scientific validation revoked')
        difference, se = facts[2]['point_estimate'], facts[2]['standard_error']
        critical = float(t.ppf(0.975, binding['df']))
        significant = abs(difference) > critical * se
        margin = binding['equivalence_margin']
        # TOST at alpha .05 uses a 90% CI and a pre-registered margin.
        equivalent = margin is not None and abs(difference) + float(t.ppf(0.95, binding['df'])) * se < margin
        return {'significant': significant, 'equivalent': equivalent,
                'contrast_fact_id': binding['ids'][2], 'method': 'joint-design-t', **binding}
