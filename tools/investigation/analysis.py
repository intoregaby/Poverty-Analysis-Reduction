"""Validated, aggregate-only EICV7 district calculations."""

from __future__ import annotations

import io
import zipfile
import warnings
from pathlib import Path

import pandas as pd
import numpy as np

POVERTY = "Cross_Section/CS_EICV7_poverty_file.dta"
HOUSEHOLD = "Cross_Section/CS_S01_S5_S7_Household.dta"
PERSON = "Cross_Section/CS_S0_S1_S2_S3_S4_S6A_S6B_S6C_Person.dta"
VUP = (
    "Cross_Section/CS_S9D1_Direct_Support.dta",
    "Cross_Section/CS_S9D2_Classic_Public_Work.dta",
    "Cross_Section/CS_S9D3_Expanded_Public_Work.dta",
    "Cross_Section/CS_S9D4_NSDS.dta",
    "Cross_Section/CS_S9D5_Financial_Services.dta",
)


def weighted_percentage(frame: pd.DataFrame, included: pd.Series, weight: str, valid: pd.Series | None = None) -> float | None:
    if valid is None:
        valid = pd.Series(True, index=frame.index)
    weights = pd.to_numeric(frame[weight], errors="coerce").astype("float64")
    if weights.isna().any() or not np.isfinite(weights).all() or (weights <= 0).any():
        raise ValueError("Survey weights must be finite, positive, and present for every included record")
    valid = valid.fillna(False)
    included = included.fillna(False)
    denominator = float(weights.loc[valid].sum())
    if denominator <= 0:
        return None
    numerator = float(weights.loc[valid & included].sum())
    return round(100 * numerator / denominator, 1)


def _read(archive: zipfile.ZipFile, name: str, columns: list[str], notices: list | None = None, categoricals: bool = True) -> pd.DataFrame:
    with warnings.catch_warnings(record=True) as recorded:
        warnings.simplefilter("always", UnicodeWarning)
        frame = pd.read_stata(io.BytesIO(archive.read(name)), columns=columns, convert_categoricals=categoricals)
    if notices is not None and any(issubclass(item.category, UnicodeWarning) for item in recorded):
        notices.append(f"{Path(name).name}: some Stata strings required Latin-1 fallback; selected geography and response categories are validated before analysis.")
    return frame


