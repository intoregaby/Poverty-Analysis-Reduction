"""Aggregate-only FinScope 2024 financial-access estimates and their district association with EICV7 poverty."""

from __future__ import annotations

import math
import re
from pathlib import Path

import numpy as np
import pandas as pd

from .reliability import grade

WEIGHT = "pop_wt"
CODES = [f"{number:02d}" for number in range(1, 12)]
STRANDS = ("banked", "other_formal", "informal_only", "excluded")
STRAND_LABELS = {"banked": "Banked", "other_formal": "Other formal (non-bank)", "informal_only": "Informal only", "excluded": "Excluded (no formal or informal product)"}
CORE_COLUMNS = ["a1", "a2", "a6", WEIGHT, "b1"] + [f"qf1_{code}" for code in CODES + ["12"]] + [f"qf4_{code}" for code in CODES]
OPTIONAL_COLUMNS = ["k1", "k3", "k2_1", "k3_1", "g11a", "g3a_03", "g3a_11", "g3a_13", "h3_05", "h3_09", "h3_10", "f5"]
OPTIONAL_PATTERNS = [r"qf3_\d\d$", r"uf1_\d\d_[12]$", r"i6_\d\d$", r"p2_\d\d_10$"]
MOBILE_MONEY_USERS = ["You are a registered mobile money user", "You are registered and have used it before but not any more",
                      "You are registered but you have never used mobile money services", "You use mobile money services, but you are not registered"]
BOOTSTRAP_DRAWS = 2000
MIN_DISTRICTS = 8

REPORT_URL = "https://statistics.gov.rw/sites/default/files/documents/2024-09/Rwanda-Finscope-2024-Report_compressed.pdf"
PUBLISHED_NATIONAL = {"banked": 22, "other_formal": 70, "informal_only": 4, "excluded": 4}
# FinScope Rwanda 2024 report, Figure 13 (percent of adults). Nyarugenge's excluded value is not legible in the report text.
PUBLISHED_DISTRICTS = {
    "Burera": (11, 87, 2, 1), "Nyarugenge": (59, 40, 1, None), "Nyamagabe": (11, 84, 4, 1), "Gatsibo": (23, 73, 3, 1), "Musanze": (24, 71, 5, 1),
    "Gasabo": (51, 46, 2, 1), "Bugesera": (23, 71, 5, 2), "Kicukiro": (62, 35, 2, 2), "Muhanga": (17, 76, 5, 2), "Rwamagana": (27, 68, 3, 2),
    "Nyagatare": (17, 77, 4, 3), "Ruhango": (22, 70, 5, 3), "Kamonyi": (16, 76, 4, 3), "Kirehe": (7, 86, 5, 3), "Karongi": (8, 83, 6, 3),
    "Rubavu": (22, 71, 4, 3), "Gisagara": (10, 77, 9, 4), "Nyanza": (17, 74, 4, 4), "Kayonza": (11, 76, 8, 5), "Huye": (15, 73, 6, 6),
    "Nyamasheke": (13, 78, 3, 6), "Rusizi": (22, 68, 5, 6), "Rutsiro": (9, 78, 6, 6), "Gicumbi": (8, 75, 11, 7), "Ngororero": (10, 78, 5, 7),
    "Gakenke": (18, 69, 5, 8), "Nyabihu": (13, 74, 5, 8), "Rulindo": (13, 74, 4, 8), "Ngoma": (9, 77, 6, 8), "Nyaruguru": (6, 78, 5, 10),
}


def wanted_columns(available: list[str]) -> list[str]:
    extra = [name for name in available if any(re.match(pattern, name) for pattern in OPTIONAL_PATTERNS)]
    return list(dict.fromkeys(CORE_COLUMNS + [name for name in OPTIONAL_COLUMNS if name in available] + extra))


def load_finscope(data_root: Path) -> tuple[Path, pd.DataFrame]:
    files = list(Path(data_root).rglob("*FinScope 2024*.dta"))
    if len(files) != 1:
        raise ValueError(f"Expected one FinScope 2024 DTA file; found {len(files)}")
    import pyreadstat

    _, meta = pyreadstat.read_dta(str(files[0]), metadataonly=True)
    columns = wanted_columns(list(meta.column_names))
    try:
        frame, _ = pyreadstat.read_dta(str(files[0]), usecols=columns, apply_value_formats=True, formats_as_category=False)
    except UnicodeDecodeError:
        frame, _ = pyreadstat.read_dta(str(files[0]), usecols=columns, apply_value_formats=True, formats_as_category=False, encoding="latin1")
    return files[0], frame


