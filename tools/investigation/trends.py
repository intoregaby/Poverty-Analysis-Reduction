"""Aggregate-only poverty trends: EICV3-EICV5 (old method), NISR's modelled 2016/17 to EICV7 (new method), and EICV3-EICV4 panel mobility."""

from __future__ import annotations

import io
import math
import tempfile
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd

MIN_SAMPLE = 30
POVERTY_PROFILE_URL = "https://statistics.gov.rw/sites/default/files/documents/2025-07/EICV7_Poverty%20Profile.pdf"
MAIN_REPORT_URL = "https://statistics.gov.rw/sites/default/files/documents/2025-07/EICV7_Main%20Indicator%20Report.pdf"
ROUNDS = (("EICV3", "2010/11"), ("EICV4", "2013/14"), ("EICV5", "2016/17"))
# EICV7 Main Indicators Report, poverty row: 56.7 (2005/06), 44.9 (2010/11), 39.1 (2013/14), 39.8* (2016/17, modelled; original 38.2), 27.4 (2023/24).
PUBLISHED_NATIONAL = {"EICV3": 44.9, "EICV4": 39.1, "EICV5": 38.2, "EICV5_modelled": 39.8, "EICV7": 27.4}
# EICV7 Poverty Profile, Annex B: headcount poverty, EICV5 predicted under the EICV7 method vs EICV7 actual, and the published decrease.
PUBLISHED_NEW_SERIES = {
    "Nyamagabe": (67.6, 51.4, 16.2), "Gisagara": (59.5, 45.6, 13.9), "Rusizi": (59.0, 44.2, 14.9), "Nyanza": (46.9, 43.3, 3.6),
    "Nyamasheke": (53.6, 42.8, 10.8), "Rutsiro": (59.9, 40.8, 19.1), "Nyaruguru": (52.6, 39.7, 12.9), "Kamonyi": (53.0, 39.7, 13.3),
    "Rubavu": (49.2, 38.8, 10.4), "Karongi": (53.0, 38.2, 14.8), "Kayonza": (51.0, 36.6, 14.5), "Nyagatare": (48.6, 36.4, 12.3),
    "Ngoma": (34.0, 30.9, 3.1), "Ngororero": (44.4, 30.2, 14.2), "Gakenke": (36.7, 24.5, 12.2), "Huye": (39.4, 24.2, 15.3),
    "Rwamagana": (29.6, 23.8, 5.7), "Bugesera": (40.8, 23.7, 17.1), "Burera": (25.5, 22.0, 3.5), "Rulindo": (35.2, 21.6, 13.6),
    "Musanze": (42.3, 21.0, 21.3), "Nyabihu": (39.6, 20.2, 19.4), "Gatsibo": (38.0, 18.4, 19.6), "Ruhango": (26.2, 15.0, 11.2),
    "Muhanga": (33.2, 15.0, 18.3), "Kirehe": (26.0, 14.2, 11.7), "Gicumbi": (24.6, 13.3, 11.3), "Gasabo": (18.1, 11.1, 7.0),
    "Kicukiro": (8.2, 6.9, 1.3), "Nyarugenge": (11.6, 6.8, 4.8),
}


def holm(p_values: list[float]) -> list[float]:
    order = sorted(range(len(p_values)), key=lambda index: p_values[index])
    adjusted, running = [0.0] * len(p_values), 0.0
    for rank, index in enumerate(order):
        running = max(running, min(1.0, (len(p_values) - rank) * p_values[index]))
        adjusted[index] = running
    return adjusted


