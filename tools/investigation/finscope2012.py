"""Aggregate-only rebuild of the FinScope 2012 access strand, checked against NISR's published 2012 figures.

The 2012 file has no NISR strand variable, so the strand is rebuilt from the questionnaire with the same framework rules as 2016 and 2020
as the 2012 report defines them (bank; other formal = SACCO, microfinance, pension, insurance other than Mutuelle de Santé, mobile money, post office
and Western Union, government credit; informal = savings groups, community keepers, money lenders, shop, farm-buyer and church credit, and
runner remittances; family credit and savings kept at home are NOT informal). The rebuild is close but does NOT reproduce the published figures
within tolerance (banked stays about 3.5 points low), so `agrees_with_published` is False and the 2012 point is not added to the financial
series. The gap is reported instead of forcing a match.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from . import finance

WEIGHT = "WEIGHT"
FILE_PATTERN = "*FinScope 2012*.sav"
TOLERANCE_POINTS = 1.0
BANK_YES = ["J3A", "J4A", "J21A", "J22A", "J23A", "J24A", "J25A", "J26A", "J27A", "J28A", "F31_F3A", "G41_G4A"]
BANK_ANSWERED = ["J24B1", "J25B1", "J26B1"]
OTHER_FORMAL_YES = ["J8A", "F33_F3A", "G43_G4A", "F32_F3A", "G42_G4A", "F35_F3A", "F34_F3A", "H45", "H31_H3A", "H41", "H42", "H43", "H44", "H46",
                    "I5A1", "I5A2", "I5B1", "I5B2", "G44_G4A"]
OTHER_FORMAL_ANSWERED = ["J7D1"]
INFORMAL_YES = ["F36_F3A", "F37_F3A", "K1A", "G45_G4A", "G46_G4A", "G47_G4A", "G48_G4A", "G49_G4A", "G412_G4A"]
# How money was sent (I2n_I2D) or received (I4n_I4D): by whom the transfer is carried decides which strand it counts for.
REMITTANCE_COLUMNS = [f"I2{n}_I2D" for n in range(1, 10)] + [f"I4{n}_I4D" for n in range(1, 9)]
REMITTANCE_BANK = ["Bank transfer/Pay into bank account"]
REMITTANCE_FORMAL = ["Mobile money", "Post Office/ Western Union/ Money gram", "Cell phone top-up"]
REMITTANCE_INFORMAL = ["Bus or Taxi"]
COLUMNS = [WEIGHT, "A2"] + BANK_YES + BANK_ANSWERED + OTHER_FORMAL_YES + OTHER_FORMAL_ANSWERED + INFORMAL_YES + REMITTANCE_COLUMNS
STRANDS = finance.STRANDS
# NISR FinScope Rwanda 2012 headline results: 23% banked, 42% formal, 28% excluded; other formal (19) and informal only (30) are the remainders.
PUBLISHED_2012 = {"banked": 23, "other_formal": 19, "informal_only": 30, "excluded": 28, "formal": 42}
SOURCES_2012 = {"results": "https://statistics.gov.rw/data-sources/surveys/FinScope-Survey/finscope-survey-2012",
                "microdata": "https://microdata.statistics.gov.rw/index.php/catalog/57"}


def load_2012(data_root: Path) -> tuple[Path, pd.DataFrame]:
    files = list(Path(data_root).rglob(FILE_PATTERN))
    if len(files) != 1:
        raise ValueError(f"Expected one FinScope 2012 file; found {len(files)}")
    import pyreadstat

    try:
        frame, _ = pyreadstat.read_sav(str(files[0]), usecols=COLUMNS, apply_value_formats=True, formats_as_category=False)
    except UnicodeDecodeError:
        frame, _ = pyreadstat.read_sav(str(files[0]), usecols=COLUMNS, apply_value_formats=True, formats_as_category=False, encoding="latin1")
    return files[0], frame


def validate(frame: pd.DataFrame) -> None:
    missing = [name for name in COLUMNS if name not in frame.columns]
    if missing:
        raise ValueError(f"FinScope 2012 file is missing required columns: {', '.join(missing)}")
    weights = pd.to_numeric(frame[WEIGHT], errors="coerce")
    if weights.isna().any() or not np.isfinite(weights).all() or (weights <= 0).any():
        raise ValueError("FinScope 2012 weights must be finite, positive, and present for every respondent")
    for name in ("J3A", "J8A", "K1A", "F36_F3A"):
        if frame[name].isna().any() or not frame[name].isin(["Yes", "No"]).all():
            raise ValueError(f"FinScope 2012 question {name} has missing or unrecognized answers")


def yes(frame: pd.DataFrame, columns: list[str]) -> pd.Series:
    return pd.concat([frame[name].astype(str).str.startswith("Yes") for name in columns], axis=1).any(axis=1)


def answered(frame: pd.DataFrame, columns: list[str]) -> pd.Series:
    return pd.concat([frame[name].notna() for name in columns], axis=1).any(axis=1)


def remitted_by(frame: pd.DataFrame, methods: list[str]) -> pd.Series:
    found = [frame[name].isin(methods) for name in REMITTANCE_COLUMNS if name in frame.columns]
    return pd.concat(found, axis=1).any(axis=1) if found else pd.Series(False, index=frame.index)


def prepare(frame: pd.DataFrame) -> pd.DataFrame:
    """Mutually exclusive strands, in the order banked, other formal, informal only, excluded."""
    bank = yes(frame, BANK_YES) | answered(frame, BANK_ANSWERED) | remitted_by(frame, REMITTANCE_BANK)
    other = (yes(frame, OTHER_FORMAL_YES) | answered(frame, OTHER_FORMAL_ANSWERED) | remitted_by(frame, REMITTANCE_FORMAL)) & ~bank
    informal = (yes(frame, INFORMAL_YES) | remitted_by(frame, REMITTANCE_INFORMAL)) & ~bank & ~other
    prepared = frame.copy()
    prepared["banked"], prepared["other_formal"], prepared["informal_only"] = bank, other, informal
    prepared["excluded"] = ~(bank | other | informal)
    prepared["formal"] = bank | other
    return prepared


def national(frame: pd.DataFrame) -> dict:
    weights = pd.to_numeric(frame[WEIGHT]).astype("float64")
    return {key: finance.share(weights, frame[key]) for key in (*STRANDS, "formal")}


def checks(rebuilt: dict) -> list[dict]:
    rows = []
    for key, published in PUBLISHED_2012.items():
        calculated = round(100 * rebuilt[key]["p"], 1)
        rows.append({"measure": key, "calculated": calculated, "published": published, "difference_points": round(calculated - published, 1),
                     "ok": abs(calculated - published) <= TOLERANCE_POINTS})
    return rows


def summary(data_root: Path) -> dict:
    path, raw = load_2012(data_root)
    validate(raw)
    rows = checks(national(prepare(raw)))
    return {"file": path.name, "tolerance_points": TOLERANCE_POINTS, "checks": rows, "agrees_with_published": all(item["ok"] for item in rows),
            "sources": SOURCES_2012}