def validate(frame: pd.DataFrame) -> None:
    missing = [name for name in CORE_COLUMNS if name not in frame.columns]
    if missing:
        raise ValueError(f"FinScope file is missing required columns: {', '.join(missing)}")
    weights = pd.to_numeric(frame[WEIGHT], errors="coerce")
    if weights.isna().any() or not np.isfinite(weights).all() or (weights <= 0).any():
        raise ValueError("FinScope weights must be finite, positive, and present for every respondent")
    if frame.a2.isna().any() or frame.a2.nunique() < 2:
        raise ValueError("FinScope district labels are missing or too few to analyze")
    for code in CODES:
        ever, current = frame[f"qf1_{code}"], frame[f"qf4_{code}"]
        if not ever.isin(["Yes", "No"]).all() or not current.dropna().isin(["Yes", "No"]).all():
            raise ValueError(f"FinScope service {code} has unrecognized answers")
        if (current.notna() & (ever != "Yes")).any():
            raise ValueError(f"FinScope service {code} has current-use answers for people who never used it")


def yes(frame: pd.DataFrame, *columns: str) -> pd.Series:
    """True where any listed column answers Yes. Absent columns and blank follow-ups count as no."""
    found = [(frame[name] == "Yes") for name in columns if name in frame.columns]
    return pd.concat(found, axis=1).any(axis=1) if found else pd.Series(False, index=frame.index)


def matching(frame: pd.DataFrame, pattern: str) -> list[str]:
    return [name for name in frame.columns if re.match(pattern, name)]


def service_flags(frame: pd.DataFrame) -> dict[str, pd.Series]:
    """Who has or uses each kind of provider, including someone else's or a group account, as the report's framework counts them."""
    bank = yes(frame, "k1", "k3", "qf3_01", "qf3_02", "qf4_01", "qf4_02", "uf1_01_1", "uf1_01_2", "uf1_02_1", "uf1_02_2")
    mobile = frame["f5"].isin(MOBILE_MONEY_USERS) if "f5" in frame.columns else pd.Series(False, index=frame.index)
    mobile = mobile | yes(frame, "qf3_05", "qf4_05", "uf1_05_1", "uf1_05_2", "g3a_03", "h3_05", *matching(frame, r"p2_\d\d_10$"))
    savings_credit = yes(frame, "k3_1", "qf3_06", "qf4_06", "uf1_06_1", "uf1_06_2", "k2_1", "qf3_03", "qf4_03", "qf3_04", "qf4_04", "uf1_03_1", "uf1_03_2")
    pension = yes(frame, "g11a", "qf3_08", "qf4_08", "uf1_08_1", "uf1_08_2", "qf3_09", "qf4_09", "uf1_09_1", "uf1_09_2", "i6_13", "i6_14", "i6_15")
    private_insurance = yes(frame, "qf3_07", "qf4_07", "uf1_07_1", "uf1_07_2", *[name for name in matching(frame, r"i6_\d\d$") if name not in ("i6_13", "i6_14", "i6_15")])
    informal = yes(frame, "qf3_10", "qf3_11", "qf4_10", "qf4_11", "uf1_10_1", "uf1_10_2", "uf1_11_1", "uf1_11_2", "g3a_11", "g3a_13", "h3_09", "h3_10")
    return {"bank": bank, "mobile_money": mobile, "other_formal": mobile | savings_credit | pension | private_insurance, "informal": informal}


def assign_strand(frame: pd.DataFrame) -> pd.Series:
    """Mutually exclusive access strand. Community and medical health insurance (Mutuelle de Santé) is deliberately not counted:
    counting it would leave 1.5% of 2020 adults excluded against NISR's own 7.4%, so NISR does not count it either."""
    flags = service_flags(frame)
    return pd.Series(np.select([flags["bank"], flags["other_formal"], flags["informal"]], ["banked", "other_formal", "informal_only"], default="excluded"), index=frame.index)


def share(weights: pd.Series, hit: pd.Series) -> dict:
    """Weighted share with a weights-only interval. Clustering is not in the supplied file, so it is ignored."""
    total = float(weights.sum())
    p = float((weights * hit.astype(float)).sum() / total)
    effective = total ** 2 / float((weights ** 2).sum())
    return {"p": p, "se": math.sqrt(p * (1 - p) / effective), "n": int(len(weights))}


