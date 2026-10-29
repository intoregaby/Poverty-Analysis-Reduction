"""How much of EICV7 household poverty can household factors explain at all, and which unused variables would help?

Run from the project root: .venv/Scripts/python.exe tools/analysis/gap_ceiling.py
Reports out-of-sample R-squared (five folds, whole clusters held out) for the current 40-variable model and for richer specifications, for two
outcomes: poverty status (a threshold, noisy) and log consumption per adult equivalent. Aggregate output only; nothing is written to disk.
"""

import sys, io, zipfile, warnings
from pathlib import Path
warnings.simplefilter("ignore")
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
import numpy as np, pandas as pd
from pathlib import Path
from tools.investigation import drivers

root = ROOT / "Data"
archive = next(root.rglob("*EICV7 2023-2024.zip"))
with zipfile.ZipFile(archive) as z:
    frame = drivers.build_frame(z, [])
    hh = pd.read_stata(io.BytesIO(z.read("Cross_Section/CS_S01_S5_S7_Household.dta")), convert_categoricals=True,
                       columns=["hhid", "s5aq1", "s5aq3", "s5aq8", "s5cq2b", "s5cq8", "s5cq21", "s5cq26", "s5dq1", "s5dq2", "s5dq4", "s5eq2a", "s5eq4a", "s7aq4a", "s7aq4b", "s7aq4c", "s7aq4d", "s7aq4e", "s7aq4f", "s7a2q1"])
    pov = pd.read_stata(io.BytesIO(z.read("Cross_Section/CS_EICV7_poverty_file.dta")), convert_categoricals=True, columns=["hhid", "sol_jan", "member", "ae"])
frame = frame.merge(hh, on="hhid", how="left", validate="one_to_one").merge(pov, on="hhid", how="left", validate="one_to_one")
names = [v[0] for v in drivers.VARIABLES]
w = frame.weight.to_numpy(float)
y_poor = frame.poor.to_numpy(float)
y_log = np.log(frame.sol_jan.to_numpy(float))

# candidate extras (experiment only)
ex = pd.DataFrame(index=frame.index)
ex["persons_per_room"] = (frame.member / pd.to_numeric(frame.s5aq3, errors="coerce").clip(lower=1)).clip(upper=12)
ex["isolated"] = frame.s5aq1.astype(str).str.startswith("Dispersed").astype(float)
ex["renter"] = frame.s5aq8.astype(str).str.startswith("Tenancy").astype(float)
tlu = sum(pd.to_numeric(frame[c], errors="coerce").fillna(0) * f for c, f in (("s7aq4a", 0.7), ("s7aq4b", 0.1), ("s7aq4c", 0.1), ("s7aq4d", 0.2), ("s7aq4e", 0.01), ("s7aq4f", 0.1)))
ex["livestock_units"] = tlu.clip(upper=tlu.quantile(0.99))
ex["got_cow_govt"] = frame.s7a2q1.astype(str).eq("Yes").astype(float)
ex["not_recovered"] = frame.s5eq4a.astype(str).str.startswith("HH not").astype(float)
ex["water_minutes"] = pd.to_numeric(frame.s5cq2b, errors="coerce").clip(upper=120).fillna(pd.to_numeric(frame.s5cq2b, errors="coerce").median())
ex["water_insufficient"] = frame.s5cq8.astype(str).str.startswith("Yes").astype(float)
ex["toilet_shared"] = frame.s5cq26.astype(str).eq("Yes").astype(float)
ex["floor_area"] = pd.to_numeric(frame.s5dq4, errors="coerce").clip(upper=200).fillna(0)
def dummies(col, prefix, top=8):
    s = frame[col].astype(str)
    keep = s.value_counts().head(top).index
    d = pd.get_dummies(s.where(s.isin(keep), "other"), prefix=prefix, dtype=float)
    return d.iloc[:, 1:]  # drop one level
extra_dummies = pd.concat([dummies("s5dq1", "wall"), dummies("s5dq2", "roof"), dummies("s5eq2a", "shock"), dummies("s5cq21", "stove")], axis=1)
rural = frame.rural.to_numpy(float)
inter = pd.DataFrame({f"rural_x_{n}": rural * frame[n].to_numpy(float) for n in ("hh_size", "adult_schooling", "no_grid", "no_secondary_adult", "has_farm", "no_livestock", "durable_types")})
prov = pd.get_dummies(frame.province.astype(str), prefix="prov", dtype=float).iloc[:, 1:]
dist = pd.get_dummies(frame.district.astype(str), prefix="dist", dtype=float).iloc[:, 1:]

