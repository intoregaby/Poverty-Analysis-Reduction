"""Poverty driver analysis: what distinguishes a district's poverty from Rwanda's, and who is poor inside it.

Aggregate-only. Household records stay in memory; the returned structure contains weighted
estimates, intervals and labels. Results are adjusted associations. They never claim a causal effect.
"""

from __future__ import annotations

import zipfile
from pathlib import Path

import numpy as np
import pandas as pd

from .analysis import HOUSEHOLD, PERSON, POVERTY, _read

TRANSFERS_IN = "Cross_Section/CS_S9B_transfers_in.dta"
SAVINGS = "Cross_Section/CS_S10C_Savings.dta"
CREDIT = "Cross_Section/CS_S10A1_A2_credits.dta"
DURABLES = "Cross_Section/CS_S10B_durables.dta"
SERVICES = "Cross_Section/CS_S5F_access_to_services.dta"
# S5F service codes: 2 food market/shop, 4 public transport stage, 10 health centre. Stata codes 1 = Yes, 2 = No in S10A/S10C. Items 8-10 in S10B are car, motorcycle, bicycle.
FAR_MINUTES = 60
GRID = ["Yes on grid", "Yes both on grid  and from solar"]
UNIMPROVED_WATER = {"Unprotected spring", "River/Stream/Irrigation Channel", "Lake/Pond/Surface water"}
UNIMPROVED_TOILET = {"Pit latrine without constructed floor slab", "No toilet /Bush/Field"}
BIOMASS = {"Firewood", "Straw/shrub/grass (udushari).", "Crop waste"}
EARTH_FLOOR = {"Beaten earth", "Dung hardened"}
BOOTSTRAP_REPLICATES = 300
CONSUMPTION_REPLICATES = 150
FOLDS = 5
SEED = 20240117
MIN_CELL = 30

# role: upstream (demographic/structural), livelihood, access (services), marker (deprivation sign, partly a consequence of poverty).
GROUPS = [
    {"id": "household_structure", "label": "Household size and dependants", "role": "upstream"},
    {"id": "household_head", "label": "Household head", "role": "upstream"},
    {"id": "education", "label": "Adult education", "role": "upstream"},
    {"id": "livelihood", "label": "Livelihood and income sources", "role": "livelihood"},
    {"id": "remittances", "label": "Money received from outside the household", "role": "livelihood"},
    {"id": "finance", "label": "Savings and credit access", "role": "access"},
    {"id": "services_access", "label": "Travel time to markets, transport and health care", "role": "access"},
    {"id": "energy", "label": "Energy access and cooking fuel", "role": "access"},
    {"id": "water_sanitation", "label": "Water and sanitation", "role": "access"},
    {"id": "health", "label": "Health cover and disability", "role": "access"},
    {"id": "shocks", "label": "Shocks and unusual hardship", "role": "upstream"},
    {"id": "location", "label": "Rural or urban location", "role": "upstream"},
    {"id": "connectivity", "label": "Phone and internet access", "role": "marker"},
    {"id": "housing_assets", "label": "Housing and livestock assets", "role": "marker"},
    {"id": "durables", "label": "Durable goods and transport", "role": "marker"},
]
# name, label, group, kind, description of the "1"/high condition used in sentences
VARIABLES = [
    ("hh_size", "Household size (people)", "household_structure", "continuous", "larger households"),
    ("child_share", "Share of members under 15", "household_structure", "continuous", "more children per member"),
    ("elderly_share", "Share of members aged 65+", "household_structure", "continuous", "more older members per member"),
    ("head_female", "Female-headed household", "household_head", "binary", "female-headed households"),
    ("head_age", "Age of household head (decades)", "household_head", "continuous", "older household heads"),
    ("head_no_school", "Head never attended school", "household_head", "binary", "heads who never attended school"),
    ("adult_schooling", "Average years of schooling, adults 18+", "education", "continuous", "more adult schooling"),
    ("illiterate_adult_share", "Share of adults 18+ who cannot read and write a simple note", "education", "continuous", "more adults who cannot read and write"),
    ("no_secondary_adult", "No adult has attended secondary school", "education", "binary", "households where no adult has attended secondary school"),
    ("child_out_of_school", "A child aged 6–15 did not attend school in the last 12 months", "education", "binary", "households with a child out of school"),
    ("has_farm", "Any member works in farming", "livelihood", "binary", "farming households"),
    ("has_wage", "Any member earns non-farm wages", "livelihood", "binary", "households with non-farm wage work"),
    ("has_business", "Any member runs a non-farm business", "livelihood", "binary", "households with a non-farm business"),
    ("no_working_adult", "No working-age adult (18–64)", "livelihood", "binary", "households with no working-age adult"),
    ("no_adult_worker", "Working-age adults present but none has a main job", "livelihood", "binary", "households where working-age adults have no main job"),
    ("casual_work", "A member works as a daily, casual or seasonal wage worker", "livelihood", "binary", "households with daily, casual or seasonal wage work"),
    ("unpaid_family_work", "A member is an unpaid contributing family worker", "livelihood", "binary", "households with unpaid family workers"),
    ("remittance", "Received money from non-members", "remittances", "binary", "households receiving outside transfers"),
    ("no_account", "No member has a bank or mobile-money account", "finance", "binary", "households with no account"),
    ("tontine", "A member takes part in a tontine", "finance", "binary", "households taking part in a tontine"),
    ("credit_denied", "A loan application was refused", "finance", "binary", "households refused a loan"),
    ("in_debt", "A member owes money", "finance", "binary", "households in debt"),
    ("far_market", "Food market over 60 minutes away", "services_access", "binary", "households far from a food market"),
    ("far_transport", "Public transport stop over 60 minutes away", "services_access", "binary", "households far from public transport"),
    ("far_health", "Health centre over 60 minutes away", "services_access", "binary", "households far from a health centre"),
    ("no_grid", "No grid electricity", "energy", "binary", "households without grid electricity"),
    ("biomass_cooking", "Cooks mainly with firewood, straw or crop waste", "energy", "binary", "households cooking with solid biomass"),
    ("water_unimproved", "Unimproved drinking water", "water_sanitation", "binary", "households using unimproved water"),
    ("water_far", "Water source over 500 m away", "water_sanitation", "binary", "households far from water"),
    ("toilet_unimproved", "No toilet or unslabbed pit latrine", "water_sanitation", "binary", "households with unimproved sanitation"),
    ("insured_share", "Share of members with health insurance", "health", "continuous", "higher insurance cover"),
    ("any_disability", "Any member with a functional difficulty", "health", "binary", "households with a member who has a disability"),
    ("shock", "Reported an unusual negative event", "shocks", "binary", "households reporting a shock"),
    ("rural", "Rural residence", "location", "binary", "rural households"),
    ("no_phone", "No adult owns a mobile phone", "connectivity", "binary", "households with no phone"),
    ("no_internet", "No household internet connection", "connectivity", "binary", "households without internet"),
    ("earth_floor", "Earth or dung floor", "housing_assets", "binary", "households with earth floors"),
    ("no_livestock", "Owns no livestock", "housing_assets", "binary", "households without livestock"),
    ("durable_types", "Kinds of durable goods owned (of 27)", "durables", "continuous", "households owning more kinds of durable goods"),
    ("no_transport", "Owns no car, motorcycle or bicycle", "durables", "binary", "households with no vehicle or bicycle"),
]
GROUP_BY_ID = {item["id"]: item for item in GROUPS}