def entry(result: dict) -> dict:
    p, se = result["p"], result["se"]
    return {"pct": round(100 * p, 1), "se_points": round(100 * se, 2), "ci_lower": round(max(0.0, 100 * (p - 1.96 * se)), 1),
            "ci_upper": round(min(100.0, 100 * (p + 1.96 * se)), 1), "grade": grade(p, se, result["n"])}


def group_estimates(frame: pd.DataFrame, strand: pd.Series, mask: pd.Series) -> dict:
    weights = pd.to_numeric(frame.loc[mask, WEIGHT]).astype("float64")
    group = strand[mask]
    return {"sample_adults": int(mask.sum()),
            "strands": {key: entry(share(weights, group == key)) for key in STRANDS},
            "any_formal": entry(share(weights, group.isin(["banked", "other_formal"]))),
            "mobile_money": entry(share(weights, service_flags(frame)["mobile_money"][mask]))}


def spearman(first: pd.Series, second: pd.Series) -> float:
    """Rank correlation without scipy: Pearson correlation of average ranks."""
    return float(pd.Series(np.asarray(first, dtype=float)).rank().corr(pd.Series(np.asarray(second, dtype=float)).rank()))


def rank_link(first: pd.Series, second: pd.Series) -> dict:
    """Spearman rank correlation across areas with a bootstrap 95% interval over areas."""
    first, second = pd.Series(np.asarray(first, dtype=float)), pd.Series(np.asarray(second, dtype=float))
    generator = np.random.default_rng(0)
    draws = []
    for _ in range(BOOTSTRAP_DRAWS):
        index = generator.integers(0, len(first), len(first))
        a, b = first.iloc[index], second.iloc[index]
        if a.nunique() > 1 and b.nunique() > 1:
            draws.append(spearman(a, b))
    interval = [round(float(np.percentile(draws, 2.5)), 2), round(float(np.percentile(draws, 97.5)), 2)] if len(draws) > 100 else None
    return {"spearman_rho": round(spearman(first, second), 2), "bootstrap_95_interval": interval}


def association(rows: list[dict]) -> dict:
    table = pd.DataFrame(rows)
    excluded = table.published_excluded_pct.where(table.published_excluded_pct.notna(), table.excluded_pct)
    return {"districts_compared": len(table), **rank_link(excluded, table.poverty_pct),
            "reading": "Descriptive rank correlation across districts between NISR's published excluded share and the EICV7 poverty rate. "
                       "It is an association between area averages from two separate surveys, not a household link and not evidence of cause."}


def reconcile(national: dict, district_rows: list[dict]) -> dict:
    """Compare estimates with the published FinScope 2024 report. Differences are reported, never hidden."""
    result = {"source": REPORT_URL, "national": {}, "districts": None}
    for key in STRANDS:
        estimated = national["strands"][key]["pct"]
        result["national"][key] = {"published": PUBLISHED_NATIONAL[key], "estimated": estimated, "difference_points": round(estimated - PUBLISHED_NATIONAL[key], 1)}
    compared = [row for row in district_rows if row["district"] in PUBLISHED_DISTRICTS]
    if compared:
        gaps = {key: [] for key in STRANDS}
        named = {key: [] for key in STRANDS}
        for row in compared:
            for position, key in enumerate(STRANDS):
                published = PUBLISHED_DISTRICTS[row["district"]][position]
                if published is not None:
                    gaps[key].append(abs(row[f"{key}_pct"] - published))
                    named[key].append((abs(row[f"{key}_pct"] - published), row["district"]))
        result["districts"] = {"compared": len(compared),
                               "mean_absolute_difference_points": {key: round(float(np.mean(values)), 1) for key, values in gaps.items() if values},
                               "largest_difference": {key: {"points": round(max(values)[0], 1), "district": max(values)[1]} for key, values in named.items() if values}}
    worst = (result["districts"] or {}).get("largest_difference", {}).get("excluded")
    mean = (result["districts"] or {}).get("mean_absolute_difference_points", {}).get("excluded")
    result["reading"] = ("These estimates rebuild the access strand from questionnaire answers; NISR's own strand variable is not in the supplied 2024 file. "
                         + (f"District estimates of the excluded share differ from NISR's published figures by {mean} points on average and by up to {worst['points']} points ({worst['district']}). " if worst else "")
                         + "The 2020 survey, where NISR's strand is available, shows the same rules reproduce the national formal share but not the split of the rest, because NISR treats some products, such as community health insurance, in ways the questionnaire cannot reveal. "
                           "Use NISR's published district figures as the official ones and this rebuild only as an approximate cross-check.")
    return result