def matrix(*parts):
    m = pd.concat([pd.DataFrame(1.0, index=frame.index, columns=["const"])] + list(parts), axis=1)
    return m.to_numpy(float), list(m.columns)

base = frame[names]
sets = {
    "A current 40 variables": matrix(base),
    "B + household extras (rooms, livestock, shocks by type, materials, water...)": matrix(base, ex, extra_dummies),
    "C B + rural interactions": matrix(base, ex, extra_dummies, inter),
    "D C + province effects": matrix(base, ex, extra_dummies, inter, prov),
    "E C + district effects (place ceiling)": matrix(base, ex, extra_dummies, inter, dist),
}

def fit(X, y, wt, lam=1e-3):
    xs = X * wt[:, None]
    g = X.T @ xs + lam * wt.sum() * np.eye(X.shape[1]) / X.shape[1]
    g[0, 0] -= lam * wt.sum() / X.shape[1]
    return np.linalg.solve(g, xs.T @ y)

def wr2(y, f, wt):
    return 1 - float((wt * (y - f) ** 2).sum() / (wt * (y - np.average(y, weights=wt)) ** 2).sum())

rng = np.random.default_rng(7)
# folds by cluster so that nearby households stay together
clusters = frame.clust.to_numpy()
uniq = np.unique(clusters); rng.shuffle(uniq)
fold_of = {c: i % 5 for i, c in enumerate(uniq)}
fold = np.array([fold_of[c] for c in clusters])
print("households", len(frame), "| outcomes: poor (linear probability) and log consumption per adult equivalent")
print(f"{'model':78s} {'vars':>4s} | poor in-sample / out-of-sample R2 | log-consumption in / out")
results = {}
for label, (X, cols) in sets.items():
    row = []
    for y in (y_poor, y_log):
        b = fit(X, y, w)
        ins = wr2(y, X @ b, w)
        pred = np.zeros(len(y))
        for k in range(5):
            tr, te = fold != k, fold == k
            pred[te] = X[te] @ fit(X[tr], y[tr], w[tr])
        row.append((ins, wr2(y, pred, w)))
    results[label] = row
    print(f"{label:78s} {X.shape[1]-1:4d} | {row[0][0]:.3f} / {row[0][1]:.3f}            | {row[1][0]:.3f} / {row[1][1]:.3f}")

# explained share of district gaps (all variables, incl. deprivation markers) with set A and set C
def gap_share(X, y, district):
    b = fit(X, y, w)
    m = (frame.district == district).to_numpy()
    nat = (X * w[:, None]).sum(0) / w.sum()
    dis = (X[m] * w[m][:, None]).sum(0) / w[m].sum()
    contrib = b * (dis - nat); contrib[0] = 0
    gap = np.average(y[m], weights=w[m]) - np.average(y, weights=w)
    return gap, contrib.sum()
print("\nExplained share of the district gap, ALL variables incl. deprivation markers (poverty outcome | log consumption outcome)")
for district in ("Gisagara", "Nyaruguru", "Nyanza", "Nyamagabe", "Gasabo", "Kicukiro"):
    out = []
    for key in ("A current 40 variables", "C B + rural interactions"):
        X = sets[key][0]
        g1, e1 = gap_share(X, y_poor, district); g2, e2 = gap_share(X, y_log, district)
        out.append(f"{key[:1]}: poverty {100*e1/g1:5.0f}% | log-cons {100*e2/g2:5.0f}%")
    print(f"  {district:10s} " + "   ".join(out))


print("\nEach candidate on its own, added to the current model")
def oos(X, y):
    pred = np.zeros(len(y))
    for k in range(5):
        tr, te = fold != k, fold == k
        pred[te] = X[te] @ fit(X[tr], y[tr], w[tr])
    return wr2(y, pred, w)

X0 = matrix(base)[0]
base_poor, base_log = oos(X0, y_poor), oos(X0, y_log)
print("base OOS R2: poor %.4f | log consumption %.4f" % (base_poor, base_log))
cands = {}
for c in ex.columns: cands[c] = ex[[c]]
for prefix in ("wall", "roof", "shock", "stove"):
    cols = [c for c in extra_dummies.columns if c.startswith(prefix + "_")]
    cands[prefix + " (materials/types)"] = extra_dummies[cols]
rows = []
for name, part in cands.items():
    X = matrix(base, part)[0]
    rows.append((name, oos(X, y_poor) - base_poor, oos(X, y_log) - base_log, part.shape[1]))
rows.sort(key=lambda r: -(r[1] + r[2]))
print(f"{'candidate':34s} cols | gain in OOS R2: poor | log consumption")
for n, a, b, k in rows: print(f"{n:34s} {k:4d} | {a:+.4f} | {b:+.4f}")