def _yes(series: pd.Series) -> pd.Series:
    return series.astype(str).eq("Yes")


def _any_by_household(person: pd.DataFrame, flag: pd.Series) -> pd.Series:
    return flag.groupby(person.hhid).any()


SECONDARY_OR_HIGHER = ["Lower secondary", "Upper secondary", "Tertiary"]
CASUAL_CONTRACTS = ["Daily worker", "Casual worker", "Seasonal worker"]
# NISR EICV7 Main Indicators Report: literacy (read and write a simple note) and highest level of education attended, population aged 10+.
NISR_PERSON_FIGURES = {
    "literacy_15_plus": (75.8, 0.5), "literacy_15_24": (87.7, 0.5),
    "no_formal_education_10_plus": (9.0, 0.5), "primary_10_plus": (63.0, 0.5), "secondary_10_plus": (24.0, 0.5), "university_10_plus": (4.3, 0.3),
}


def validate_education_work(person: pd.DataFrame) -> list[dict]:
    """Check that the education and work definitions reproduce NISR's published person-level figures and that every question is answered where it should be."""
    age = pd.to_numeric(person.s1q3y, errors="coerce")
    weights = pd.to_numeric(person.weight, errors="coerce")
    if age.isna().any() or weights.isna().any() or (weights <= 0).any():
        raise ValueError("Person records need ages and positive weights for the education and work checks")

    def share(mask: pd.Series, base: pd.Series) -> float:
        total = float((weights * base).sum())
        return round(100 * float((weights * (mask & base)).sum()) / total, 1) if total > 0 else float("nan")

    level = person.s4aq2.astype(str)
    literate = _yes(person.s4bq4) & _yes(person.s4bq6)
    ten_plus = age >= 10
    values = {
        "literacy_15_plus": share(literate, age >= 15), "literacy_15_24": share(literate, age.between(15, 24)),
        "no_formal_education_10_plus": share(person.s4aq1.astype(str).eq("No"), ten_plus),
        "primary_10_plus": share(level.isin(["Primary", "Nursery", "ECD"]) | level.str.contains("INGOBOKA"), ten_plus),
        "secondary_10_plus": share(level.isin(["Lower secondary", "Upper secondary"]), ten_plus), "university_10_plus": share(level.eq("Tertiary"), ten_plus),
    }
    checks = []
    for name, (published, tolerance) in NISR_PERSON_FIGURES.items():
        checks.append({"measure": name, "calculated": values[name], "published": published, "difference_points": round(values[name] - published, 1), "ok": abs(values[name] - published) <= tolerance})
    if not all(item["ok"] for item in checks):
        raise ValueError(f"Education definitions do not reproduce NISR's published figures: {[item for item in checks if not item['ok']]}")
    any_activity = _yes(person.s6aq2) | _yes(person.s6aq4) | _yes(person.s6aq5) | _yes(person.s6aq6) | _yes(person.s6aq7)
    coverage = {
        "reading question answered for everyone aged 10+": bool(person.s4bq4[ten_plus].notna().all()),
        "work questions answered for everyone aged 6+": bool(person.s6aq2[age >= 6].notna().all()),
        "school attendance answered for at least 97% of children 6-15": bool(person.s4aq7[age.between(6, 15)].notna().mean() >= 0.97),
        "everyone with a reported activity has a main-job status": not bool((any_activity & person.s6bq7.isna()).any()),
        "every adult who ever attended school has a highest level": not bool((person.s4aq1.astype(str).eq("Yes") & (age >= 18) & person.s4aq2.isna()).any()),
    }
    if not all(coverage.values()):
        raise ValueError(f"Education or work questions are not answered where expected: {[key for key, ok in coverage.items() if not ok]}")
    checks.extend({"measure": key, "ok": ok} for key, ok in coverage.items())
    return checks


