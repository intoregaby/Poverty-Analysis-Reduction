"""Aggregate-only FinScope 2020 access strand (NISR's own derived variable) and its comparison with FinScope 2024."""

from __future__ import annotations

import math
import tempfile
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd

from . import finance, trends
from .catalog import extract_member
from .used_columns import FINSCOPE_2020_CHECK

WEIGHT = "Individuals_Weight"
FILE_PATTERN = "*FinScope 2020*.zip"
STRAND_NAMES = {"Banked": "banked", "Other formal non-bank": "other_formal", "Informal ONLY": "informal_only", "Excluded": "excluded"}
STRANDS = tuple(STRAND_NAMES.values())
COLUMNS = ["Individuals_Weight", "NUMVILL", "A1", "A2", "A3", "B1", "FAS", "Banked", "Other_formal", "Informal", "FM4", "K1_2_1"]
REGISTERED_MOBILE_MONEY = finance.MOBILE_MONEY_USERS[:3]
MEASURES = (*STRANDS, "formal", "mobile_money", "bank_account")
TREND_MEASURES = ("excluded", "informal_only", "formal", "mobile_money")
WORDS = ("fall", "rise")
REPORT_2020_URL = "https://microdata.statistics.gov.rw/index.php/catalog/89"
PRESS_2020_URL = "https://www.ktpress.rw/2020/05/93-rwandans-are-financially-included-finscope-survey-2020/"

# FinScope Rwanda 2024 report, Figure 5: the 2020 strand restated on the 2024 definitions, and the 2024 strand.
PUBLISHED_2020_RESTATED = {"banked": 22, "other_formal": 55, "informal_only": 16, "excluded": 7, "formal": 77}
PUBLISHED_2024 = {**finance.PUBLISHED_NATIONAL, "formal": 92}
# The same report, section 2.1: registered mobile wallet holders.
PUBLISHED_MOBILE_WALLET = {"2020": 60, "2024": 77}
# The 2020 survey launch reported 36% banked; that is the original definition, which also counts some SACCO, microfinance and mobile users.
PUBLISHED_2020_ORIGINAL_BANKED = 36


def load_2020(data_root: Path) -> tuple[Path, pd.DataFrame]:
    archives = list(Path(data_root).rglob(FILE_PATTERN))
    if len(archives) != 1:
        raise ValueError(f"Expected one FinScope 2020 archive; found {len(archives)}")
    import pyreadstat

    with zipfile.ZipFile(archives[0]) as archive:
        members = [item for item in archive.infolist() if item.filename.endswith(".dta") and not item.filename.startswith("__MACOSX/") and not Path(item.filename).name.startswith("._")]
        if len(members) != 1:
            raise ValueError(f"Expected one FinScope 2020 DTA member; found {len(members)}")
        with tempfile.TemporaryDirectory(prefix="nisr-fs20-") as folder:
            target = Path(folder) / "finscope2020.dta"
            extract_member(archives[0], archive, members[0], target)
            _, meta = pyreadstat.read_dta(str(target), metadataonly=True)
            columns = COLUMNS + [name for name in meta.column_names if name.lower() in FINSCOPE_2020_CHECK]
            try:
                frame, _ = pyreadstat.read_dta(str(target), usecols=columns, apply_value_formats=True, formats_as_category=False)
            except UnicodeDecodeError:
                frame, _ = pyreadstat.read_dta(str(target), usecols=columns, apply_value_formats=True, formats_as_category=False, encoding="latin1")
    return archives[0], frame