def estimate(frame: pd.DataFrame, domain: pd.Series, flag: str, weight: str = "pop_wt", among: pd.Series | None = None) -> dict | None:
    """Weighted share of `flag` within `domain` (and `among`), with a cluster-based standard error that keeps every sampled cluster."""
    weights = pd.to_numeric(frame[weight], errors="coerce").astype("float64")
    if weights.isna().any() or (weights <= 0).any() or not np.isfinite(weights).all():
        raise ValueError("Survey weights must be finite, positive, and present for every record")
    counted = (domain if among is None else domain & among).astype(float).to_numpy()
    base = weights.to_numpy() * counted
    total = float(base.sum())
    if total <= 0:
        return None
    hit = frame[flag].astype(float).to_numpy()
    p = float((base * hit).sum() / total)
    cluster_totals = pd.Series(base * (hit - p) / total).groupby(frame.clust.to_numpy()).sum()
    n = len(cluster_totals)
    if n < 2:
        return None
    se = math.sqrt(n / (n - 1) * float(((cluster_totals - cluster_totals.mean()) ** 2).sum()))
    return {"p": p, "se": se, "n": int(counted.sum()), "clusters": int((pd.Series(counted).groupby(frame.clust.to_numpy()).sum() > 0).sum())}


def shown(result: dict | None, unit: str = "households") -> dict:
    if result is None or result["n"] < MIN_SAMPLE:
        return {"pct": None, "status": f"Withheld: fewer than {MIN_SAMPLE} survey {unit}"}
    p, se = result["p"], result["se"]
    return {"pct": round(100 * p, 1), "se_points": round(100 * se, 2), "ci_lower": round(max(0.0, 100 * (p - 1.96 * se)), 1),
            "ci_upper": round(min(100.0, 100 * (p + 1.96 * se)), 1), unit: result["n"]}


def change(first: dict | None, second: dict | None) -> dict | None:
    if first is None or second is None or first["n"] < MIN_SAMPLE or second["n"] < MIN_SAMPLE:
        return None
    gap = second["p"] - first["p"]
    se = math.sqrt(first["se"] ** 2 + second["se"] ** 2)
    p_value = math.erfc(abs(gap / se) / math.sqrt(2)) if se > 0 else 1.0
    return {"points": round(100 * gap, 1), "ci_lower": round(100 * (gap - 1.96 * se), 1), "ci_upper": round(100 * (gap + 1.96 * se), 1), "p_value": p_value}


def label_changes(rows: list[dict], key: str, words: tuple[str, str] = ("improvement", "worsening"), family: str = "30 districts") -> None:
    """Three tiers, so one district in twenty cannot look like a finding by chance across 30 comparisons."""
    indexed = [row for row in rows if row.get(key)]
    adjusted = holm([row[key]["p_value"] for row in indexed])
    for row, holm_p in zip(indexed, adjusted):
        entry = row[key]
        entry["holm_adjusted_p"] = round(holm_p, 4)
        entry["unadjusted_significant"] = entry["p_value"] < 0.05
        direction = words[0] if entry["points"] < 0 else words[1]
        entry["label"] = (f"Clear {direction}" if holm_p < 0.05 else f"Possible {direction} (not robust to testing {family})" if entry["p_value"] < 0.05 else "No clear change")
        entry["p_value"] = round(entry["p_value"], 4)


def read_sav(archive: zipfile.ZipFile, member: str, **options) -> tuple[pd.DataFrame, object]:
    import pyreadstat

    with tempfile.TemporaryDirectory(prefix="nisr-trends-") as folder:
        path = Path(folder) / "table.sav"
        with archive.open(member) as source, path.open("wb") as target:
            while block := source.read(1024 * 1024):
                target.write(block)
        return pyreadstat.read_sav(str(path), encoding="latin1", **options)


def one_archive(root: Path, pattern: str) -> Path:
    found = list(Path(root).rglob(pattern))
    if len(found) != 1:
        raise ValueError(f"Expected one archive matching {pattern}; found {len(found)}")
    return found[0]