def education_work_variables(person: pd.DataFrame, index: pd.Index) -> pd.DataFrame:
    """Household-level education and work measures from the person module.

    Literacy is the share of adults 18+ who can read and write a simple note (people who cannot read are not asked to write and count as not literate).
    Secondary means lower secondary, upper secondary or tertiary. A main job means a main-job status was recorded in the reference week.
    """
    age = pd.to_numeric(person.s1q3y, errors="coerce")
    adult = age >= 18
    working_age = age.between(18, 64)
    out = pd.DataFrame(index=index)
    has_working_age = _any_by_household(person, working_age).reindex(index).fillna(False)
    has_main_job = _any_by_household(person, working_age & person.s6bq7.notna()).reindex(index).fillna(False)
    out["no_adult_worker"] = (has_working_age & ~has_main_job).astype(float)
    out["casual_work"] = _any_by_household(person, person.s6bq8.astype(str).isin(CASUAL_CONTRACTS)).reindex(index).fillna(False).astype(float)
    out["unpaid_family_work"] = _any_by_household(person, person.s6bq7.astype(str).eq("Contributing family worker")).reindex(index).fillna(False).astype(float)
    literate = _yes(person.s4bq4) & _yes(person.s4bq6)
    adult_answered = adult & person.s4bq4.notna()
    adult_count = adult_answered.groupby(person.hhid).sum().reindex(index)
    illiterate_count = (adult_answered & ~literate).groupby(person.hhid).sum().reindex(index)
    out["illiterate_adult_share"] = (illiterate_count / adult_count.where(adult_count > 0)).astype(float)
    out["no_secondary_adult"] = (~_any_by_household(person, adult & person.s4aq2.astype(str).isin(SECONDARY_OR_HIGHER)).reindex(index).fillna(False)).astype(float)
    out["child_out_of_school"] = _any_by_household(person, age.between(6, 15) & person.s4aq7.astype(str).eq("No")).reindex(index).fillna(False).astype(float)
    return out


