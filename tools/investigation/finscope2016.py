"""Aggregate-only FinScope 2016 access strand (NISR's own derived variable) and the 2016 to 2020 to 2024 series.

The 2016 district field is only a number within each province and has no labels, so 2016 is used nationally and by province.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from . import finance, finscope2020, trends

WEIGHT = "Individuals_Weight"
STRAND_VARIABLE = "AS_revised"
STRAND_NAMES = {"Banked": "banked", "Other formal (non-bank)": "other_formal", "Informal only": "informal_only", "Excluded": "excluded"}
STRANDS = tuple(STRAND_NAMES.values())
COLUMNS = ["Individuals_Weight", "A1", "A2", "AS_revised", "Banked_popultaion", "other_formal_non_bank", "Informal_revised"]
FILE_PATTERN = "*FinScope 2016*.sav"
PROVINCES = ("Eastern", "Kigali City", "Northern", "Southern", "Western")
SERIES_MEASURES = ("banked", "other_formal", "informal_only", "excluded", "formal")
# FinScope Rwanda 2016 as reported at its launch: 89% included, 26% banked, 42% other formal, 11% excluded (28% excluded in 2012). Informal only is the remainder.
PUBLISHED_2016 = {"banked": 26, "other_formal": 42, "informal_only": 21, "excluded": 11, "formal": 68}
SOURCES_2016 = {"launch_report": "https://nextbillion.net/news/survey-over-89-percent-of-rwandans-have-access-to-finance",
                "banked_and_formal": "https://tralac.org/news/article/9196-rwanda-financial-inclusion-up.html",
                "microdata": "https://microdata.statistics.gov.rw/index.php/catalog/71"}


def load_2016(data_root: Path) -> tuple[Path, pd.DataFrame]:
    files = list(Path(data_root).rglob(FILE_PATTERN))
    if len(files) != 1:
        raise ValueError(f"Expected one FinScope 2016 file; found {len(files)}")
    import pyreadstat

    try:
        frame, _ = pyreadstat.read_sav(str(files[0]), usecols=COLUMNS, apply_value_formats=True, formats_as_category=False)
    except UnicodeDecodeError:
        frame, _ = pyreadstat.read_sav(str(files[0]), usecols=COLUMNS, apply_value_formats=True, formats_as_category=False, encoding="latin1")
    return files[0], frame


def validate(frame: pd.DataFrame) -> None:
    missing = [name for name in COLUMNS if name not in frame.columns]
    if missing:
        raise ValueError(f"FinScope 2016 file is missing required columns: {', '.join(missing)}")
    weights = pd.to_numeric(frame[WEIGHT], errors="coerce")
    if weights.isna().any() or not np.isfinite(weights).all() or (weights <= 0).any():
        raise ValueError("FinScope 2016 weights must be finite, positive, and present for every respondent")
    if frame.A1.isna().any() or set(frame.A1.astype(str).str.replace(" Province", "", regex=False)) != set(PROVINCES):
        raise ValueError("FinScope 2016 should cover exactly the five provinces")
    if frame[STRAND_VARIABLE].isna().any() or not set(frame[STRAND_VARIABLE].unique()) <= set(STRAND_NAMES):
        raise ValueError("FinScope 2016 access strand has missing or unrecognized values")
    banked = frame[STRAND_VARIABLE] == "Banked"
    if (frame.Banked_popultaion.notna() != banked).any():
        raise ValueError("FinScope 2016 banked component disagrees with the access strand")
    excluded = frame[STRAND_VARIABLE] == "Excluded"
    uses = banked | frame.other_formal_non_bank.notna() | frame.Informal_revised.notna()
    if (excluded & uses).any() or (~excluded & ~uses).any():
        raise ValueError("FinScope 2016 access strand disagrees with its formal and informal components")


def prepare(frame: pd.DataFrame) -> pd.DataFrame:
    prepared = frame.assign(province=frame.A1.astype(str).str.replace(" Province", "", regex=False).str.strip())
    for label, name in STRAND_NAMES.items():
        prepared[name] = prepared[STRAND_VARIABLE] == label
    prepared["formal"] = prepared.banked | prepared.other_formal
    return prepared


def estimate(frame: pd.DataFrame, domain: pd.Series, measure: str) -> dict:
    """Weights-only share; the 2016 file has no cluster field."""
    weights = pd.to_numeric(frame.loc[domain, WEIGHT]).astype("float64")
    return finance.share(weights, frame.loc[domain, measure])


def row(frame: pd.DataFrame, domain: pd.Series) -> dict:
    return {measure: estimate(frame, domain, measure) for measure in SERIES_MEASURES}


def pct(result: dict) -> float:
    return round(100 * result["p"], 1)


def national_checks(national: dict) -> list[dict]:
    checks = []
    for key in SERIES_MEASURES:
        calculated, published = pct(national[key]), PUBLISHED_2016[key]
        checks.append({"measure": key, "calculated": calculated, "published": published, "difference_points": round(calculated - published, 1), "ok": abs(calculated - published) <= 1.0})
    return checks


def province_changes(frame2016: pd.DataFrame, frame2020: pd.DataFrame) -> list[dict]:
    rows = []
    for name in PROVINCES:
        first = row(frame2016, frame2016.province == name)
        second = finscope2020.raw_row(frame2020, frame2020.province == name)
        item = {"province": name, "sample_adults_2016": int((frame2016.province == name).sum()), "sample_adults_2020": int((frame2020.province == name).sum())}
        for measure in SERIES_MEASURES:
            item[measure] = {"y2016_pct": pct(first[measure]), "y2020_pct": round(100 * second[measure]["p"], 1), "change": trends.change(first[measure], second[measure])}
        rows.append(item)
    for measure in SERIES_MEASURES:
        wrapper = [{"change": item[measure]["change"]} for item in rows]
        trends.label_changes(wrapper, "change", finscope2020.WORDS, "5 provinces")
        for item, changed in zip(rows, wrapper):
            item[measure]["change"] = changed["change"]
    return rows


def financial_series(data_root: Path) -> dict:
    path16, raw16 = load_2016(data_root)
    validate(raw16)
    frame16 = prepare(raw16)
    path20, raw20 = finscope2020.load_2020(data_root)
    finscope2020.validate(raw20)
    frame20 = finscope2020.prepare(raw20)
    everyone16 = pd.Series(True, index=frame16.index)
    national16 = row(frame16, everyone16)
    national20 = finscope2020.raw_row(frame20, pd.Series(True, index=frame20.index))
    checks = national_checks(national16)
    provinces = province_changes(frame16, frame20)
    series = []
    for year, label, values, definition in (
        ("2016", "2016", {key: pct(national16[key]) for key in SERIES_MEASURES}, "NISR's own strand from the microdata (original definition)"),
        ("2020", "2020", {key: round(100 * national20[key]["p"], 1) for key in SERIES_MEASURES}, "NISR's own strand from the microdata (original definition)"),
        ("2020r", "2020 (restated)", finscope2020.PUBLISHED_2020_RESTATED, "NISR's 2024 report, restated on the 2024 definition"),
        ("2024", "2024", finscope2020.PUBLISHED_2024, "NISR's 2024 report"),
    ):
        series.append({"key": year, "label": label, "definition": definition, **values})
    return {
        "status": "Completed", "survey": "FinScope Rwanda 2016, 2020 and 2024",
        "labels": {"national": "Aggregate comparison only: separate surveys, national shares of adults.",
                   "provinces": "Aggregate comparison only: province shares in 2016 and 2020 from NISR's own strand under the same original definition."},
        "series": series, "provinces": provinces, "checks": checks, "files": {"2016": path16.name, "2020": path20.name}, "sources": SOURCES_2016,
        "limitations": ["Banked changed definition between the 2020 and 2024 reports (36% originally in 2020, restated to 22%). 2016 and 2020 share the original definition, so banked can be compared between them but not with 2024.",
                        "The 2016 district field is only a number within each province and has no labels, so 2016 is used nationally and by province, not by district.",
                        "The 2016 file has no cluster field, so 2016 intervals use weights only and are likely too narrow.",
                        "The 2016 excluded share (11.9%) is about one point above the 11% NISR reported; the file's `AS_revised` strand is the closest of the three strand variables it holds.",
                        "FinScope 2012 holds no NISR strand variable and has not been added yet."],
    }