def code_labels(archive: zipfile.ZipFile) -> tuple[dict, dict]:
    """NISR's own district and province code labels, stored in the EICV4 household module of the same archive."""
    _, meta = read_sav(archive, "cs_s0_s5_household.sav", metadataonly=True)
    districts, provinces = meta.variable_value_labels.get("district"), meta.variable_value_labels.get("province")
    if not districts or len(districts) != 30 or not provinces or len(provinces) != 5:
        raise ValueError("EICV4 district or province code labels are missing")
    return {float(key): value for key, value in districts.items()}, {float(key): value for key, value in provinces.items()}


def eicv3_names(panel: pd.DataFrame, districts: dict) -> dict:
    """EICV3 uses its own district codes. The panel holds both codes for the same households, so the mapping is read from the data and must be one-to-one."""
    pairs = panel[["DISTRICT_eicv3", "district"]].dropna().astype({"DISTRICT_eicv3": str, "district": float}).drop_duplicates()
    if pairs.DISTRICT_eicv3.duplicated().any() or pairs.district.duplicated().any() or len(pairs) != 30:
        raise ValueError("EICV3 district codes do not map one-to-one onto EICV4 district codes in the panel")
    return {row.DISTRICT_eicv3: districts[row.district] for row in pairs.itertuples()}


def load_rounds(data_root: Path) -> dict:
    archive4_path = one_archive(data_root, "*EICV4 2013-2014 - Part 1.zip")
    archive5_path = one_archive(data_root, "*EICV5 2016-2017 - Part 1.zip")
    archive7_path = one_archive(data_root, "*EICV7 2023-2024.zip")
    panel_path = one_archive(data_root, "*Panel - Part 1.dta")
    panel = pd.read_stata(panel_path, convert_categoricals=False)
    with zipfile.ZipFile(archive4_path) as archive:
        districts, provinces = code_labels(archive)
        names3 = eicv3_names(panel, districts)
        frame3, _ = read_sav(archive, "EICV3-Poverty-file_Jan-2014.sav", usecols=["hhid", "clust", "district", "pop_wt", "poverty", "epoverty"], apply_value_formats=False)
        frame4, _ = read_sav(archive, "EICV4-Poverty-file.sav", usecols=["hhid", "clust", "district", "pop_wt", "pov", "epov"], apply_value_formats=False)
    frame3 = frame3.assign(district=frame3.district.astype(str).map(names3), poor=frame3.poverty == 100, extreme=frame3.epoverty == 100)
    frame4 = frame4.assign(district=frame4.district.astype(float).map(districts), poor=frame4.pov == 100, extreme=frame4.epov == 100)
    with zipfile.ZipFile(archive5_path) as archive:
        frame5 = pd.read_stata(io.BytesIO(archive.read("EICV5_Poverty_file.dta")), columns=["hhid", "clust", "district", "pop_wt", "pov_jan", "epov_jan"])
    frame5 = frame5.assign(district=frame5.district.astype(str), poor=frame5.pov_jan == "Poor", extreme=frame5.epov_jan == "Extreme-Poor")
    with zipfile.ZipFile(archive7_path) as archive:
        frame7 = pd.read_stata(io.BytesIO(archive.read("Cross_Section/CS_EICV7_poverty_file.dta")), columns=["hhid", "clust", "district", "pop_wt", "pov_jan", "epov_jan"])
    frame7 = frame7.assign(district=frame7.district.astype(str), poor=frame7.pov_jan == "Poor", extreme=frame7.epov_jan == "Extreme Poor")
    rounds = {"EICV3": frame3, "EICV4": frame4, "EICV5": frame5, "EICV7": frame7}
    for name, frame in rounds.items():
        if frame.hhid.duplicated().any() or frame.district.isna().any() or frame.clust.isna().any():
            raise ValueError(f"{name} poverty file has duplicate households or missing district or cluster fields")
        if set(frame.district) != set(districts.values()):
            raise ValueError(f"{name} district names do not match the 30 EICV4 district labels")
    return {"rounds": rounds, "panel": panel, "provinces": provinces, "districts": districts,
            "files": {"EICV3": f"{archive4_path.name}!/EICV3-Poverty-file_Jan-2014.sav", "EICV4": f"{archive4_path.name}!/EICV4-Poverty-file.sav",
                      "EICV5": f"{archive5_path.name}!/EICV5_Poverty_file.dta", "EICV7": f"{archive7_path.name}!/Cross_Section/CS_EICV7_poverty_file.dta",
                      "panel": panel_path.name}}