def build_frame(archive: zipfile.ZipFile, notices: list) -> pd.DataFrame:
    poverty = _read(archive, POVERTY, ["hhid", "province", "district", "weight", "pop_wt", "pov_jan", "ur", "member", "clust", "sol_jan", "Poverty_line"], notices)
    housing = _read(archive, HOUSEHOLD, ["hhid", "district", "strata_id", "s5cq1", "s5cq4a", "s5cq14", "s5cq20a", "s5cq22a", "s5cq25", "s5dq3", "s5eq1", "s7aq4"], notices)
    person = _read(archive, PERSON, ["hhid", "district", "weight", "s1q1", "s1q2", "s1q3y", "s3q2", "s3q7", "s3q8", "s3q9", "s3q10", "s3q11", "s3q12",
                                     "s4aq1", "s4aq2", "s4aq2a", "s4aq7", "s4bq4", "s4bq6", "s4bq8", "s6aq2", "s6aq4", "s6aq5", "s6aq6", "s6aq7", "s6bq7", "s6bq8"], notices)
    transfers = _read(archive, TRANSFERS_IN, ["hhid", "s9bq0"], notices)
    savings = _read(archive, SAVINGS, ["hhid", "s10cq4", "s10cq8"], notices, categoricals=False)
    credit = _read(archive, CREDIT, ["hhid", "s10aq1", "s10aq2", "s10aq3"], notices, categoricals=False)
    durables = _read(archive, DURABLES, ["hhid", "s10bq0", "s10bq2"], notices, categoricals=False)
    services = _read(archive, SERVICES, ["hhid", "s5fq0", "s5fq3a", "s5fq3b"], notices, categoricals=False)
    if poverty.hhid.nunique() != len(poverty) or housing.hhid.nunique() != len(housing):
        raise ValueError("EICV7 household IDs are not unique; driver analysis stopped")
    if any(set(module.hhid) - set(poverty.hhid) for module in (person, transfers, savings, credit, durables, services)):
        raise ValueError("Person or transfer records contain households missing from the poverty file")
    geography = poverty.set_index("hhid").district
    if not housing.set_index("hhid").district.reindex(geography.index).eq(geography).all():
        raise ValueError("EICV7 household module district labels conflict")
    if not person.district.eq(person.hhid.map(geography)).all():
        raise ValueError("EICV7 person module district labels conflict")
    if poverty[["weight", "pop_wt", "sol_jan", "Poverty_line", "clust"]].isna().any().any() or (poverty.pop_wt <= 0).any():
        raise ValueError("Poverty file has missing or non-positive weights, consumption or sampling fields")

    education_work_checks = validate_education_work(person)
    age = pd.to_numeric(person.s1q3y, errors="coerce")
    adult = age >= 18
    working_age = age.between(18, 64)
    schooling = pd.to_numeric(person.s4aq2a, errors="coerce").where(person.s4aq1.astype(str).ne("No"), 0)
    head = person.s1q2.astype(str).eq("Household head (HH)")
    n_people = person.groupby("hhid").size()
    if not (n_people.reindex(poverty.hhid).values == poverty.member.values).all():
        raise ValueError("Person records do not match each household's recorded size")
    difficulty = pd.concat([person[column].astype(str).str.startswith("Yes") for column in ["s3q7", "s3q8", "s3q9", "s3q10", "s3q11", "s3q12"]], axis=1).any(axis=1)
    hh = poverty.set_index("hhid")
    index = hh.index
    heads = person[head].drop_duplicates("hhid").set_index("hhid")
    if len(heads) != len(hh):
        raise ValueError("Every household needs exactly one recorded head for driver analysis")
    frame = pd.DataFrame(index=index)
    frame["district"] = hh.district.astype(str)
    frame["province"] = hh.province.astype(str)
    frame["clust"] = hh.clust
    frame["strata"] = housing.set_index("hhid").strata_id.reindex(index)
    frame["weight"] = hh.pop_wt.astype("float64")
    frame["poor"] = hh.pov_jan.astype(str).eq("Poor").astype(float)
    below_line = hh.sol_jan < hh.Poverty_line
    if (below_line != hh.pov_jan.astype(str).eq("Poor")).any():
        raise ValueError("Consumption per adult equivalent does not reproduce NISR's poor classification; poverty depth cannot be calculated")
    shortfall = ((hh.Poverty_line - hh.sol_jan) / hh.Poverty_line).clip(lower=0)
    if not (hh.sol_jan > 0).all() or not np.isfinite(hh.sol_jan.astype(float)).all():
        raise ValueError("Consumption per adult equivalent must be positive and finite for the living-standards view")
    frame["log_consumption"] = np.log(hh.sol_jan.astype(float))
    frame["fgt1"] = shortfall
    frame["fgt2"] = shortfall ** 2
    frame["hh_size"] = hh.member.astype(float)
    frame["child_share"] = (age < 15).groupby(person.hhid).sum().reindex(index) / hh.member
    frame["elderly_share"] = (age >= 65).groupby(person.hhid).sum().reindex(index) / hh.member
    frame["head_female"] = heads.s1q1.astype(str).eq("Female").astype(float).reindex(index)
    head_age = pd.to_numeric(heads.s1q3y, errors="coerce").reindex(index)
    frame["head_age"] = head_age / 10
    frame["head_no_school"] = heads.s4aq1.astype(str).eq("No").astype(float).reindex(index)
    adult_years = schooling.where(adult).groupby(person.hhid).mean().reindex(index)
    frame["adult_schooling"] = adult_years
    frame["has_farm"] = _any_by_household(person, _yes(person.s6aq2) | _yes(person.s6aq4)).reindex(index).fillna(False).astype(float)
    frame["has_wage"] = _any_by_household(person, _yes(person.s6aq5)).reindex(index).fillna(False).astype(float)
    frame["has_business"] = _any_by_household(person, _yes(person.s6aq6)).reindex(index).fillna(False).astype(float)
    has_working_age = _any_by_household(person, working_age).reindex(index).fillna(False)
    frame["no_working_adult"] = (~has_working_age).astype(float)
    extra = education_work_variables(person, index)
    for column in extra.columns:
        frame[column] = extra[column]
    frame["remittance"] = _any_by_household(transfers, _yes(transfers.s9bq0)).reindex(index).fillna(False).astype(float)
    houses = housing.set_index("hhid").reindex(index)
    frame["no_grid"] = (~houses.s5cq14.astype(str).isin(GRID)).astype(float)
    frame["biomass_cooking"] = houses.s5cq22a.astype(str).isin(BIOMASS).astype(float)
    frame["water_unimproved"] = houses.s5cq1.astype(str).isin(UNIMPROVED_WATER).astype(float)
    frame["water_far"] = (pd.to_numeric(houses.s5cq4a, errors="coerce") > 500).astype(float)
    frame["toilet_unimproved"] = houses.s5cq25.astype(str).isin(UNIMPROVED_TOILET).astype(float)
    insured = (person.s3q2.astype(str) == "Yes").groupby(person.hhid).sum().reindex(index)
    frame["insured_share"] = insured / hh.member
    frame["any_disability"] = _any_by_household(person, difficulty).reindex(index).fillna(False).astype(float)
    frame["shock"] = _yes(houses.s5eq1).astype(float)
    frame["rural"] = hh.ur.astype(str).eq("Rural").astype(float)
    frame["no_phone"] = (~_any_by_household(person, _yes(person.s4bq8)).reindex(index).fillna(False)).astype(float)
    frame["no_internet"] = (~_yes(houses.s5cq20a)).astype(float)
    frame["earth_floor"] = houses.s5dq3.astype(str).isin(EARTH_FLOOR).astype(float)
    frame["no_livestock"] = (~_yes(houses.s7aq4)).astype(float)

    frame["no_account"] = (~(savings.s10cq4 == 1).groupby(savings.hhid).any()).reindex(index).fillna(True).astype(float)
    frame["tontine"] = (savings.s10cq8 == 1).groupby(savings.hhid).any().reindex(index).fillna(False).astype(float)
    frame["credit_denied"] = savings_like_any(credit.s10aq2.notna(), credit.hhid, index)
    frame["in_debt"] = savings_like_any(credit.s10aq3 == 1, credit.hhid, index)
    minutes = pd.to_numeric(services.s5fq3a, errors="coerce").fillna(0) * 60 + pd.to_numeric(services.s5fq3b, errors="coerce").fillna(0)
    for column, code in (("far_market", 2), ("far_transport", 4), ("far_health", 10)):
        chosen = services.s5fq0 == code
        if services[chosen].hhid.nunique() != len(hh):
            raise ValueError(f"Service {code} is not recorded for every household")
        frame[column] = (minutes[chosen].groupby(services.hhid[chosen]).max() > FAR_MINUTES).reindex(index).astype(float)
    owned = durables[durables.s10bq2 > 0]
    frame["durable_types"] = owned.groupby("hhid").s10bq0.nunique().reindex(index).fillna(0).astype(float)
    vehicles = owned[owned.s10bq0.isin([8, 9, 10])]
    frame["no_transport"] = (~frame.index.isin(vehicles.hhid)).astype(float)
    names = [item[0] for item in VARIABLES]
    # Missing values are filled with the national weighted mean and counted; a column with >2% missing stops the analysis.
    missing = frame[names].isna().mean()
    if (missing > 0.02).any():
        raise ValueError(f"Driver variables exceed the 2% missing-value limit: {missing[missing > 0.02].round(3).to_dict()}")
    frame.attrs["missing_filled"] = {name: int(frame[name].isna().sum()) for name in names if frame[name].isna().any()}
    frame.attrs["education_work_checks"] = education_work_checks
    for name in names:
        if frame[name].isna().any():
            frame[name] = frame[name].fillna(np.average(frame[name].dropna(), weights=frame.weight[frame[name].notna()]))
    return frame.reset_index()