def validate(frame: pd.DataFrame) -> None:
    missing = [name for name in COLUMNS if name not in frame.columns]
    if missing:
        raise ValueError(f"FinScope 2020 file is missing required columns: {', '.join(missing)}")
    weights = pd.to_numeric(frame[WEIGHT], errors="coerce")
    if weights.isna().any() or not np.isfinite(weights).all() or (weights <= 0).any():
        raise ValueError("FinScope 2020 weights must be finite, positive, and present for every respondent")
    if frame.NUMVILL.isna().any() or frame.A2.isna().any() or frame.A1.isna().any():
        raise ValueError("FinScope 2020 village (PSU), district or province fields have blanks")
    if frame.A2.nunique() != 30 or frame.A1.nunique() != 5:
        raise ValueError("FinScope 2020 should cover 30 districts and 5 provinces")
    if frame.FAS.isna().any() or not set(frame.FAS.unique()) <= set(STRAND_NAMES):
        raise ValueError("FinScope 2020 access strand has missing or unrecognized values")
    if (pd.to_numeric(frame.B1, errors="coerce") < 16).any():
        raise ValueError("FinScope 2020 respondents should all be aged 16 or over")
    excluded = frame.FAS == "Excluded"
    uses_something = frame.Banked.notna() | frame.Other_formal.notna() | frame.Informal.notna()
    if (excluded & uses_something).any() or (~excluded & ~uses_something).any():
        raise ValueError("FinScope 2020 access strand disagrees with its banked, other formal and informal components")
    if (frame.Banked.notna() != (frame.FAS == "Banked")).any():
        raise ValueError("FinScope 2020 banked component disagrees with the access strand")


def prepare(frame: pd.DataFrame) -> pd.DataFrame:
    prepared = frame.assign(clust=frame.NUMVILL.astype(str), district=frame.A2.astype(str).str.strip(), province=frame.A1.astype(str).str.replace(" Province", "", regex=False).str.strip())
    for label, name in STRAND_NAMES.items():
        prepared[name] = prepared.FAS == label
    prepared["formal"] = prepared.banked | prepared.other_formal
    prepared["mobile_money"] = prepared.FM4.isin(REGISTERED_MOBILE_MONEY)
    prepared["bank_account"] = prepared.K1_2_1.astype(str).str.strip().str.lower().eq("yes")
    return prepared


def _yes(frame: pd.DataFrame, *columns: str) -> pd.Series:
    found = [frame[name].astype(str).str.strip().str.lower().eq("yes") for name in columns if name in frame.columns]
    return pd.concat(found, axis=1).any(axis=1) if found else pd.Series(False, index=frame.index)


def _belongs(frame: pd.DataFrame, *columns: str) -> pd.Series:
    found = [frame[name].astype(str).str.startswith("Belong") for name in columns if name in frame.columns]
    return pd.concat(found, axis=1).any(axis=1) if found else pd.Series(False, index=frame.index)


def reconstruct(frame: pd.DataFrame) -> pd.Series:
    """The 2024 module's rules applied to the 2020 questionnaire: bank, then other formal, then informal only, then excluded.
    Mutuelle de Santé is not counted."""
    bank = _yes(frame, "K1_2_1", "KB2", "QF4_01", "QF5_01") | _belongs(frame, "UF1_01")
    mobile = frame.FM4.isin(finance.MOBILE_MONEY_USERS) | _yes(frame, "QF4_04", "QF5_04", "G3A_03", "H4A_04") | _belongs(frame, "UF1_04")
    if "P2_10" in frame.columns:
        mobile = mobile | frame.P2_10.astype(str).str.contains("mobile", case=False)
    savings_credit = _yes(frame, "QF4_02", "QF5_02", "QF4_05", "QF5_05", "H4A_02", "H4A_03", "H4A_05", "G3A_02", "G3A_08") | _belongs(frame, "UF1_02", "UF1_03", "UF1_05")
    pension = _yes(frame, "QF4_07", "QF5_07", "G3A_05", "G3A_06", "G3A_07", "G3A_10", "I4_06", "I4_07", "GS9") | _belongs(frame, "UF1_07")
    insurance = _yes(frame, "QF4_06", "QF5_06", "I4_01", "I4_02", "I4_03", "I4_04", "I4_05", "I4_08", "I4_09", "II3A") | _belongs(frame, "UF1_06")
    informal = _yes(frame, "QF4_08", "QF4_09", "QF5_08", "QF5_09", "G3A_11", "G3A_12", "G3A_13", "H4A_08", "H4A_09") | _belongs(frame, "UF1_08", "UF1_09")
    other = mobile | savings_credit | pension | insurance
    return pd.Series(np.select([bank, other, informal], ["banked", "other_formal", "informal_only"], default="excluded"), index=frame.index)


