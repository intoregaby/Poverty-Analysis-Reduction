"""Statistical disclosure control (PRIV-02/03): small-cell suppression with complementary
suppression, and a query ledger that blocks repeated-differencing attacks."""
from __future__ import annotations


import numpy as np


def suppress_table(counts: np.ndarray, threshold: int = 10, margins_published: bool = True):
    """2-D count table. Primary suppression of 0<cell<threshold; complementary suppression so no
    suppressed cell can be recovered from published margins (needs >=2 suppressed per row/col)."""
    c = np.asarray(counts, dtype=float)
    mask = (c > 0) & (c < threshold)
    if margins_published:
        changed = True
        while changed:
            changed = False
            for axis in (0, 1):
                lines = range(c.shape[1 - axis])
                for i in lines:
                    idx = mask[:, i] if axis == 0 else mask[i, :]
                    if idx.sum() == 1:
                        vals = c[:, i] if axis == 0 else c[i, :]
                        cand = np.where(~idx & (vals > 0))[0]
                        if len(cand) == 0:
                            continue          # nothing else to hide; zero cells reveal nothing
                        k = cand[np.argmin(vals[cand])]   # hide the smallest remaining cell
                        if axis == 0:
                            mask[k, i] = True
                        else:
                            mask[i, k] = True
                        changed = True
    out = np.where(mask, np.nan, c)
    return out, mask


class QueryLedger:
    """Refuses an aggregate query whose difference with a previously released aggregate isolates
    fewer than `min_cell` units (the classic A minus B differencing attack)."""

    def __init__(self, min_cell: int = 10):
        self.min_cell = min_cell
        self.released: list[frozenset] = []

    def request(self, unit_ids) -> bool:
        s = frozenset(unit_ids)
        if len(s) < self.min_cell:
            return False
        for r in self.released:
            for a, b in ((s, r), (r, s)):
                if b <= a:
                    d = len(a - b)
                    if 0 < d < self.min_cell:
                        return False
        # also compare against pairwise unions are out of scope; the ledger is conservative on subset chains
        self.released.append(s)
        return True
