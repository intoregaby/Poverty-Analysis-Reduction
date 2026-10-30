"""Design-based survey estimation (primary estimator, EP-03).

Taylor-series linearisation for ratios/means/proportions/totals and FGT poverty
measures under stratified multistage cluster designs (strata, PSU, optional
finite-population correction), correct subpopulation (domain) variance, joint
variance for differences between overlapping domains, explicit singleton-stratum
policy and weight validation. The independent cross-check lives in
`survey_reference.py` and shares no code with this module.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Optional, Sequence

import numpy as np
from scipy import stats

SingletonPolicy = Literal["error", "adjust", "certainty"]


class SurveyError(ValueError):
    """Raised for conditions that must not silently produce a number."""


class InvalidWeights(SurveyError):
    pass


class UniverseMismatch(SurveyError):
    pass


class SingletonStratumError(SurveyError):
    pass


@dataclass(frozen=True)
class Estimate:
    point: float
    se: float
    df: int
    ci_low: float
    ci_high: float
    n_obs: int            # unweighted observations in the domain
    n_psu_domain: int     # PSUs contributing at least one domain observation
    deff: Optional[float]
    ci_method: str
    diagnostics: dict = field(default_factory=dict)

    @property
    def cv(self) -> Optional[float]:
        return None if self.point == 0 else abs(self.se / self.point)


@dataclass
class Design:
    """Sampling design with validated weights.

    weights   : final analytic weights, one per row, of the declared `unit` universe
    strata    : stratum label per row
    psu       : primary sampling unit label per row (unique within stratum after combination)
    unit      : "household" or "person" -- the universe the rows and weights represent
    fpc_psu   : optional {stratum: N_h} population PSU counts for the finite-population correction
    singleton : policy for strata with a single PSU
    """

    weights: np.ndarray
    strata: np.ndarray
    psu: np.ndarray
    unit: str = "household"
    fpc_psu: Optional[dict] = None
    singleton: SingletonPolicy = "error"
    zero_weight_policy: Literal["keep", "drop"] = "keep"

    def __post_init__(self):
        w = np.asarray(self.weights, dtype=float)
        if w.ndim != 1:
            raise InvalidWeights("weights must be one-dimensional")
        n = w.shape[0]
        if np.asarray(self.strata).shape[0] != n or np.asarray(self.psu).shape[0] != n:
            raise SurveyError("weights, strata and psu must have the same length")
        if np.isnan(w).any():
            raise InvalidWeights(f"{int(np.isnan(w).sum())} null/NaN weights")
        if not np.isfinite(w).all():
            raise InvalidWeights("non-finite weights")
        if (w < 0).any():
            raise InvalidWeights(f"{int((w < 0).sum())} negative weights")
        if (w == 0).all():
            raise InvalidWeights("all weights are zero")
        self.weights = w
        self.strata = np.asarray(self.strata)
        # PSU identity is the (stratum, psu) pair so labels need only be unique within stratum
        self._psu_key = np.array([f"{s}\x1f{p}" for s, p in zip(self.strata, np.asarray(self.psu))])
        self.n_zero_weights = int((w == 0).sum())
        if self.zero_weight_policy == "drop" and self.n_zero_weights:
            keep = w > 0
            self.weights = w[keep]
            self.strata = self.strata[keep]
            self._psu_key = self._psu_key[keep]
        self._index()

    def _index(self):
        self._strata_u, self._h = np.unique(self.strata, return_inverse=True)
        self._psu_u, self._j = np.unique(self._psu_key, return_inverse=True)
        # stratum of each PSU
        self._psu_stratum = np.zeros(len(self._psu_u), dtype=int)
        self._psu_stratum[self._j] = self._h
        counts = np.bincount(self._psu_stratum, minlength=len(self._strata_u))
        self._n_h = counts
        singles = [self._strata_u[i] for i in np.where(counts == 1)[0]]
        self.singleton_strata = singles
        if singles and self.singleton == "error":
            raise SingletonStratumError(
                f"{len(singles)} singleton strata ({singles[:5]}); choose singleton='adjust' or 'certainty' explicitly")

    @property
    def n(self) -> int:
        return self.weights.shape[0]

    @property
    def df(self) -> int:
        return int(len(self._psu_u) - len(self._strata_u))

    # ---- variance of a linearised total -------------------------------------------------
    def variance_of_linearised(self, z: np.ndarray) -> float:
        """Variance of sum_i z_i (z already incorporates the weight) under the design."""
        psu_tot = np.bincount(self._j, weights=z, minlength=len(self._psu_u))
        var = 0.0
        grand_mean = psu_tot.mean()
        for h in range(len(self._strata_u)):
            members = np.where(self._psu_stratum == h)[0]
            n_h = len(members)
            t = psu_tot[members]
            if n_h == 1:
                if self.singleton == "certainty":
                    continue
                # "adjust": centre the lone PSU at the grand mean of PSU totals (survey::lonely.psu="adjust")
                var += (t[0] - grand_mean) ** 2
                continue
            f = 0.0
            if self.fpc_psu is not None:
                N_h = self.fpc_psu.get(self._strata_u[h])
                if N_h is not None:
                    if N_h < n_h:
                        raise SurveyError(f"fpc population PSUs {N_h} < sampled {n_h} in stratum {self._strata_u[h]}")
                    f = n_h / N_h
            var += (1.0 - f) * n_h / (n_h - 1.0) * np.sum((t - t.mean()) ** 2)
        return float(var)


# ---------------------------------------------------------------------------------------------
def _domain(design: Design, domain: Optional[np.ndarray]) -> np.ndarray:
    if domain is None:
        return np.ones(design.n, dtype=bool)
    d = np.asarray(domain, dtype=bool)
    if d.shape[0] != design.n:
        raise SurveyError("domain mask length differs from design")
    return d


def _interval(point, se, df, method, bounds=None):
    if df <= 0:
        return (float("nan"), float("nan"))
    q = stats.t.ppf(0.975, df)
    if method == "t":
        return (point - q * se, point + q * se)
    if method == "logit":  # for proportions in (0,1); Korn-Graubard-like logit transform
        if not (0.0 < point < 1.0):
            return (max(0.0, point), min(1.0, point))
        s = se / (point * (1 - point))
        lg = np.log(point / (1 - point))
        lo, hi = lg - q * s, lg + q * s
        return (1 / (1 + np.exp(-lo)), 1 / (1 + np.exp(-hi)))
    raise SurveyError(f"unknown ci method {method}")


def ratio_estimate(design: Design, y: Sequence[float], x: Optional[Sequence[float]] = None,
                   domain: Optional[np.ndarray] = None, ci: str = "t",
                   expected_unit: Optional[str] = None) -> Estimate:
    """Domain ratio R = sum_d w*y / sum_d w*x (mean when x is None; proportion if y is 0/1)."""
    if expected_unit is not None and expected_unit != design.unit:
        raise UniverseMismatch(f"indicator universe '{expected_unit}' but design rows are '{design.unit}'")
    y = np.asarray(y, dtype=float)
    if y.shape[0] != design.n:
        raise SurveyError("y length differs from design")
    xv = np.ones(design.n) if x is None else np.asarray(x, dtype=float)
    d = _domain(design, domain)
    ok = d & ~np.isnan(y) & ~np.isnan(xv)
    w = design.weights
    wx = w * xv * ok
    denom = wx.sum()
    if denom <= 0:
        raise SurveyError("empty domain (zero weighted denominator)")
    num = (w * y * ok).sum()
    r = num / denom
    z = np.where(ok, w * (np.nan_to_num(y) - r * np.nan_to_num(xv)) / denom, 0.0)
    var = design.variance_of_linearised(z)
    se = float(np.sqrt(max(var, 0.0)))
    psu_in = len(np.unique(design._j[ok & (w > 0)]))
    lo, hi = _interval(r, se, design.df, ci)
    # design effect vs SRS (with-replacement) variance of the same ratio
    n_ok = int(ok.sum())
    deff = None
    if n_ok > 1:
        zs = (w[ok] / denom) * (np.nan_to_num(y)[ok] - r * np.nan_to_num(xv)[ok])
        srs = n_ok * zs.var(ddof=1) if n_ok > 1 else 0.0
        deff = float(var / srs) if srs > 0 else None
    return Estimate(float(r), se, design.df, float(lo), float(hi), n_ok, psu_in, deff, ci,
                    {"zero_weight_rows": design.n_zero_weights, "singleton_strata": len(design.singleton_strata)})


def total_estimate(design: Design, y: Sequence[float], domain: Optional[np.ndarray] = None) -> Estimate:
    y = np.asarray(y, dtype=float)
    d = _domain(design, domain)
    ok = d & ~np.isnan(y)
    z = np.where(ok, design.weights * np.nan_to_num(y), 0.0)
    tot = float(z.sum())
    se = float(np.sqrt(max(design.variance_of_linearised(z), 0.0)))
    lo, hi = _interval(tot, se, design.df, "t")
    return Estimate(tot, se, design.df, float(lo), float(hi), int(ok.sum()),
                    len(np.unique(design._j[ok])), None, "t")


def proportion_estimate(design: Design, indicator: Sequence[float], domain=None, ci: str = "logit",
                        expected_unit: Optional[str] = None) -> Estimate:
    return ratio_estimate(design, indicator, None, domain, ci, expected_unit)


def fgt_poverty(design: Design, consumption: Sequence[float], line: float, alpha: int = 0,
                household_size: Optional[Sequence[float]] = None, domain=None,
                expected_unit: Optional[str] = None, ci: str = "t") -> Estimate:
    """FGT(alpha) poverty index. If rows are households, pass household_size so the
    estimand is person-based (weights x size); `consumption` is per-adult-equivalent/per-capita."""
    c = np.asarray(consumption, dtype=float)
    if line <= 0:
        raise SurveyError("poverty line must be positive")
    if alpha not in (0, 1, 2):
        raise SurveyError("alpha must be 0, 1 or 2")
    gap = np.clip((line - c) / line, 0.0, None)
    y = np.where(c < line, gap ** alpha if alpha else 1.0, 0.0)
    y = np.where(np.isnan(c), np.nan, y)
    return ratio_estimate(design, y, household_size, domain, ci, expected_unit)


def difference_estimate(design: Design, y: Sequence[float], x: Optional[Sequence[float]],
                        domain_a: np.ndarray, domain_b: np.ndarray) -> Estimate:
    """R_a - R_b with the covariance between overlapping/nested domains (e.g. district vs national)."""
    y = np.asarray(y, dtype=float)
    xv = np.ones(design.n) if x is None else np.asarray(x, dtype=float)
    w = design.weights
    zs = []
    rs = []
    for dom in (domain_a, domain_b):
        d = _domain(design, dom) & ~np.isnan(y) & ~np.isnan(xv)
        den = (w * xv * d).sum()
        if den <= 0:
            raise SurveyError("empty domain")
        r = (w * y * d).sum() / den
        rs.append(r)
        zs.append(np.where(d, w * (np.nan_to_num(y) - r * np.nan_to_num(xv)) / den, 0.0))
    z = zs[0] - zs[1]
    se = float(np.sqrt(max(design.variance_of_linearised(z), 0.0)))
    diff = rs[0] - rs[1]
    lo, hi = _interval(diff, se, design.df, "t")
    return Estimate(float(diff), se, design.df, float(lo), float(hi), int(_domain(design, domain_a).sum()),
                    0, None, "t")


def reliability_grade(est: Estimate, min_n: int = 30, min_psu: int = 5) -> dict:
    """Publication reliability: CV bands and sample sufficiency with an explicit reason."""
    reasons = []
    if est.n_obs < min_n:
        reasons.append(f"fewer than {min_n} unweighted observations ({est.n_obs})")
    if est.n_psu_domain < min_psu:
        reasons.append(f"fewer than {min_psu} PSUs in domain ({est.n_psu_domain})")
    cv = est.cv
    if reasons:
        return {"grade": "unreliable", "cv": cv, "reasons": reasons, "publishable": False}
    if cv is None:
        return {"grade": "unestimable", "cv": None, "reasons": ["zero point estimate: CV undefined"], "publishable": True}
    grade = "high" if cv < 0.15 else "moderate" if cv < 0.30 else "low"
    reasons = ["CV >= 30%: flag as unreliable, do not publish as a headline"] if grade == "low" else []
    return {"grade": grade, "cv": cv, "reasons": reasons, "publishable": grade != "low"}