def national_checks(rounds: dict) -> list[dict]:
    checks = []
    for name in ("EICV3", "EICV4", "EICV5", "EICV7"):
        frame = rounds[name]
        value = round(100 * estimate(frame, pd.Series(True, index=frame.index), "poor")["p"], 1)
        published = PUBLISHED_NATIONAL[name]
        checks.append({"round": name, "calculated": value, "published": published, "matches": abs(value - published) < 0.05,
                       "note": ("The supplied EICV3 file is a January 2014 re-estimate and does not reproduce the originally published 2010/11 rate; treat EICV3 changes as indicative."
                                if name == "EICV3" and abs(value - published) >= 0.05 else None)})
    return checks


def old_series(rounds: dict, districts: list[str]) -> list[dict]:
    rows = []
    for name in districts:
        row = {"district": name}
        raw = {}
        for round_name, _ in ROUNDS:
            frame = rounds[round_name]
            raw[round_name] = estimate(frame, frame.district == name, "poor")
            row[round_name.lower()] = shown(raw[round_name])
        row["change_2010_11_to_2013_14"] = change(raw["EICV3"], raw["EICV4"])
        row["change_2013_14_to_2016_17"] = change(raw["EICV4"], raw["EICV5"])
        row["change_2010_11_to_2016_17"] = change(raw["EICV3"], raw["EICV5"])
        rows.append(row)
    for key in ("change_2010_11_to_2013_14", "change_2013_14_to_2016_17", "change_2010_11_to_2016_17"):
        label_changes(rows, key)
    return rows


def new_series(frame7: pd.DataFrame, districts: list[str]) -> list[dict]:
    rows = []
    for name in districts:
        result = estimate(frame7, frame7.district == name, "poor")
        modelled, published_actual, published_drop = PUBLISHED_NEW_SERIES[name]
        calculated = shown(result)
        rows.append({"district": name, "eicv5_modelled_pct": modelled, "eicv7": calculated, "eicv7_published_pct": published_actual,
                     "eicv7_matches_published": calculated["pct"] is not None and abs(calculated["pct"] - published_actual) < 0.05,
                     "decrease_points": published_drop, "decrease_check": abs(modelled - published_actual - published_drop) <= 0.15})
    ranked = sorted(rows, key=lambda row: row["decrease_points"])
    for rank, row in enumerate(ranked, start=1):
        row["smallest_decrease_rank"] = rank
    return rows