def savings_like_any(flag: pd.Series, households: pd.Series, index: pd.Index) -> pd.Series:
    return flag.groupby(households).any().reindex(index).fillna(False).astype(float)


def _wmean(values: np.ndarray, weights: np.ndarray) -> np.ndarray:
    total = weights.sum()
    return (values * weights[:, None]).sum(axis=0) / total if values.ndim == 2 else float((values * weights).sum() / total)


def _fit(design: np.ndarray, poor: np.ndarray, weights: np.ndarray) -> np.ndarray:
    scaled = design * weights[:, None]
    gram = design.T @ scaled + np.eye(design.shape[1]) * 1e-8 * weights.sum()
    return np.linalg.solve(gram, scaled.T @ poor)


def _statistics(frame_values: dict, district_mask: np.ndarray, columns: list[str], binary: list[int]) -> dict:
    design, poor, weights = frame_values["design"], frame_values["poor"], frame_values["weight"]
    beta = _fit(design, poor, weights)
    national_mean = _wmean(design, weights)
    in_district = district_mask
    district_mean = _wmean(design[in_district], weights[in_district])
    contributions = beta * (district_mean - national_mean)
    contributions[0] = 0.0
    gap = _wmean(poor[in_district], weights[in_district]) - _wmean(poor, weights)
    profile = []
    for position in binary:
        flag = design[:, position] > 0.5
        row = []
        for selected in (in_district & flag, in_district & ~flag):
            row.append(_wmean(poor[selected], weights[selected]) if selected.any() and weights[selected].sum() > 0 else np.nan)
        profile.append(row)
    return {"beta": beta, "contribution": contributions, "district_mean": district_mean, "national_mean": national_mean, "gap": gap, "profile": np.array(profile)}


def _grade(group: dict, lower: float, upper: float, stability: float) -> str:
    excludes_zero = lower > 0 or upper < 0
    if not excludes_zero or stability < 0.9:
        return "Not established"
    if group["role"] == "marker":
        return "Moderate — sign of deprivation"
    return "Strong association" if abs(group["contribution_points"]) >= 1.0 and stability >= 0.95 else "Moderate association"


def _direction(points: float) -> str:
    return "raises" if points > 0 else "lowers"


def _strata_clusters(frame: pd.DataFrame) -> dict:
    """Row indices of every sampled cluster, grouped by stratum, for the stratified PSU bootstrap."""
    groups = frame.reset_index(drop=True).groupby(["strata", "clust"], observed=True).indices
    by_stratum: dict = {}
    for (stratum, cluster), rows in groups.items():
        by_stratum.setdefault(stratum, []).append(rows)
    if any(len(clusters) < 2 for clusters in by_stratum.values()):
        raise ValueError("A sampling stratum has fewer than two PSUs; the bootstrap needs a reviewed singleton-stratum rule")
    return by_stratum


def _weighted_r_squared(outcome: np.ndarray, fitted: np.ndarray, weights: np.ndarray) -> float:
    return float(1 - ((outcome - fitted) ** 2 * weights).sum() / ((outcome - _wmean(outcome, weights)) ** 2 * weights).sum())


def out_of_sample_r_squared(frame: pd.DataFrame, design: np.ndarray, outcome: np.ndarray, folds: int = FOLDS) -> float:
    """Weighted R-squared on households the model has not seen: five folds, each holding out whole clusters."""
    weights = frame.weight.to_numpy()
    clusters = np.unique(frame.clust.to_numpy())
    np.random.default_rng(SEED).shuffle(clusters)
    position = {cluster: index % folds for index, cluster in enumerate(clusters)}
    fold = np.array([position[cluster] for cluster in frame.clust.to_numpy()])
    predicted = np.zeros(len(outcome))
    for held_out in range(folds):
        train, test = fold != held_out, fold == held_out
        predicted[test] = design[test] @ _fit(design[train], outcome[train], weights[train])
    return _weighted_r_squared(outcome, predicted, weights)


