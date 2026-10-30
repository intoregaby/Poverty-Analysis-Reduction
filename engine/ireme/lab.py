"""Scientific laboratory (EP-11): decomposition with reference-group sensitivity, wave-comparability
guard, ranking under uncertainty, domain-support guard and out-of-time prediction validation."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


# ---- Oaxaca-Blinder with explicit reference-group sensitivity (SCI-14) ----------------------------------------
def _wls(X, y, w):
    W = np.sqrt(w)[:, None]
    beta, *_ = np.linalg.lstsq(X * W, y * W[:, 0], rcond=None)
    return beta


def oaxaca(XA, yA, wA, XB, yB, wB, names=None) -> dict:
    """Twofold decomposition of mean(yA)-mean(yB) under several reference coefficient vectors. X must include a
    constant. The exact identity gap = explained + unexplained is asserted for every reference."""
    XA, XB = np.asarray(XA, float), np.asarray(XB, float)
    wA, wB = np.asarray(wA, float), np.asarray(wB, float)
    bA, bB = _wls(XA, np.asarray(yA, float), wA), _wls(XB, np.asarray(yB, float), wB)
    mA, mB = np.average(XA, axis=0, weights=wA), np.average(XB, axis=0, weights=wB)
    gap = float(np.average(yA, weights=wA) - np.average(yB, weights=wB))
    pooled = _wls(np.vstack([XA, XB]), np.concatenate([yA, yB]), np.concatenate([wA, wB]))
    refs = {"group_A": bA, "group_B": bB, "average": 0.5 * (bA + bB), "pooled": pooled}
    out = {}
    for name, b in refs.items():
        explained = float((mA - mB) @ b)
        unexplained = float(mA @ (bA - b) + mB @ (b - bB))
        # identity holds exactly for OLS with a constant (weighted means sit on the regression plane)
        assert abs(gap - (explained + unexplained)) < 1e-8 * max(1.0, abs(gap)), (name, gap, explained, unexplained)
        out[name] = {"explained": explained, "unexplained": unexplained,
                     "explained_share": explained / gap if gap else float("nan")}
    shares = [v["explained_share"] for v in out.values()]
    spread = max(shares) - min(shares)
    return {"gap": gap, "by_reference": out, "explained_share_range": spread, "reference_sensitive": spread > 0.10,
            "interpretation": "descriptive accounting of an observed gap; not a causal effect decomposition"}


# ---- survey-wave comparability (SCI-16) ----------------------------------------------------------------------------
@dataclass(frozen=True)
class Wave:
    wave_id: str
    period: str
    series: str          # poverty measurement series; a methodology break starts a new series


class IncompatibleWaves(ValueError):
    pass


class WaveRegistry:
    def __init__(self):
        self.waves = {}
        self.harmonised = {}       # (wave_id, target_series) -> {"value":..., "source":...}

    def add(self, w: Wave):
        self.waves[w.wave_id] = w

    def add_harmonised(self, wave_id: str, target_series: str, value: float, source: str):
        if not source:
            raise ValueError("a harmonised re-estimate needs a citable source")
        self.harmonised[(wave_id, target_series)] = {"value": value, "source": source}

    def comparable_value(self, wave_id: str, observed: float, target_series: str):
        w = self.waves[wave_id]
        if w.series == target_series:
            return {"value": observed, "basis": "observed"}
        h = self.harmonised.get((wave_id, target_series))
        if h is None:
            raise IncompatibleWaves(f"{wave_id} is series '{w.series}', target '{target_series}': no harmonised estimate; "
                                    "a trend would mix measurement methodologies")
        return {"value": h["value"], "basis": f"harmonised re-estimate ({h['source']})"}


# ---- ranking under uncertainty & domain support (SCI-17) ---------------------------------------------------------------
def rank_with_uncertainty(names, estimates, ses, draws: int = 10000, seed: int = 20240117) -> dict:
    rng = np.random.default_rng(seed)
    est, se = np.asarray(estimates, float), np.asarray(ses, float)
    sims = rng.normal(est, se, size=(draws, len(est)))
    ranks = (-sims).argsort(axis=1).argsort(axis=1) + 1             # 1 = highest
    lo, hi = np.percentile(ranks, [2.5, 97.5], axis=0)
    out = {n: {"rank_point": int((-est).argsort().argsort()[i] + 1), "rank_low": int(lo[i]), "rank_high": int(hi[i])}
           for i, n in enumerate(names)}
    return {"ranks": out, "statement": "ranks are uncertain; intervals show plausible rank range"}


def domain_supported(n_psu_in_domain: int, n_obs: int, planned_domain: bool, min_psu: int = 10, min_obs: int = 100):
    """Estimates for unplanned/small domains (e.g. sector or village from a district-designed survey) are refused."""
    reasons = []
    if not planned_domain:
        reasons.append("domain is not a design domain of the survey")
    if n_psu_in_domain < min_psu:
        reasons.append(f"only {n_psu_in_domain} PSUs (< {min_psu})")
    if n_obs < min_obs:
        reasons.append(f"only {n_obs} observations (< {min_obs})")
    return {"supported": not reasons, "reasons": reasons}


# ---- out-of-time prediction validation (SCI-18) ---------------------------------------------------------------------------
class LeakageError(ValueError):
    pass


def temporal_holdout(X, y, wave, train_waves, test_waves, ridge: float = 1.0, feature_waves=None) -> dict:
    """Fit on strictly earlier waves, test on later ones, compare to a naive last-wave-mean baseline.
    `feature_waves` (if given) is the measurement wave of each feature row's inputs; any feature measured at or after
    the target wave of the test rows is leakage."""
    wave = np.asarray(wave)
    if max(train_waves) >= min(test_waves):
        raise LeakageError("training waves must precede test waves (random/future-mixed splits are not allowed)")
    if feature_waves is not None and np.any(np.asarray(feature_waves) > wave):
        raise LeakageError("a feature was measured after the outcome wave")
    tr, te = np.isin(wave, train_waves), np.isin(wave, test_waves)
    Xtr, ytr, Xte, yte = np.asarray(X)[tr], np.asarray(y)[tr], np.asarray(X)[te], np.asarray(y)[te]
    mu, sd = Xtr.mean(0), Xtr.std(0) + 1e-12
    Z = lambda A: np.c_[np.ones(len(A)), (A - mu) / sd]  # noqa: E731
    A = Z(Xtr)
    reg = ridge * np.eye(A.shape[1]); reg[0, 0] = 0
    beta = np.linalg.solve(A.T @ A + reg, A.T @ ytr)
    pred = Z(Xte) @ beta
    last = ytr[wave[tr] == max(train_waves)].mean()
    rmse = lambda e: float(np.sqrt(np.mean(e ** 2)))  # noqa: E731
    m, b = rmse(yte - pred), rmse(yte - last)
    return {"rmse_model": m, "rmse_naive": b, "skill": 1 - m / b, "beats_baseline": m < b, "n_train": int(tr.sum()), "n_test": int(te.sum())}