def finscope_estimates(frame: pd.DataFrame, district: str, poverty_by_district: dict[str, float]) -> dict:
    validate(frame)
    strand = assign_strand(frame)
    names = frame.a2.astype(str).str.strip()
    lookup = {name.casefold(): name for name in names.unique()}
    if district.strip().casefold() not in lookup:
        raise ValueError(f"District {district} is not present in FinScope 2024")
    poverty = {str(key).strip().casefold(): value for key, value in poverty_by_district.items()}
    rows, unmatched, every_district = [], [], []
    for name in sorted(names.unique()):
        estimate = group_estimates(frame, strand, names == name)
        published = PUBLISHED_DISTRICTS.get(name)
        row = {"district": name, "sample_adults": estimate["sample_adults"], "poverty_pct": poverty.get(name.casefold()),
               "published_excluded_pct": None if not published else (published[3] if published[3] is not None else round(100 - published[0] - published[1] - published[2], 1)),
               "mobile_money_pct": estimate["mobile_money"]["pct"], **{f"{key}_pct": estimate["strands"][key]["pct"] for key in STRANDS}}
        every_district.append(row)
        if row["poverty_pct"] is None:
            unmatched.append(name)
        else:
            rows.append(row)
    selected_name = lookup[district.strip().casefold()]
    selected = group_estimates(frame, strand, names == selected_name)
    national = group_estimates(frame, strand, pd.Series(True, index=frame.index))
    ranked = sorted(rows, key=lambda row: -(row["published_excluded_pct"] if row["published_excluded_pct"] is not None else row["excluded_pct"])) if rows else []
    rank = next((index + 1 for index, row in enumerate(ranked) if row["district"] == selected_name), None)
    result = {
        "status": "Completed", "survey": "FinScope Rwanda 2024", "district": selected_name,
        "selected": selected, "national": national,
        "excluded_rank": {"rank": rank, "of": len(ranked), "note": "1 = highest excluded share among matched districts, using NISR's published district figure"} if rank else None,
        "all_districts": rows, "unmatched_districts": unmatched,
        "reconciliation_with_published": reconcile(national, every_district),
        "published_district": None if selected_name not in PUBLISHED_DISTRICTS else dict(zip(("banked", "other_formal", "informal_only", "excluded"), (
            PUBLISHED_DISTRICTS[selected_name][0], PUBLISHED_DISTRICTS[selected_name][1], PUBLISHED_DISTRICTS[selected_name][2],
            PUBLISHED_DISTRICTS[selected_name][3] if PUBLISHED_DISTRICTS[selected_name][3] is not None else round(100 - sum(PUBLISHED_DISTRICTS[selected_name][:3]), 1)))),
        "published_national": PUBLISHED_NATIONAL,
        "definitions": {"unit": "Adults aged 16+, weighted with pop_wt.",
                        "strands": STRAND_LABELS,
                        "rule": "Follows the report's framework: a person is served if they have or use a product, including someone else's or a group account. Banked: a bank account or use of a commercial or digital bank. Other formal: mobile money (registered or used), Umurenge SACCO, microfinance or NDFI, pension or EJOHEZA, or private insurance, but not banked. Informal only: only savings groups, tontines, village associations or community lenders. Excluded: none of these. Mutually exclusive, in that order.",
                        "health_insurance": "Community and medical health insurance (such as Mutuelle de Santé) is not counted. Counting it would leave 1.5% of adults excluded in 2020 against NISR's own 7.4%, so NISR does not count it.",
                        "uncertainty": "Weights-only effective-sample-size intervals; the supplied file has no cluster or strata columns, so clustering is ignored and intervals are likely too narrow."},
        "limitations": ["This is a reconstruction of the access strand from questionnaire answers. NISR's own 2024 strand variable is not in the supplied file, so district figures can differ from the published report by many points (see reconciliation_with_published); NISR's published district figures are the official ones.",
                        "FinScope is not record-linked to EICV7; the comparison is between district averages from separate surveys.",
                        "District samples are small (hundreds of adults); check the reliability grade before using a district figure."],
        "reconciled_with_published": "Approximate",
    }
    if len(rows) >= MIN_DISTRICTS:
        result["association_with_poverty"] = association(rows)
    else:
        result["association_with_poverty"] = {"status": "Not estimated", "reason": f"Only {len(rows)} districts matched EICV7 names; at least {MIN_DISTRICTS} are required."}
    return result


def finscope_access(data_root: Path, district: str, poverty_by_district: dict[str, float]) -> dict:
    path, frame = load_finscope(data_root)
    result = finscope_estimates(frame, district, poverty_by_district)
    result["source_file"] = str(path)
    return result
