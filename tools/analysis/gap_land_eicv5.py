"""Does land explain what the EICV7 model cannot? EICV7 has no land module, so this tests it in EICV5 (2016/17), which does.

Run from the project root: .venv/Scripts/python.exe tools/analysis/gap_land_eicv5.py
Fits a simplified model that mirrors the EICV7 one, with and without five land variables (landless, area per adult equivalent, parcels, irrigation,
title), and reports out-of-sample R-squared and the share of district gaps explained. Parcel area units are not documented in the file, so area is
used only on a log scale and never reported in hectares. Aggregate output only.
"""

import glob, io, zipfile, warnings
from pathlib import Path
warnings.simplefilter("ignore")
import numpy as np, pandas as pd
ROOT = Path(__file__).resolve().parents[2]
data = str(next(ROOT.glob("Data/*")))
zp = glob.glob(data + "/*EICV5 2016-2017 - Part 1.zip")[0]
def rd(z, n, cols): return pd.read_stata(io.BytesIO(z.read(n)), columns=cols, convert_categoricals=True)
with zipfile.ZipFile(zp) as z:
    pv = rd(z, "EICV5_Poverty_file.dta", ["hhid", "clust", "district", "ur", "member", "ae", "pop_wt", "sol_jan", "pov_jan"])
    h = rd(z, "cs_S0_S5_Household.dta", ["hhid", "s5cq1", "s5cq16a1", "s5cq18", "s5dq3", "s5cq20", "s5eq1"])
    p = rd(z, "cs_S1_S2_S3_S4_S6A_S6E_Person.dta", ["hhid", "s1q1", "s1q2", "s1q3y", "s4aq1", "s4aq2"])
    l = rd(z, "cs_S7A1_livestock.dta", ["hhid", "s7aq4", "s7aq5"])
    c = rd(z, "cs_S7C_parcels.dta", ["hhid", "s7cq4", "s7cq6", "s7cq11"])
for name, df in (("poverty", pv), ("household", h)):
    assert df.hhid.is_unique, name
assert set(p.hhid) <= set(pv.hhid) and set(c.hhid) <= set(pv.hhid) and set(l.hhid) <= set(pv.hhid), "modules contain households missing from the poverty file"
index = pv.set_index("hhid").index
hh = pv.set_index("hhid")
H = h.set_index("hhid").reindex(index)
age = pd.to_numeric(p.s1q3y, errors="coerce")
adult = age >= 18
head = p.s1q2.astype(str).str.startswith("Household head")
heads = p[head].drop_duplicates("hhid").set_index("hhid").reindex(index)
assert heads.s1q1.notna().all(), "every household needs a head"
n = hh.member.astype(float)
X = pd.DataFrame(index=index)
X["hh_size"] = n
X["child_share"] = (age < 15).groupby(p.hhid).sum().reindex(index) / n
X["elderly_share"] = (age >= 65).groupby(p.hhid).sum().reindex(index) / n
X["head_female"] = heads.s1q1.astype(str).eq("Female").astype(float)
X["head_age"] = pd.to_numeric(heads.s1q3y, errors="coerce") / 10
X["head_no_school"] = heads.s4aq1.astype(str).eq("No").astype(float)
ans = adult & p.s4aq1.notna()
X["adult_no_school_share"] = ((ans & p.s4aq1.astype(str).eq("No")).groupby(p.hhid).sum() / ans.groupby(p.hhid).sum().where(lambda s: s > 0)).reindex(index)
sec = adult & p.s4aq2.astype(str).str.startswith(("Secondary", "University"))
X["no_secondary_adult"] = (~sec.groupby(p.hhid).any().reindex(index).fillna(False)).astype(float)
X["rural"] = hh.ur.astype(str).eq("Rural").astype(float)
X["no_grid"] = (~H.s5cq16a1.astype(str).isin(["National Grid Connection", "Local Mini Grid"])).astype(float)
X["biomass_cooking"] = H.s5cq18.astype(str).isin(["Firewood", "Crop waste"]).astype(float)
X["earth_floor"] = H.s5dq3.astype(str).isin(["Beaten earth", "Hardened dung"]).astype(float)
X["toilet_unimproved"] = H.s5cq20.astype(str).isin(["Pit latrine without slab", "No toilet whatsever", "Other"]).astype(float)
X["water_unimproved"] = H.s5cq1.astype(str).isin(["Surface water _river or lake_", "Unprotected spring", "Unprotected well", "Other _specify_"]).astype(float)
X["shock"] = H.s5eq1.astype(str).eq("Yes").astype(float)
animals = pd.to_numeric(l.s7aq5, errors="coerce").fillna(0).where(l.s7aq4.astype(str).eq("Yes"), 0)
total_animals = animals.groupby(l.hhid).sum().reindex(index).fillna(0)
X["livestock_any"] = (total_animals > 0).astype(float)
X["livestock_log"] = np.log1p(total_animals.clip(upper=total_animals.quantile(0.99)))
area = pd.to_numeric(c.s7cq4, errors="coerce")
cap = area.quantile(0.99)
total_area = area.clip(upper=cap).groupby(c.hhid).sum().reindex(index).fillna(0)
L = pd.DataFrame(index=index)
L["landless"] = (~index.isin(c.hhid)).astype(float)
L["land_per_ae_log"] = np.log1p(total_area / hh.ae.astype(float))
L["n_parcels"] = c.groupby("hhid").size().reindex(index).fillna(0).clip(upper=8)
L["irrigated_any"] = (c.s7cq11.astype(str).eq("Yes")).groupby(c.hhid).any().reindex(index).fillna(False).astype(float)
L["titled_any"] = (c.s7cq6.astype(str).eq("Yes")).groupby(c.hhid).any().reindex(index).fillna(False).astype(float)
miss = X.isna().mean().round(3)
print("missing >0:", miss[miss > 0].to_dict(), "| households", len(X), "| landless share (weighted):", round(100 * float((hh.pop_wt * L.landless).sum() / hh.pop_wt.sum()), 1), "%")
for col in X.columns:
    if X[col].isna().any(): X[col] = X[col].fillna(np.average(X[col].dropna(), weights=hh.pop_wt[X[col].notna()]))