def consumption_view(frame: pd.DataFrame, district: str, replicates: int = CONSUMPTION_REPLICATES) -> dict:
    """The same factors, applied to the district's gap in typical spending per adult equivalent.

    Poverty status is a threshold and is noisy: a household just above or just below the line looks very different. Spending is a steadier
    measure, so this view shows how much of the district's shortfall in living standards the measured factors line up with. Contributions are
    in percentage points of spending (log points x 100); a positive contribution lowers spending in the district relative to Rwanda.
    """
    if "log_consumption" not in frame.columns:
        raise ValueError("The living-standards view needs a log_consumption column")
    names = [item[0] for item in VARIABLES]
    design = np.column_stack([np.ones(len(frame)), frame[names].to_numpy(dtype="float64")])
    outcome, weights = frame.log_consumption.to_numpy(dtype="float64"), frame.weight.to_numpy()
    mask = frame.district.eq(district).to_numpy()
    if int(mask.sum()) < 100:
        raise ValueError("Too few surveyed households in the district for the living-standards view")

    def statistics(rows: np.ndarray, sample_mask: np.ndarray) -> tuple[np.ndarray, float]:
        beta = _fit(design[rows], outcome[rows], weights[rows])
        difference = _wmean(design[rows][sample_mask], weights[rows][sample_mask]) - _wmean(design[rows], weights[rows])
        contribution = beta * difference
        contribution[0] = 0.0
        return -100 * contribution, -100 * (_wmean(outcome[rows][sample_mask], weights[rows][sample_mask]) - _wmean(outcome[rows], weights[rows]))

    everyone = np.arange(len(frame))
    point, shortfall = statistics(everyone, mask)
    beta = _fit(design, outcome, weights)
    in_sample = _weighted_r_squared(outcome, design @ beta, weights)
    held_out = out_of_sample_r_squared(frame, design, outcome)
    poverty_held_out = out_of_sample_r_squared(frame, design, frame.poor.to_numpy())

    rng = np.random.default_rng(SEED)
    by_stratum = _strata_clusters(frame)
    draws, shortfall_draws = [], []
    for _ in range(replicates):
        rows = np.concatenate([clusters[i] for clusters in by_stratum.values() for i in rng.integers(0, len(clusters), len(clusters))])
        contribution, gap = statistics(rows, mask[rows])
        draws.append(contribution)
        shortfall_draws.append(gap)
    draws = np.array(draws)

    group_rows = []
    for group in GROUPS:
        positions = [position for position, item in enumerate(VARIABLES, start=1) if item[2] == group["id"]]
        group_draws = draws[:, positions].sum(axis=1)
        estimate = float(point[positions].sum())
        lower, upper = (round(float(np.percentile(group_draws, q)), 2) for q in (2.5, 97.5))
        stability = float((np.sign(group_draws) == np.sign(estimate)).mean()) if estimate else 0.0
        entry = {**group, "contribution_points": round(estimate, 2), "ci_lower": lower, "ci_upper": upper, "sign_stability": round(stability, 3)}
        entry["grade"] = _grade(entry, lower, upper, stability)
        group_rows.append(entry)
    explained = sum(item["contribution_points"] for item in group_rows)
    explained_causes = sum(item["contribution_points"] for item in group_rows if item["role"] != "marker")
    clear = abs(shortfall) >= 2
    shortfall_low, shortfall_high = (round(float(np.percentile(shortfall_draws, q)), 2) for q in (2.5, 97.5))
    unexplained_draws = np.array(shortfall_draws) - draws.sum(axis=1)
    ranked = sorted((item for item in group_rows if item["role"] != "marker" and item["contribution_points"] > 0 and item["grade"] != "Not established"), key=lambda item: -item["contribution_points"])
    return {
        "district": district, "outcome": "Typical spending per adult equivalent (geometric mean, real January 2024 prices)",
        "shortfall_points": round(shortfall, 2), "shortfall_ci": [shortfall_low, shortfall_high],
        "spending_difference_pct": round(100 * (float(np.exp(-shortfall / 100)) - 1), 1),
        "explained_points": round(explained, 2), "explained_excl_markers_points": round(explained_causes, 2), "unexplained_points": round(shortfall - explained, 2),
        "unexplained_ci": [round(float(np.percentile(unexplained_draws, 2.5)), 2), round(float(np.percentile(unexplained_draws, 97.5)), 2)],
        "explained_excl_markers_share_pct": round(100 * explained_causes / shortfall, 1) if clear else None,
        "explained_share_pct": round(100 * explained / shortfall, 1) if clear else None,
        "groups": group_rows, "ranked_drivers": [item["id"] for item in ranked],
        "weighted_r_squared": round(in_sample, 3),
        "explainability": {"living_standards_out_of_sample_r_squared": round(held_out, 3), "poverty_status_out_of_sample_r_squared": round(poverty_held_out, 3), "folds": FOLDS,
                           "note": "Out-of-sample R-squared is measured on households held out of the fit, in groups of whole survey clusters. It is the share of variation the measured household factors can predict for households they have not seen."},
        "bootstrap_replicates": replicates, "seed": SEED,
        "method": "The same linear decomposition as the poverty view, applied to log consumption per adult equivalent. The sign is flipped so a positive contribution means the factor lines up with lower spending in the district than in Rwanda.",
        "limitations": "Association, not cause. Deprivation markers (phones, housing materials, durable goods) are largely consequences of spending and are reported separately from causes and access factors.",
    }


def analyze_drivers(data_root: Path, district: str) -> dict:
    archives = list(data_root.rglob("*EICV7 2023-2024.zip"))
    if len(archives) != 1:
        raise ValueError(f"Expected one EICV7 cross-section archive; found {len(archives)}")
    notices: list = []
    with zipfile.ZipFile(archives[0]) as archive:
        frame = build_frame(archive, notices)
    if district not in set(frame.district):
        raise ValueError(f"Unknown EICV7 district: {district}")
    result = decompose(frame, district)
    result["consumption_view"] = consumption_view(frame, district)
    return result


