"""Seeded stratified PSU bootstrap (Rao-Wu rescaling of weights)."""
from __future__ import annotations

import numpy as np


def bootstrap_psu_se(w, y, strata, psu, reps: int = 500, seed: int = 20240117) -> float:
    """Rao-Wu rescaled bootstrap SE of the weighted mean of y. Deterministic for a given seed."""
    rng = np.random.default_rng(seed)
    w = np.asarray(w, float)
    y = np.nan_to_num(np.asarray(y, float))
    strata = np.asarray(strata)
    psu = np.asarray(psu)
    groups = []
    for h in np.unique(strata):
        rows = np.where(strata == h)[0]
        units = np.unique(psu[rows])
        groups.append((units, [rows[psu[rows] == u] for u in units]))
    est = []
    for _ in range(reps):
        rw = w.copy()
        for units, idx in groups:
            n = len(units)
            if n < 2:
                continue
            draws = rng.integers(0, n, size=n - 1)  # resample n-1 PSUs
            m = np.bincount(draws, minlength=n)
            factor = (n / (n - 1.0)) * m
            for k, rows in enumerate(idx):
                rw[rows] = w[rows] * factor[k]
        est.append(np.sum(rw * y) / np.sum(rw))
    return float(np.std(est, ddof=1))
