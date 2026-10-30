"""Independent reference estimator (stratified delete-one-PSU jackknife, JKn).

Written to share NO code with `survey.py`: statistics are recomputed on replicate
weights instead of being linearised, so agreement with the Taylor path is a real
cross-check of both the point estimate and the standard error. This is a second
*Python* code path; the kit's R `survey` path remains blocker BLK-R.
"""
from __future__ import annotations

import numpy as np


def jackknife(theta, w, strata, psu, fpc=None):
    """theta(weights)->float. Returns (theta(w), jackknife SE)."""
    w = np.asarray(w, float)
    strata = np.asarray(strata)
    psu = np.asarray(psu)
    base = float(theta(w))
    variance = 0.0
    for h in np.unique(strata):
        rows_h = strata == h
        units = np.unique(psu[rows_h])
        n_h = len(units)
        if n_h < 2:
            continue
        reps = []
        for u in units:
            rw = w.copy()
            in_u = rows_h & (psu == u)
            rw[in_u] = 0.0
            rw[rows_h & ~in_u] *= n_h / (n_h - 1.0)
            reps.append(theta(rw))
        reps = np.array(reps)
        f = 0.0 if not fpc or h not in fpc else n_h / fpc[h]
        variance += (1.0 - f) * (n_h - 1.0) / n_h * np.sum((reps - base) ** 2)
    return base, float(np.sqrt(variance))


def jackknife_ratio(w, y, x, strata, psu, domain=None, fpc=None):
    y = np.nan_to_num(np.asarray(y, float))
    x = np.ones(len(y)) if x is None else np.nan_to_num(np.asarray(x, float))
    d = np.ones(len(y), bool) if domain is None else np.asarray(domain, bool)

    def theta(weights):
        return np.sum(weights * y * d) / np.sum(weights * x * d)

    return jackknife(theta, w, strata, psu, fpc)