def decompose(frame: pd.DataFrame, district: str, replicates: int = BOOTSTRAP_REPLICATES) -> dict:
    names = [item[0] for item in VARIABLES]
    design = np.column_stack([np.ones(len(frame)), frame[names].to_numpy(dtype="float64")])
    values = {"design": design, "poor": frame.poor.to_numpy(), "weight": frame.weight.to_numpy()}
    district_mask = frame.district.eq(district).to_numpy()
    if int(district_mask.sum()) < 100:
        raise ValueError("Too few surveyed households in the district for driver analysis")
    binary = [position + 1 for position, item in enumerate(VARIABLES) if item[3] == "binary"]
    point = _statistics(values, district_mask, names, binary)
    fitted = design @ point["beta"]
    weights = values["weight"]
    residual = ((values["poor"] - fitted) ** 2 * weights).sum()
    total = ((values["poor"] - _wmean(values["poor"], weights)) ** 2 * weights).sum()
    r_squared = float(1 - residual / total)

    # Stratified PSU bootstrap: resample clusters with replacement inside every stratum.
    rng = np.random.default_rng(SEED)
    by_stratum = _strata_clusters(frame)
    contribution_draws, profile_draws, gap_draws, unexplained_draws = [], [], [], []
    for _ in range(replicates):
        picked = []
        for clusters in by_stratum.values():
            picked.extend(clusters[i] for i in rng.integers(0, len(clusters), len(clusters)))
        rows = np.concatenate(picked)
        sample = {"design": design[rows], "poor": values["poor"][rows], "weight": values["weight"][rows]}
        statistics = _statistics(sample, district_mask[rows], names, binary)
        contribution_draws.append(statistics["contribution"])
        profile_draws.append(statistics["profile"])
        gap_draws.append(statistics["gap"])
        unexplained_draws.append(statistics["gap"] - statistics["contribution"].sum())
    contribution_draws = np.array(contribution_draws)
    profile_draws = np.array(profile_draws)

    variable_rows = []
    for position, item in enumerate(VARIABLES, start=1):
        name, label, group, kind, phrase = item
        draws = contribution_draws[:, position]
        variable_rows.append({
            "name": name, "label": label, "group": group, "kind": kind, "phrase": phrase,
            "coefficient_points": round(100 * float(point["beta"][position]), 3),
            "district_mean": round(float(point["district_mean"][position]), 4),
            "national_mean": round(float(point["national_mean"][position]), 4),
            "contribution_points": round(100 * float(point["contribution"][position]), 2),
            "ci_lower": round(100 * float(np.percentile(draws, 2.5)), 2), "ci_upper": round(100 * float(np.percentile(draws, 97.5)), 2),
        })
    group_rows = []
    for group in GROUPS:
        positions = [position for position, item in enumerate(VARIABLES, start=1) if item[2] == group["id"]]
        draws = contribution_draws[:, positions].sum(axis=1)
        estimate = 100 * float(point["contribution"][positions].sum())
        lower, upper = (round(100 * float(np.percentile(draws, q)), 2) for q in (2.5, 97.5))
        stability = float((np.sign(draws) == np.sign(estimate)).mean()) if estimate else 0.0
        entry = {**group, "contribution_points": round(estimate, 2), "ci_lower": lower, "ci_upper": upper, "sign_stability": round(stability, 3),
                 "variables": [row for row in variable_rows if row["group"] == group["id"]]}
        entry["grade"] = _grade(entry, lower, upper, stability)
        entry["effect"] = _direction(estimate)
        group_rows.append(entry)

    gap_points = 100 * float(point["gap"])
    explained = sum(item["contribution_points"] for item in group_rows)
    explained_causes = sum(item["contribution_points"] for item in group_rows if item["role"] != "marker")
    gap_low, gap_high = (100 * float(np.percentile(gap_draws, q)) for q in (2.5, 97.5))
    profile_rows = []
    for index, position in enumerate(binary):
        item = VARIABLES[position - 1]
        flag = design[:, position] > 0.5
        in_district = district_mask
        with_flag = in_district & flag
        without = in_district & ~flag
        n_with, n_without = int(with_flag.sum()), int(without.sum())
        poor_with = float((values["weight"][with_flag] * values["poor"][with_flag]).sum())
        poor_all = float((values["weight"][in_district] * values["poor"][in_district]).sum())
        people_with = float(values["weight"][with_flag].sum())
        rate_with, rate_without = point["profile"][index]
        draws_with, draws_without = profile_draws[:, index, 0], profile_draws[:, index, 1]
        stable = n_with >= MIN_CELL and n_without >= MIN_CELL
        row = {"name": item[0], "label": item[1], "group": item[2], "phrase": item[4],
               "sample_with": n_with, "sample_without": n_without,
               "district_prevalence_pct": round(100 * float(point["district_mean"][position]), 1),
               "national_prevalence_pct": round(100 * float(point["national_mean"][position]), 1),
               "status": "Estimated" if stable else "Suppressed: fewer than 30 surveyed households in a comparison group"}
        if stable:
            ratio = rate_with / rate_without if rate_without > 0 else None
            row.update({
                "poverty_with_pct": round(100 * float(rate_with), 1), "poverty_without_pct": round(100 * float(rate_without), 1),
                "poverty_with_ci": [round(100 * float(np.nanpercentile(draws_with, 2.5)), 1), round(100 * float(np.nanpercentile(draws_with, 97.5)), 1)],
                "poverty_without_ci": [round(100 * float(np.nanpercentile(draws_without, 2.5)), 1), round(100 * float(np.nanpercentile(draws_without, 97.5)), 1)],
                "risk_ratio": round(float(ratio), 2) if ratio else None,
                "share_of_district_poor_pct": round(100 * poor_with / poor_all, 1) if poor_all else None,
                "poor_people_with": int(round(poor_with)), "people_with": int(round(people_with)),
            })
        profile_rows.append(row)

    depth = _depth(frame, district)
    unexplained_low, unexplained_high = (round(100 * float(np.percentile(unexplained_draws, q)), 2) for q in (2.5, 97.5))
    place = _place_effect(frame, design, point["beta"], district)
    ranked = sorted((item for item in group_rows if item["role"] != "marker" and item["contribution_points"] > 0), key=lambda item: -item["contribution_points"])
    protective = sorted((item for item in group_rows if item["contribution_points"] < 0), key=lambda item: item["contribution_points"])
    markers = sorted((item for item in group_rows if item["role"] == "marker"), key=lambda item: -abs(item["contribution_points"]))
    return {
        "district": district, "survey": "EICV7 2023/24",
        "gap_points": round(gap_points, 2), "gap_ci": [round(gap_low, 2), round(gap_high, 2)],
        "explained_points": round(explained, 2), "unexplained_points": round(gap_points - explained, 2),
        "unexplained_ci": [unexplained_low, unexplained_high],
        "explained_excl_markers_points": round(explained_causes, 2),
        "explained_excl_markers_share_pct": round(100 * explained_causes / gap_points, 1) if abs(gap_points) >= 2 else None,
        "explained_share_pct": round(100 * explained / gap_points, 1) if abs(gap_points) >= 2 else None,
        "place_effect": place,
        "groups": group_rows, "ranked_drivers": [item["id"] for item in ranked], "protective_factors": [item["id"] for item in protective],
        "marker_groups": [item["id"] for item in markers],
        "profile": sorted(profile_rows, key=lambda item: (-(item.get("share_of_district_poor_pct") or 0), item["label"])),
        "depth": depth,
        "model": {"households": int(len(frame)), "district_households": int(district_mask.sum()), "weighted_r_squared": round(r_squared, 3),
                  "bootstrap_replicates": replicates, "seed": SEED, "variables": len(VARIABLES),
                  "missing_values_filled": frame.attrs.get("missing_filled", {}), "education_work_checks": frame.attrs.get("education_work_checks", [])},
        "method": "A weighted linear probability model of being poor (population weights) is fitted on all EICV7 households. A district's gap to Rwanda is split with an Oaxaca-Blinder decomposition: each factor's contribution is its national coefficient multiplied by the district-minus-national difference in that factor. Factors are grouped into themes. Intervals come from a stratified PSU bootstrap (300 replicates, fixed seed). The remainder is the unexplained gap: unmeasured factors and places where a factor works differently locally.",
        "interpretation": "A contribution says how many percentage points of the district gap line up with a factor after the other measured factors are held fixed. It is an adjusted association, not a proven cause. Housing, phone and durable-goods factors are shown separately as signs of deprivation: poverty also causes them, and durable goods are partly counted inside the consumption measure that defines poverty, so their share of the gap is not an independent explanation.",
        "limitations": "Consumption poverty can both cause and follow several of these factors. The linear model ignores interactions, the 2023/24 survey cannot show change over time, and unmeasured factors (land quality, markets, governance, local shocks, social protection delivery) sit in the unexplained part. Statements about causes need local verification and, for interventions, impact evidence.",
        "not_measured": [
            "Land size, soil quality and crop yields (the supplied EICV7 cross-section has livestock but no plot or land-area module)",
            "Formal financial-institution coverage and FinScope district estimates (FinScope is not record-linked to EICV7)",
            "Quality and staffing of schools, clinics and markets (only travel time is measured)",
            "Social-protection eligibility, payments and delivery quality (administrative data is not connected)",
            "Local prices, employer demand and climate or crop shocks (external sources registered, not yet district-linked)",
        ],
    }