def calculate_eicv7(data_root: Path, district: str) -> dict:
    archives = list(data_root.rglob("*EICV7 2023-2024.zip"))
    if len(archives) != 1:
        raise ValueError(f"Expected one EICV7 cross-section archive; found {len(archives)}")
    archive_path = archives[0]
    reader_warnings = []
    with zipfile.ZipFile(archive_path) as archive:
        poverty = _read(archive, POVERTY, ["hhid", "province", "district", "weight", "pop_wt", "pov_jan", "epov_jan", "ur", "member", "clust"], reader_warnings)
        housing = _read(archive, HOUSEHOLD, ["hhid", "district", "weight", "s5cq14", "strata_id"], reader_warnings)
        persons = _read(archive, PERSON, ["hhid", "district", "weight", "s3q2"], reader_warnings)
        if poverty.hhid.nunique() != len(poverty) or housing.hhid.nunique() != len(housing):
            raise ValueError("EICV7 cross-section household IDs are not unique")
        if set(poverty.hhid) != set(housing.hhid):
            raise ValueError("EICV7 household modules do not contain the same household IDs")
        geography = poverty.set_index("hhid").district
        if not housing.set_index("hhid").district.eq(geography).all():
            raise ValueError("EICV7 household module district labels conflict")
        if not persons.apply(lambda row: geography.get(row.hhid) == row.district, axis=1).all():
            raise ValueError("EICV7 person module district labels conflict")

        participants = set()
        for name in VUP:
            module = _read(archive, name, ["hhid", "s9d1q1"], reader_warnings)
            if set(module.hhid) != set(poverty.hhid):
                raise ValueError("VUP module household IDs do not cover the EICV7 cross-section exactly")
            if not module.s9d1q1.isin(["Yes", "No"]).all():
                raise ValueError("VUP participation has missing or unrecognized responses; its denominator needs review")
            if (module.groupby("hhid", observed=True).s9d1q1.nunique() > 1).any():
                raise ValueError("Repeated VUP household rows contain conflicting participation answers")
            participants.update(module.loc[module.s9d1q1 == "Yes", "hhid"])
        unknown_participants = participants - set(poverty.hhid)
        if unknown_participants:
            raise ValueError(f"{len(unknown_participants)} VUP household IDs do not match the cross-section")

    if district not in set(poverty.district):
        raise ValueError(f"Unknown EICV7 district: {district}")
    poverty["vup_participant"] = poverty.hhid.isin(participants)
    rates = []
    for name, group in poverty.groupby("district", observed=True):
        poor = group[group.pov_jan == "Poor"]
        housing_group = housing[housing.district == name]
        person_group = persons[persons.district == name]
        insured_valid = person_group.s3q2.isin(["Yes", "No"])
        grid_valid = housing_group.s5cq14.isin(["Yes on grid", "Yes both on grid  and from solar", "Yes from solar", "No"])
        rates.append({
            "district": str(name), "province": str(group.province.iloc[0]),
            "poverty": weighted_percentage(group, group.pov_jan == "Poor", "pop_wt"),
            "extreme_poverty": weighted_percentage(group, group.epov_jan == "Extreme Poor", "pop_wt"),
            "vup_among_poor": weighted_percentage(poor, poor.vup_participant, "weight"),
            "grid_connection": weighted_percentage(housing_group, housing_group.s5cq14.isin(["Yes on grid", "Yes both on grid  and from solar"]), "weight", grid_valid),
            "health_insurance": weighted_percentage(person_group, person_group.s3q2 == "Yes", "weight", insured_valid),
            "sample_households": len(group), "sample_poor_households": len(poor),
            "sample_people_health": int(insured_valid.sum()),
        })
    rates.sort(key=lambda row: row["district"])

    poor_national = poverty[poverty.pov_jan == "Poor"]
    insured_valid = persons.s3q2.isin(["Yes", "No"])
    grid_valid = housing.s5cq14.isin(["Yes on grid", "Yes both on grid  and from solar", "Yes from solar", "No"])
    national = {
        "poverty": weighted_percentage(poverty, poverty.pov_jan == "Poor", "pop_wt"),
        "extreme_poverty": weighted_percentage(poverty, poverty.epov_jan == "Extreme Poor", "pop_wt"),
        "vup_among_poor": weighted_percentage(poor_national, poor_national.vup_participant, "weight"),
        "grid_connection": weighted_percentage(housing, housing.s5cq14.isin(["Yes on grid", "Yes both on grid  and from solar"]), "weight", grid_valid),
        "health_insurance": weighted_percentage(persons, persons.s3q2 == "Yes", "weight", insured_valid),
        "sample_households": len(poverty), "sample_poor_households": len(poor_national),
        "sample_people_health": int(insured_valid.sum()),
    }
    if national["poverty"] != 27.4 or national["health_insurance"] != 85.3:
        raise ValueError("Calculated national rates do not reconcile with NISR EICV7 published figures")
    selected = next(row for row in rates if row["district"] == district)
    comparators = sorted(
        (row for row in rates if row["province"] == selected["province"] and row["district"] != district),
        key=lambda row: (abs(row["poverty"] - selected["poverty"]), row["district"]),
    )[:3]
    from .context import investigate_context
    context = investigate_context(poverty, housing, district, [row["district"] for row in comparators])
    from .reliability import assess_district, reconcile_national
    reliability = assess_district(poverty, housing, persons, participants, district)
    reliability["national_reconciliation"] = reconcile_national(national, {"poverty": 27.4, "health_insurance": 85.3})
    return {
        "reliability": reliability,
        "district": district,
        "survey": "NISR EICV7 cross-section, October 2023–October 2024",
        "source_file": str(archive_path),
        "reader_warnings": reader_warnings,
        "method": {
            "poverty": "Population-weighted share of residents with pov_jan == Poor; January 2024 poverty method.",
            "vup_among_poor": "Household-weighted share of surveyed poor households reporting a VUP participant in any of five S9D modules; not payment receipt or eligibility.",
            "grid_connection": "Household-weighted share reporting grid connection, including households also using solar; excludes solar-only.",
            "health_insurance": "Person-weighted share answering Yes to current health insurance; Don't know excluded.",
            "uncertainty": "Published NISR poverty intervals are attached when verified. Approximate design-based intervals and reliability grades for the selected district's calculated measures are in `reliability`; they are not NISR's published estimator and gaps remain descriptive.",
            "joins": "Only EICV7 cross-section household identifiers are matched after uniqueness and geographic checks. All VUP modules must cover the same households with valid, non-conflicting Yes/No responses; repeated identical answers collapse to household participation. Other surveys are never record-joined.",
            "comparators": "Three same-province districts nearest in observed poverty rate. Selection is not matched on livelihoods; residence and household size are compared separately.",
        },
        "national": national,
        "selected": selected,
        "comparators": comparators,
        "contextual_analysis": context,
        "all_districts": rates,
        "not_analyzed": [
            "Employment, income, agriculture, savings, credit, and education modules are catalogued but need validated variable definitions and denominators before district estimates.",
            "FinScope 2024 contains district identifiers, but its published mutually exclusive Access Strand is not a precomputed column in the supplied file; district inclusion is not estimated here.",
            "EICV3–EICV5 observed poverty rates are not directly compared with EICV7 because its poverty method changed.",
        ],
    }