w = hh.pop_wt.to_numpy(float)
y_poor = hh.pov_jan.astype(str).eq("Poor").to_numpy(float)
y_log = np.log(hh.sol_jan.to_numpy(float))
rural = X.rural.to_numpy() > 0.5
clusters = hh.clust.to_numpy()
rng = np.random.default_rng(11)
u = np.unique(clusters); rng.shuffle(u)
fold_of = {c_: i % 5 for i, c_ in enumerate(u)}
fold = np.array([fold_of[c_] for c_ in clusters])

def design(*parts):
    return np.column_stack([np.ones(len(index))] + [pt.to_numpy(float) for pt in parts])
def fit(M, y, wt, lam=1e-3):
    xs = M * wt[:, None]; g = M.T @ xs + lam * wt.sum() * np.eye(M.shape[1]) / M.shape[1]; g[0, 0] -= lam * wt.sum() / M.shape[1]
    return np.linalg.solve(g, xs.T @ y)
def wr2(y, f, wt): return 1 - float((wt * (y - f) ** 2).sum() / (wt * (y - np.average(y, weights=wt)) ** 2).sum())
def oos(M, y, mask=None):
    pred = np.zeros(len(y))
    for k in range(5):
        tr, te = fold != k, fold == k
        pred[te] = M[te] @ fit(M[tr], y[tr], w[tr])
    m = np.ones(len(y), bool) if mask is None else mask
    return wr2(y[m], pred[m], w[m])
A, B = design(X), design(X, L)
print("\nEICV5 simplified model (%d base variables; +5 land variables). Out-of-sample R2, 5-fold by cluster" % X.shape[1])
print(f"{'':28s} poor: base -> +land | log consumption: base -> +land")
for label, mask in (("all households", None), ("rural households", rural)):
    print(f"{label:28s}       {oos(A, y_poor, mask):.3f} -> {oos(B, y_poor, mask):.3f}  |          {oos(A, y_log, mask):.3f} -> {oos(B, y_log, mask):.3f}")
columns = list(X.columns) + list(L.columns)
b = fit(B, y_log, w)
print("\nland coefficients in the log-consumption model (per unit):", {name: round(float(v), 3) for name, v in zip(columns, b[1:]) if name in L.columns})
bp = fit(B, y_poor, w); print("land coefficients in the poverty model (percentage points):", {name: round(100 * float(v), 2) for name, v in zip(list(X.columns) + list(L.columns), bp[1:]) if name in L.columns})

def explained(M, y, district):
    beta = fit(M, y, w)
    m = (hh.district.astype(str) == district).to_numpy()
    nat = (M * w[:, None]).sum(0) / w.sum(); dis = (M[m] * w[m][:, None]).sum(0) / w[m].sum()
    contrib = beta * (dis - nat); contrib[0] = 0
    gap = np.average(y[m], weights=w[m]) - np.average(y, weights=w)
    return gap, contrib
print("\nShare of the district gap to Rwanda explained (all variables), EICV5 2016/17")
rates = {d: np.average(y_poor[(hh.district.astype(str) == d).to_numpy()], weights=w[(hh.district.astype(str) == d).to_numpy()]) for d in hh.district.astype(str).unique()}
worst = sorted(rates, key=lambda d: -rates[d])[:6]
names_B = ["const"] + list(X.columns) + list(L.columns)
for d in worst:
    g, ca = explained(A, y_poor, d); _, cb = explained(B, y_poor, d)
    gl, la = explained(A, y_log, d); _, lb = explained(B, y_log, d)
    land_pts = 100 * sum(cb[names_B.index(c_)] for c_ in L.columns)
    print(f"  {d:12s} poverty {100*rates[d]:4.1f}% (gap {100*g:+5.1f}) | explained: without land {100*ca.sum()/g:4.0f}% -> with land {100*cb.sum()/g:4.0f}% (land itself {land_pts:+.1f} pts) | log-cons: {100*la.sum()/gl:4.0f}% -> {100*lb.sum()/gl:4.0f}%")