def panel_mobility(panel: pd.DataFrame, provinces: dict) -> dict:
    required = ["pov_EICV3", "pov_EICV4", "pop_wt", "POP_WT_eicv3", "clust", "province", "hhid", "caseid"]
    if any(name not in panel.columns for name in required) or panel.caseid.duplicated().any() or panel[required].isna().any().any():
        raise ValueError("Panel file is missing required fields, has duplicate person records or has blanks in them")
    if (panel.groupby("hhid")[["pov_EICV3", "pov_EICV4"]].nunique() > 1).any().any():
        raise ValueError("People in one panel household have different poverty status; poverty is a household measure")
    frame = panel.assign(poor3=panel.pov_EICV3 == 100, poor4=panel.pov_EICV4 == 1)
    frame["escaped"], frame["fell_back"] = frame.poor3 & ~frame.poor4, ~frame.poor3 & frame.poor4
    frame["never_poor"], frame["stayed_poor"] = ~frame.poor3 & ~frame.poor4, frame.poor3 & frame.poor4
    everyone = pd.Series(True, index=frame.index)

    frame["not_poor4"] = ~frame.poor4

    def rates(mask: pd.Series, weight: str = "pop_wt") -> dict:
        return {"escaped_poverty": shown(estimate(frame, mask, "not_poor4", weight, frame.poor3), "people"),
                "fell_into_poverty": shown(estimate(frame, mask, "poor4", weight, ~frame.poor3), "people")}

    overall = rates(everyone)
    sensitivity = rates(everyone, "POP_WT_eicv3")
    cells = {key: shown(estimate(frame, everyone, key), "people") for key in ("stayed_poor", "escaped", "fell_back", "never_poor")}
    by_province = []
    for code, name in sorted(provinces.items()):
        mask = frame.province.astype(float) == code
        if mask.sum():
            by_province.append({"province": name, "people": int(mask.sum()), **rates(mask),
                                "shares_of_people": {key: shown(estimate(frame, mask, key), "people") for key in ("stayed_poor", "escaped", "fell_back", "never_poor")}})
    return {"people": int(len(frame)), "households": int(frame.hhid.nunique()), "unit": "Each panel record is a person; poverty status is that of their household and results describe people.", "overall": overall, "shares_of_people": cells, "by_province": by_province,
            "weight_sensitivity": {"weights": "EICV3 population weights", "escaped_poverty_pct": sensitivity["escaped_poverty"].get("pct"), "fell_into_poverty_pct": sensitivity["fell_into_poverty"].get("pct")}}


def trend_analysis(data_root: Path, district: str) -> dict:
    loaded = load_rounds(data_root)
    rounds, names = loaded["rounds"], sorted(loaded["districts"].values())
    if district not in names:
        raise ValueError(f"District {district} is not in the poverty files")
    old = old_series(rounds, names)
    new = new_series(rounds["EICV7"], names)
    panel = panel_mobility(loaded["panel"], loaded["provinces"])
    selected_old = next(row for row in old if row["district"] == district)
    selected_new = next(row for row in new if row["district"] == district)
    counts = {}
    for key in ("change_2010_11_to_2013_14", "change_2013_14_to_2016_17", "change_2010_11_to_2016_17"):
        labels = [row[key]["label"] for row in old if row.get(key)]
        counts[key] = {"clear_improvement": labels.count("Clear improvement"), "clear_worsening": labels.count("Clear worsening"),
                       "possible_change": sum(label.startswith("Possible") for label in labels), "no_clear_change": labels.count("No clear change")}
    return {
        "status": "Completed", "district": district,
        "labels": {"old_series": "Aggregate comparison only: separate survey samples, same poverty method (EICV3 to EICV5).",
                   "new_series": "Aggregate comparison only: NISR's modelled 2016/17 estimate under the EICV7 method against EICV7 actual. The modelled values are NISR's published figures, not recalculated here.",
                   "panel": "Household-level linked: the same households interviewed in EICV3 and EICV4."},
        "selected": {"old_series": selected_old, "new_series": selected_new},
        "old_series": old, "new_series": new, "old_series_counts": counts, "panel": panel,
        "national_checks": national_checks(rounds),
        "validation": {"new_series_eicv7_matches_published": f"{sum(row['eicv7_matches_published'] for row in new)} of {len(new)} districts",
                       "published_decreases_consistent": f"{sum(row['decrease_check'] for row in new)} of {len(new)} districts"},
        "files": loaded["files"],
        "sources": {"published_new_series": POVERTY_PROFILE_URL, "published_national": MAIN_REPORT_URL},
        "limitations": ["EICV3, EICV4 and EICV5 samples are separate; district standard errors use sampled clusters only (the files carry no strata), and changes assume independent samples.",
                        "EICV5 to EICV7 cannot be compared directly because the poverty method changed; only NISR's modelled 2016/17 estimate is comparable and it has no district-level interval.",
                        "Panel transitions include measurement error in consumption, which overstates movement into and out of poverty; panel households may differ from all households through attrition.",
                        "These are descriptions of change, not explanations; nothing here shows what caused a district to improve or fall behind."],
    }