def reconstruction_check(frame: pd.DataFrame) -> dict:
    """How well the 2024 module's rules reproduce NISR's own 2020 strand. 2020 is the one year where both are available."""
    mine, weights = reconstruct(frame), pd.to_numeric(frame[WEIGHT], errors="coerce").astype("float64")
    def share(flag: pd.Series) -> float:
        return round(100 * float((weights * flag).sum() / weights.sum()), 1)
    out = {"nisr": {}, "rules": {}, "difference_points": {}}
    for key in ("formal", "informal_only", "excluded"):
        out["nisr"][key] = share(frame[key])
        out["rules"][key] = share(mine.isin(["banked", "other_formal"]) if key == "formal" else mine == key)
        out["difference_points"][key] = round(out["rules"][key] - out["nisr"][key], 1)
    out["reading"] = ("The same rules used for 2024 reproduce NISR's 2020 formal share and over-count exclusion by the points shown, because the questionnaire cannot see everything NISR counts. "
                      "Read the 2024 excluded estimate from the microdata as an upper bound; NISR's published figure is the official one.")
    return out


def measure_row(frame: pd.DataFrame, domain: pd.Series) -> dict:
    return {measure: trends.shown(trends.estimate(frame, domain, measure, WEIGHT), "adults") for measure in MEASURES}


def raw_row(frame: pd.DataFrame, domain: pd.Series) -> dict:
    return {measure: trends.estimate(frame, domain, measure, WEIGHT) for measure in MEASURES}


def effective_n(weights: pd.Series) -> float:
    values = pd.to_numeric(weights, errors="coerce").astype("float64")
    return float(values.sum() ** 2 / (values ** 2).sum())


def published_2024(name: str, n_eff: float) -> dict:
    """NISR's published, rounded 2024 district figures with an approximate standard error: rounding plus weights-only sampling error."""
    banked, other, informal, excluded = finance.PUBLISHED_DISTRICTS[name]
    values = {"informal_only": informal, "excluded": excluded if excluded is not None else round(100 - banked - other - informal, 1), "formal": banked + other}
    out = {}
    for measure, value in values.items():
        p = value / 100
        out[measure] = {"p": p, "se": math.sqrt(p * (1 - p) / n_eff + (0.5 / math.sqrt(3) / 100) ** 2), "n": int(round(n_eff)), "published": value}
    return out


def trend_rows(frame2020: pd.DataFrame, frame2024: pd.DataFrame, names: list[str]) -> list[dict]:
    weights24 = pd.to_numeric(frame2024.pop_wt, errors="coerce").astype("float64")
    registered24 = frame2024.f5.isin(REGISTERED_MOBILE_MONEY)
    district24 = frame2024.a2.astype(str).str.strip()
    rows = []
    for name in names:
        domain = frame2020.district == name
        raw20 = raw_row(frame2020, domain)
        mask24 = district24 == name
        n_eff = effective_n(weights24[mask24])
        pub = published_2024(name, n_eff)
        mobile24 = finance.share(weights24[mask24], registered24[mask24])
        later = {**pub, "mobile_money": {"p": mobile24["p"], "se": mobile24["se"], "n": mobile24["n"], "published": None}}
        row = {"district": name, "sample_adults_2020": int(domain.sum()), "sample_adults_2024": int(mask24.sum())}
        for measure in TREND_MEASURES:
            first, second = raw20[measure], later[measure]
            row[measure] = {"y2020": trends.shown(first, "adults"), "y2024_pct": round(100 * second["p"], 1), "published_2024_pct": second["published"],
                            "change": trends.change(first, second)}
        rows.append(row)
    for measure in TREND_MEASURES:
        wrapper = [{"change": row[measure]["change"]} for row in rows]
        trends.label_changes(wrapper, "change", WORDS)
        for row, item in zip(rows, wrapper):
            row[measure]["change"] = item["change"]
    return rows