def _place_effect(frame: pd.DataFrame, design: np.ndarray, beta: np.ndarray, district: str) -> dict:
    """Mean residual of the national model by district: poverty the measured household factors do not account for."""
    residual = frame.poor.to_numpy() - design @ beta
    weights = frame.weight.to_numpy()
    rows = []
    for name, group in frame.groupby("district", observed=True):
        mask = frame.district.eq(name).to_numpy()
        rows.append({"district": str(name), "province": str(group.province.iloc[0]), "unexplained_points": round(100 * float((residual[mask] * weights[mask]).sum() / weights[mask].sum()), 1)})
    rows.sort(key=lambda row: -row["unexplained_points"])
    for position, row in enumerate(rows, start=1):
        row["rank"] = position
    chosen = next(row for row in rows if row["district"] == district)
    peers = [row for row in rows if row["province"] == chosen["province"] and row["district"] != district]
    shared = [row for row in peers if row["unexplained_points"] * chosen["unexplained_points"] > 0 and abs(row["unexplained_points"]) >= 2]
    if abs(chosen["unexplained_points"]) < 2:
        reading = "The household factors account for this district about as well as for the country; there is no clear place effect."
    elif len(shared) >= max(2, len(peers) // 2):
        reading = f"{len(shared)} of {len(peers)} other {chosen['province']} districts show a residual in the same direction, which points to a regional factor (agro-ecology, market access or programme coverage) rather than something unique to {district}."
    else:
        reading = f"Few other {chosen['province']} districts share this residual, which points to a factor specific to {district} or its immediate surroundings."
    return {"district": chosen, "peers": peers, "districts": rows, "reading": reading,
            "note": "Residual = actual poverty minus the poverty the national household model predicts for the district's households. It combines unmeasured conditions and places where measured factors work differently."}


def _depth(frame: pd.DataFrame, district: str) -> dict:
    def block(subset: pd.DataFrame) -> dict:
        weights = subset.weight.to_numpy()
        total = float(weights.sum())
        poor = subset.poor.to_numpy() > 0.5
        poor_weight = float(weights[poor].sum())
        return {
            "population": int(round(total)), "poor_people": int(round(poor_weight)),
            "headcount_pct": round(100 * poor_weight / total, 1),
            "poverty_gap_pct": round(100 * float((weights * subset.fgt1.to_numpy()).sum() / total), 2),
            "severity_pct": round(100 * float((weights * subset.fgt2.to_numpy()).sum() / total), 2),
            "mean_shortfall_among_poor_pct": round(100 * float((weights[poor] * subset.fgt1.to_numpy()[poor]).sum() / poor_weight), 1) if poor_weight else None,
        }
    selected, national = block(frame[frame.district == district]), block(frame)
    return {"district": selected, "national": national,
            "note": "Poverty gap = average shortfall below the poverty line across all people (non-poor count as zero). Severity squares the shortfall to emphasise the poorest. Population and poor-people counts are survey-weighted estimates, not census counts.",
            "definition": "Shortfall = (poverty line − consumption per adult equivalent) ÷ poverty line, in January 2024 prices. The calculation reproduces NISR's poor classification for every household before it is used."}