def national_checks(national20: dict, mobile20: float, mobile24: float) -> list[dict]:
    checks = []
    for key in ("formal", "informal_only", "excluded"):
        calculated = national20[key]["pct"]
        published = PUBLISHED_2020_RESTATED[key]
        checks.append({"measure": key, "calculated": calculated, "published": published, "difference_points": round(calculated - published, 1), "ok": abs(calculated - published) <= 1.0,
                       "note": "2020 in the 2024 report (restated); informal-only and excluded are unchanged by the restatement."})
    banked = national20["banked"]["pct"]
    checks.append({"measure": "banked", "calculated": banked, "published": PUBLISHED_2020_ORIGINAL_BANKED, "difference_points": round(banked - PUBLISHED_2020_ORIGINAL_BANKED, 1), "ok": abs(banked - PUBLISHED_2020_ORIGINAL_BANKED) <= 1.0,
                   "note": f"Original 2020 definition. The 2024 report restates 2020 banked as {PUBLISHED_2020_RESTATED['banked']}%, so banked cannot be compared across years from this variable."})
    for year, value in (("2020", mobile20), ("2024", mobile24)):
        checks.append({"measure": f"registered_mobile_money_{year}", "calculated": value, "published": PUBLISHED_MOBILE_WALLET[year], "difference_points": round(value - PUBLISHED_MOBILE_WALLET[year], 1),
                       "ok": abs(value - PUBLISHED_MOBILE_WALLET[year]) <= 3.0, "note": "Registered mobile wallet holders; estimated from the questionnaire, so a small difference is expected."})
    return checks


def finscope_trend(data_root: Path, district: str | None = None) -> dict:
    path, frame = load_2020(data_root)
    validate(frame)
    frame2020 = prepare(frame)
    path24, frame2024 = finance.load_finscope(data_root)
    finance.validate(frame2024)
    names = sorted(frame2020.district.unique())
    if set(names) != set(finance.PUBLISHED_DISTRICTS):
        raise ValueError("FinScope 2020 and the published 2024 district list do not match")
    everyone = pd.Series(True, index=frame2020.index)
    national = measure_row(frame2020, everyone)
    provinces = [{"province": name, "sample_adults": int((frame2020.province == name).sum()), **measure_row(frame2020, frame2020.province == name)} for name in sorted(frame2020.province.unique())]
    districts = [{"district": name, "sample_adults": int((frame2020.district == name).sum()), **measure_row(frame2020, frame2020.district == name)} for name in names]
    changes = trend_rows(frame2020, frame2024, names)
    weights24 = pd.to_numeric(frame2024.pop_wt, errors="coerce").astype("float64")
    mobile24 = round(100 * finance.share(weights24, frame2024.f5.isin(REGISTERED_MOBILE_MONEY))["p"], 1)
    checks = national_checks(national, national["mobile_money"]["pct"], mobile24)
    rules_check = reconstruction_check(frame2020)
    counts = {measure: {label: sum(1 for row in changes if row[measure]["change"] and row[measure]["change"]["label"].startswith(label)) for label in ("Clear fall", "Clear rise", "Possible", "No clear change")} for measure in TREND_MEASURES}
    return {
        "status": "Completed", "survey": "FinScope Rwanda 2020 and 2024", "selected_district": district,
        "labels": {"strand_2020": "Aggregate comparison only: 2020 uses NISR's own access strand from the microdata; 2024 uses NISR's published district figures.",
                   "mobile_money": "Aggregate comparison only: registered mobile money users estimated from the questionnaire in both years."},
        "national": {"y2020": national, "y2020_restated_published": PUBLISHED_2020_RESTATED, "y2024_published": PUBLISHED_2024, "mobile_money_2024_estimated": mobile24},
        "provinces_2020": provinces, "districts_2020": districts, "changes": changes, "change_counts": counts, "checks": checks, "reconstruction_check": rules_check,
        "files": {"2020": path.name, "2024": path24.name}, "sources": {"report_2024": finance.REPORT_URL, "survey_2020": REPORT_2020_URL, "press_2020": PRESS_2020_URL},
        "limitations": ["2024 district figures are NISR's published whole numbers; their uncertainty is approximated from the 2024 weights and rounding, and the 2024 file has no cluster field, so those intervals are too narrow.",
                        "'Banked' changed definition between the 2020 and 2024 reports (36% originally, restated to 22%), so no banked trend is shown. Informal only, excluded and formally served are comparable.",
                        "The 2020 file asks about mobile money of fewer people (20% blank); blanks are counted as not registered, which matches NISR's published 60% within about 2 points.",
                        "FinScope is not linked to EICV by household. District changes are descriptions, not explanations, and district samples are 416 adults in 2020."],
    }
