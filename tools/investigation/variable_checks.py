"""Check more EICV7 variables against figures NISR has published before they are marked Used.

Each check recomputes one published national figure (EICV7 Main Indicators Report 2023/24) from the survey records with the household weight and
compares it with the published value inside a stated tolerance. A column is validated only when every check that reads it passes.
Aggregate-only: records stay in memory and the result holds weighted estimates.

Tolerances are fixed before looking at estimates: 0.2 points for shares the report prints to one decimal, 0.3 points for person-level shares
(the report weights persons with population weights), 0.5 points for figures the report prints only as whole percentages.
"""

from __future__ import annotations

import zipfile
from pathlib import Path

import numpy as np
import pandas as pd

from .analysis import HOUSEHOLD, PERSON, _read

REPORT = "NISR EICV7 Main Indicators Report 2023/24"
HH_TOL, PERSON_TOL, ROUNDED_TOL = 0.2, 0.3, 0.5

# Columns read for the checks; the module test requires each one to be listed as Used or recorded in NOT_VALIDATED.
HOUSEHOLD_COLUMNS = ["weight", "s5aq1", "s5aq2", "s5aq8", "s5dq1", "s5dq2", "s5dq4", "s5cq3", "s5cq13", "s5cq16", "s5cq21", "s5cq24", "s5cq26", "s5cq31", "s5cq32", "s5cq33", "s5cq34", "s5cq25"]
PERSON_COLUMNS = ["weight", "s1q3y", "s1q12", "s1q13", "s3q2", "s3q3", "s3q4", "s3q5", "s4aq11", "s4bq7", "s4bq13b", "s4bq14a", "s4bq14b", "s4bq14c", "s4bq14d",
                  "s4bq14e", "s4bq14f", "s4bq14g", "s4bq14h", "s4bq14i", "s6bq4"]
# Columns the checks read that failed to reproduce NISR and so stay "Requires processing"; filled from the recorded results below.
NOT_VALIDATED = {("person", "s1q12"), ("person", "s1q13"), ("person", "s6bq4")}

IMPROVED_WATER = {"Piped into Dwelling", "Piped into compound, yard/pot", "Piped to neighbor HH3", "Piped to neighbor HH", "Public tap/standpipe", "Tube Well/Borehole",
                  "Protected spring", "Protected well", "Rain water", "Bottled water", "Tanker Truck"}
SLAB_OR_BETTER = {"Pit Latrine with constructed floor slab", "Ventilated improved pit (VIP) latrine"}
FLUSH = {"Flush to pit latrine", "Flush to septic tank", "Flush to piped sewer system"}
SOLAR = ("Standalone solar", "Solar lantern", "Private Solar")
ORPHAN_AGE = 18


# Recorded run on the EICV7 2023/24 cross-section (table, columns, measure, published, estimate, tolerance, report table). Recompute with
# `python -m tools.investigation.variable_checks Data`; a check passes when |estimate - published| <= tolerance.
RECORDED_RESULTS = [
    ["household", ["s5aq1"], "Umudugudu planned rural settlement (% of households)", 67.9, 67.87, 0.2, "Table 5.2 / Table 0.1"],
    ["household", ["s5aq1"], "Integrated model village", 0.7, 0.74, 0.2, "Table 5.2"],
    ["household", ["s5aq1"], "Dispersed or isolated housing", 15.6, 15.55, 0.2, "Table 5.2"],
    ["household", ["s5aq1"], "Modern planned urban area", 6.3, 6.34, 0.2, "Table 5.2"],
    ["household", ["s5aq1"], "Spontaneous, informal or unplanned housing", 9.5, 9.5, 0.2, "Table 5.2"],
    ["household", ["s5aq2"], "Single house occupied by one household", 85.2, 85.22, 0.2, "Table 5.1"],
    ["household", ["s5aq2"], "House occupied by several households", 8.9, 8.9, 0.2, "Table 5.1"],
    ["household", ["s5aq2"], "Compound of buildings with several households", 4.4, 4.43, 0.2, "Table 5.1"],
    ["household", ["s5aq2"], "Compound of buildings with one household", 1.2, 1.17, 0.2, "Table 5.1"],
    ["household", ["s5aq8"], "Owner-occupied dwelling", 72.4, 72.37, 0.2, "Table 5.3"],
    ["household", ["s5aq8"], "Rented dwelling", 21.3, 21.35, 0.2, "Table 5.3"],
    ["household", ["s5aq8"], "Dwelling provided by employer", 0.4, 0.39, 0.2, "Table 5.3"],
    ["household", ["s5aq8"], "Dwelling provided free of charge", 5.6, 5.6, 0.2, "Table 5.3"],
    ["household", ["s5dq1"], "Wall of mud bricks", 28.0, 27.99, 0.2, "Table 5.8"],
    ["household", ["s5dq1"], "Wall of mud bricks with cement", 42.4, 42.38, 0.2, "Table 5.8"],
    ["household", ["s5dq1"], "Wall of tree trunks with mud", 15.9, 15.85, 0.2, "Table 5.8"],
    ["household", ["s5dq1"], "Wall of tree trunks with mud and cement", 7.9, 7.87, 0.2, "Table 5.8"],
    ["household", ["s5dq1"], "Wall of oven-fired bricks", 4.5, 4.5, 0.2, "Table 5.8"],
    ["household", ["s5dq2"], "Metal sheet roof", 75.8, 75.81, 0.2, "Table 5.6 / Table 0.1"],
    ["household", ["s5dq2"], "Local clay tile roof", 24.1, 24.07, 0.2, "Table 5.6"],
    ["household", ["s5dq4"], "Mean floor area of dwelling (m2)", 42.4, 42.63, 0.3, "Table 5.4"],
    ["household", ["s5cq21"], "Self-built solid fuel stove", 3.1, 3.1, 0.2, "Table 5.10"],
    ["household", ["s5cq21"], "Charcoal stove", 21.6, 21.57, 0.2, "Table 5.10"],
    ["household", ["s5cq21"], "Improved cooking stove", 33.7, 33.73, 0.2, "Table 5.10"],
    ["household", ["s5cq21"], "Three-stone or traditional stove", 35.6, 35.59, 0.2, "Table 5.10"],
    ["household", ["s5cq21"], "Gas, electric or biogas stove", 5.4, 5.39, 0.2, "Table 5.10"],
    ["household", ["s5cq16"], "Grid electricity as main lighting", 50.0, 49.93, 0.2, "Table 5.11"],
    ["household", ["s5cq16"], "Torch or phone flashlight as main lighting", 25.0, 25.0, 0.2, "Table 5.11"],
    ["household", ["s5cq16"], "Solar as main lighting", 22.1, 22.05, 0.2, "Table 5.11"],
    ["household", ["s5cq16"], "Candle as main lighting", 0.9, 0.91, 0.2, "Table 5.11 / Table 0.1"],
    ["household", ["s5cq3"], "Improved drinking water source", 89.7, 89.66, 0.2, "Table 5.13 / Table 0.1"],
    ["household", ["s5cq3"], "Public tap or standpipe", 33.4, 33.37, 0.2, "Table 5.13"],
    ["household", ["s5cq3"], "Protected spring", 31.2, 31.25, 0.2, "Table 5.13"],
    ["household", ["s5cq3"], "Unprotected spring", 6.4, 6.43, 0.2, "Table 5.13"],
    ["household", ["s5cq13"], "Households managing rainwater", 22.2, 22.18, 0.2, "Table 5.15"],
    ["household", ["s5cq25"], "Improved sanitation", 94.3, 94.35, 0.2, "Table 5.16 / Table 0.1"],
    ["household", ["s5cq25", "s5cq26"], "Improved sanitation not shared with another household", 72.4, 72.4, 0.2, "Table 5.16"],
    ["household", ["s5cq24"], "Publicly managed refuse area", 1.7, 1.75, 0.2, "Table 7.1"],
    ["household", ["s5cq24"], "Rubbish collection service", 11.0, 10.96, 0.2, "Table 7.1"],
    ["household", ["s5cq24"], "Rubbish thrown in own fields or bushes", 38.5, 38.46, 0.2, "Table 7.1"],
    ["household", ["s5cq24"], "Compost heap on own property", 48.5, 48.51, 0.2, "Table 7.1"],
    ["household", ["s5cq33"], "Received environmental information", 85.4, 85.43, 0.2, "Table 7.2"],
    ["household", ["s5cq34", "s5cq33"], "Radio or TV as main source (of those informed)", 50.6, 50.59, 0.2, "Table 7.2"],
    ["household", ["s5cq34", "s5cq33"], "Meetings or trainings as main source (of those informed)", 46.8, 46.84, 0.2, "Table 7.2"],
    ["household", ["s5cq31"], "Dwelling affected by environmental destruction", 16.7, 16.68, 0.2, "Table 7.3"],
    ["household", ["s5cq32", "s5cq31"], "Heavy rain (of those affected)", 57.1, 57.11, 0.5, "Table 7.3"],
    ["household", ["s5cq32", "s5cq31"], "Heavy wind (of those affected)", 32.9, 32.9, 0.5, "Table 7.3"],
    ["person", ["s3q3", "s3q2"], "Community-based insurance (of the insured)", 92.5, 92.55, 0.3, "Table 3.5"],
    ["person", ["s3q3", "s3q2"], "RSSB insurance (of the insured)", 4.6, 4.56, 0.3, "Table 3.5"],
    ["person", ["s3q4"], "Reported illness or injury in the last 4 weeks", 27.1, 27.08, 0.3, "Table 3.2"],
    ["person", ["s3q5", "s3q4"], "Made a medical consultation (of those reporting a health problem)", 71.0, 70.93, 0.3, "Table 3.2"],
    ["person", ["s4aq11", "s1q3y"], "Public or government-subsidized school (ages 6-30 attending)", 91.2, 91.22, 0.3, "Table 4.3"],
    ["person", ["s4bq7", "s1q3y"], "Numeracy, aged 15+", 77.6, 77.59, 0.3, "Table 4.8"],
    ["person", ["s4bq7", "s1q3y"], "Numeracy, aged 15-24", 88.8, 88.83, 0.3, "Table 4.9"],
    ["person", ["s4bq13b", "s1q3y"], "Computer literacy, aged 10+", 11.0, 11.04, 0.3, "Table 4.10"],
    ["person", ["s4bq13b", "s1q3y"], "Computer literacy, aged 15+", 12.8, 12.78, 0.3, "Table 4.10"],
    ["person", ["s4bq13b", "s1q3y"], "Computer literacy, aged 15-24", 15.6, 15.58, 0.3, "Table 4.10"],
    ["person", ["s4bq14a", "s1q3y"], "Used computer skill in last 3 months: copying or moving a file, aged 10+", 5.6, 5.57, 0.3, "Table 4.11"],
    ["person", ["s4bq14b", "s1q3y"], "Used computer skill in last 3 months: copy and paste, aged 10+", 5.5, 5.52, 0.3, "Table 4.11"],
    ["person", ["s4bq14c", "s1q3y"], "Used computer skill in last 3 months: e-mail with attachments, aged 10+", 4.4, 4.38, 0.3, "Table 4.11"],
    ["person", ["s4bq14d", "s1q3y"], "Used computer skill in last 3 months: spreadsheet formula, aged 10+", 4.4, 4.36, 0.3, "Table 4.11"],
    ["person", ["s4bq14e", "s1q3y"], "Used computer skill in last 3 months: connecting new devices, aged 10+", 4.5, 4.52, 0.3, "Table 4.11"],
    ["person", ["s4bq14f", "s1q3y"], "Used computer skill in last 3 months: installing software, aged 10+", 3.3, 3.31, 0.3, "Table 4.11"],
    ["person", ["s4bq14g", "s1q3y"], "Used computer skill in last 3 months: presentations, aged 10+", 2.5, 2.49, 0.3, "Table 4.11"],
    ["person", ["s4bq14h", "s1q3y"], "Used computer skill in last 3 months: transferring files, aged 10+", 4.6, 4.58, 0.3, "Table 4.11"],
    ["person", ["s4bq14i", "s1q3y"], "Used computer skill in last 3 months: writing a program, aged 10+", 1.3, 1.27, 0.3, "Table 4.11"],
    ["person", ["s1q12", "s1q13", "s1q3y"], "Not an orphan (aged 0-17)", 92.8, 94.54, 0.3, "Table 1.5"],
    ["person", ["s1q12", "s1q13", "s1q3y"], "Single orphan (aged 0-17)", 6.7, 5.15, 0.3, "Table 1.5"],
    ["person", ["s1q12", "s1q13", "s1q3y"], "Double orphan (aged 0-17)", 0.5, 0.3, 0.3, "Table 1.5"],
    ["person", ["s6bq4"], "Agriculture, forestry and fishing share of workers (main activity)", 61.6, 62.07, 0.3, "Table 6.2"],
    ["person", ["s6bq4"], "Construction share of workers (main activity)", 6.5, 6.36, 0.3, "Table 6.2"],
    ["person", ["s6bq4"], "Wholesale and retail trade share of workers (main activity)", 9.3, 9.23, 0.3, "Table 6.2"],
    ["person", ["s6bq4"], "Manufacturing share of workers (main activity)", 3.5, 3.44, 0.3, "Table 6.2"],
    ["person", ["s6bq4"], "Transportation and storage share of workers (main activity)", 3.4, 3.33, 0.3, "Table 6.2"],
    ["person", ["s6bq4"], "Households as employers share of workers (main activity)", 3.1, 3.13, 0.3, "Table 6.2"],
    ["person", ["s6bq4"], "Education share of workers (main activity)", 2.4, 2.28, 0.3, "Table 6.2"],
    ["person", ["s6bq4"], "Accommodation and food services share of workers (main activity)", 2.1, 2.05, 0.3, "Table 6.2"],
    ["person", ["s6bq4"], "Public administration share of workers (main activity)", 1.7, 1.68, 0.3, "Table 6.2"],
    ["person", ["s6bq4"], "Other service activities share of workers (main activity)", 1.6, 1.54, 0.3, "Table 6.2"],
    ["person", ["s6bq4"], "Mining and quarrying share of workers (main activity)", 1.1, 1.12, 0.3, "Table 6.2"],
]


def _is(series: pd.Series, *labels: str) -> pd.Series:
    return series.astype(str).isin(labels)


def _starts(series: pd.Series, prefix: str) -> pd.Series:
    return series.astype(str).str.startswith(prefix)


def _share(frame: pd.DataFrame, mask: pd.Series, base: pd.Series | None = None) -> float:
    weights = pd.to_numeric(frame.weight, errors="coerce")
    if weights.isna().any() or (weights <= 0).any():
        raise ValueError("Survey weights must be present and positive for every record")
    base = pd.Series(True, index=frame.index) if base is None else base.fillna(False)
    return 100 * float(weights[base & mask.fillna(False)].sum()) / float(weights[base].sum())


def _mean(frame: pd.DataFrame, column: str) -> float:
    values = pd.to_numeric(frame[column], errors="coerce")
    keep = values.notna()
    return float((frame.weight[keep] * values[keep]).sum() / frame.weight[keep].sum())


def _hh(column: str, published: float, label: str, table: str, mask, base=None, tolerance: float = HH_TOL, columns: tuple[str, ...] | None = None):
    return {"table": "household", "columns": columns or (column,), "measure": label, "published": published, "tolerance": tolerance, "source": f"{REPORT}, {table}",
            "mask": mask, "base": base}


def _pp(column: str, published: float, label: str, table: str, mask, base=None, tolerance: float = PERSON_TOL, columns: tuple[str, ...] | None = None):
    return {"table": "person", "columns": columns or (column,), "measure": label, "published": published, "tolerance": tolerance, "source": f"{REPORT}, {table}",
            "mask": mask, "base": base}


def _orphan(person: pd.DataFrame):
    father_dead, mother_dead = person.s1q12.astype(str).eq("No"), person.s1q13.astype(str).eq("No")
    return father_dead, mother_dead


def _age(person: pd.DataFrame) -> pd.Series:
    return pd.to_numeric(person.s1q3y, errors="coerce")


def _workers(person: pd.DataFrame) -> pd.Series:
    return person.s6bq4.notna()


def _sector(prefix: str, published: float, label: str):
    return _pp("s6bq4", published, f"{label} share of workers (main activity)", "Table 6.2", lambda p: _starts(p.s6bq4, prefix), _workers, PERSON_TOL)


COMPUTER_SKILLS = [("s4bq14a", 5.6, "copying or moving a file"), ("s4bq14b", 5.5, "copy and paste"), ("s4bq14c", 4.4, "e-mail with attachments"), ("s4bq14d", 4.4, "spreadsheet formula"),
                   ("s4bq14e", 4.5, "connecting new devices"), ("s4bq14f", 3.3, "installing software"), ("s4bq14g", 2.5, "presentations"), ("s4bq14h", 4.6, "transferring files"),
                   ("s4bq14i", 1.3, "writing a program")]

CHECKS = [
    # Type of habitat, dwelling and occupancy
    _hh("s5aq1", 67.9, "Umudugudu planned rural settlement (% of households)", "Table 5.2 / Table 0.1", lambda h: _starts(h.s5aq1, "Umudugudu")),
    _hh("s5aq1", 0.7, "Integrated model village", "Table 5.2", lambda h: _starts(h.s5aq1, "Integrated")),
    _hh("s5aq1", 15.6, "Dispersed or isolated housing", "Table 5.2", lambda h: _starts(h.s5aq1, "Dispersed")),
    _hh("s5aq1", 6.3, "Modern planned urban area", "Table 5.2", lambda h: _starts(h.s5aq1, "Modern planned")),
    _hh("s5aq1", 9.5, "Spontaneous, informal or unplanned housing", "Table 5.2", lambda h: _starts(h.s5aq1, "Spontaneous")),
    _hh("s5aq2", 85.2, "Single house occupied by one household", "Table 5.1", lambda h: _is(h.s5aq2, "House occupied by one household")),
    _hh("s5aq2", 8.9, "House occupied by several households", "Table 5.1", lambda h: _is(h.s5aq2, "House occupied by multiple Households")),
    _hh("s5aq2", 4.4, "Compound of buildings with several households", "Table 5.1", lambda h: _starts(h.s5aq2, "Several buildings in a compound occupied by several")),
    _hh("s5aq2", 1.2, "Compound of buildings with one household", "Table 5.1", lambda h: _starts(h.s5aq2, "Several buildings in a compound occupied by one")),
    _hh("s5aq8", 72.4, "Owner-occupied dwelling", "Table 5.3", lambda h: _is(h.s5aq8, "Owner occupied")),
    _hh("s5aq8", 21.3, "Rented dwelling", "Table 5.3", lambda h: _starts(h.s5aq8, "Tenancy")),
    _hh("s5aq8", 0.4, "Dwelling provided by employer", "Table 5.3", lambda h: _starts(h.s5aq8, "Dwelling provided by employer")),
    _hh("s5aq8", 5.6, "Dwelling provided free of charge", "Table 5.3", lambda h: _starts(h.s5aq8, "Dwelling provided free")),
    # Building materials
    _hh("s5dq1", 28.0, "Wall of mud bricks", "Table 5.8", lambda h: _is(h.s5dq1, "Mud bricks")),
    _hh("s5dq1", 42.4, "Wall of mud bricks with cement", "Table 5.8", lambda h: _is(h.s5dq1, "Mud bricks with cement")),
    _hh("s5dq1", 15.9, "Wall of tree trunks with mud", "Table 5.8", lambda h: _is(h.s5dq1, "Tree trunks with mud")),
    _hh("s5dq1", 7.9, "Wall of tree trunks with mud and cement", "Table 5.8", lambda h: _starts(h.s5dq1, "Tree trunks with") & ~_is(h.s5dq1, "Tree trunks with mud")),
    _hh("s5dq1", 4.5, "Wall of oven-fired bricks", "Table 5.8", lambda h: _starts(h.s5dq1, "Oven fired bricks")),
    _hh("s5dq2", 75.8, "Metal sheet roof", "Table 5.6 / Table 0.1", lambda h: _starts(h.s5dq2, "Metal sheets")),
    _hh("s5dq2", 24.1, "Local clay tile roof", "Table 5.6", lambda h: _is(h.s5dq2, "Local clay tiles")),
    _hh("s5dq4", 42.4, "Mean floor area of dwelling (m2)", "Table 5.4", None, tolerance=0.3),
    # Energy and cooking
    _hh("s5cq21", 3.1, "Self-built solid fuel stove", "Table 5.10", lambda h: _is(h.s5cq21, "Self-built solid fuel stove")),
    _hh("s5cq21", 21.6, "Charcoal stove", "Table 5.10", lambda h: _is(h.s5cq21, "Charcoal/fire stove")),
    _hh("s5cq21", 33.7, "Improved cooking stove", "Table 5.10", lambda h: _is(h.s5cq21, "Improved cooking stove")),
    _hh("s5cq21", 35.6, "Three-stone or traditional stove", "Table 5.10", lambda h: _starts(h.s5cq21, "Three stone")),
    _hh("s5cq21", 5.4, "Gas, electric or biogas stove", "Table 5.10", lambda h: _is(h.s5cq21, "Cooking gas stove", "Biogas stove", "Electric stove")),
    _hh("s5cq16", 50.0, "Grid electricity as main lighting", "Table 5.11", lambda h: _starts(h.s5cq16, "Electricity from National Grid")),
    _hh("s5cq16", 25.0, "Torch or phone flashlight as main lighting", "Table 5.11", lambda h: _starts(h.s5cq16, "Torch")),
    _hh("s5cq16", 22.1, "Solar as main lighting", "Table 5.11", lambda h: h.s5cq16.astype(str).str.startswith(SOLAR)),
    _hh("s5cq16", 0.9, "Candle as main lighting", "Table 5.11 / Table 0.1", lambda h: _is(h.s5cq16, "Candle")),
    # Water, sanitation and waste
    _hh("s5cq3", 89.7, "Improved drinking water source", "Table 5.13 / Table 0.1", lambda h: _is(h.s5cq3, *IMPROVED_WATER)),
    _hh("s5cq3", 33.4, "Public tap or standpipe", "Table 5.13", lambda h: _is(h.s5cq3, "Public tap/standpipe")),
    _hh("s5cq3", 31.2, "Protected spring", "Table 5.13", lambda h: _is(h.s5cq3, "Protected spring")),
    _hh("s5cq3", 6.4, "Unprotected spring", "Table 5.13", lambda h: _is(h.s5cq3, "Unprotected spring")),
    _hh("s5cq13", 22.2, "Households managing rainwater", "Table 5.15", lambda h: ~_is(h.s5cq13, "No measures")),
    _hh("s5cq25", 94.3, "Improved sanitation", "Table 5.16 / Table 0.1", lambda h: _is(h.s5cq25, *SLAB_OR_BETTER, *FLUSH, "Composting toilet"), columns=("s5cq25",)),
    _hh("s5cq25", 72.4, "Improved sanitation not shared with another household", "Table 5.16", lambda h: _is(h.s5cq25, *SLAB_OR_BETTER, *FLUSH, "Composting toilet") & h.s5cq26.astype(str).eq("No"), columns=("s5cq25", "s5cq26")),
    _hh("s5cq24", 1.7, "Publicly managed refuse area", "Table 7.1", lambda h: _starts(h.s5cq24, "Publicly managed")),
    _hh("s5cq24", 11.0, "Rubbish collection service", "Table 7.1", lambda h: _starts(h.s5cq24, "Rubbish collection")),
    _hh("s5cq24", 38.5, "Rubbish thrown in own fields or bushes", "Table 7.1", lambda h: _starts(h.s5cq24, "Thrown in the household")),
    _hh("s5cq24", 48.5, "Compost heap on own property", "Table 7.1", lambda h: _starts(h.s5cq24, "Compost heap")),
    # Environment information and damage
    _hh("s5cq33", 85.4, "Received environmental information", "Table 7.2", lambda h: h.s5cq33.astype(str).eq("Yes")),
    _hh("s5cq34", 50.6, "Radio or TV as main source (of those informed)", "Table 7.2", lambda h: _starts(h.s5cq34, "Radio"), lambda h: h.s5cq33.astype(str).eq("Yes"), tolerance=HH_TOL, columns=("s5cq34", "s5cq33")),
    _hh("s5cq34", 46.8, "Meetings or trainings as main source (of those informed)", "Table 7.2", lambda h: _starts(h.s5cq34, "Meetings"), lambda h: h.s5cq33.astype(str).eq("Yes"), columns=("s5cq34", "s5cq33")),
    _hh("s5cq31", 16.7, "Dwelling affected by environmental destruction", "Table 7.3", lambda h: h.s5cq31.astype(str).eq("Yes")),
    _hh("s5cq32", 57.1, "Heavy rain (of those affected)", "Table 7.3", lambda h: _is(h.s5cq32, "Heavy rain"), lambda h: h.s5cq31.astype(str).eq("Yes"), tolerance=0.5, columns=("s5cq32", "s5cq31")),
    _hh("s5cq32", 32.9, "Heavy wind (of those affected)", "Table 7.3", lambda h: _is(h.s5cq32, "Heavy Wind"), lambda h: h.s5cq31.astype(str).eq("Yes"), tolerance=0.5, columns=("s5cq32", "s5cq31")),
    # Health
    _pp("s3q3", 92.5, "Community-based insurance (of the insured)", "Table 3.5", lambda p: _starts(p.s3q3, "CBHI"), lambda p: p.s3q2.astype(str).eq("Yes"), columns=("s3q3", "s3q2")),
    _pp("s3q3", 4.6, "RSSB insurance (of the insured)", "Table 3.5", lambda p: _starts(p.s3q3, "RSSB"), lambda p: p.s3q2.astype(str).eq("Yes"), columns=("s3q3", "s3q2")),
    _pp("s3q4", 27.1, "Reported illness or injury in the last 4 weeks", "Table 3.2", lambda p: p.s3q4.astype(str).eq("Yes")),
    _pp("s3q5", 71.0, "Made a medical consultation (of those reporting a health problem)", "Table 3.2", lambda p: p.s3q5.astype(str).str.startswith("Yes"), lambda p: p.s3q4.astype(str).eq("Yes"), columns=("s3q5", "s3q4")),
    # Education, numeracy and computer skills
    _pp("s4aq11", 91.2, "Public or government-subsidized school (ages 6-30 attending)", "Table 4.3", lambda p: _is(p.s4aq11, "Public", "Government subsidized"), lambda p: p.s4aq11.notna() & _age(p).between(6, 30), tolerance=PERSON_TOL, columns=("s4aq11", "s1q3y")),
    _pp("s4bq7", 77.6, "Numeracy, aged 15+", "Table 4.8", lambda p: p.s4bq7.astype(str).eq("Yes"), lambda p: _age(p) >= 15, columns=("s4bq7", "s1q3y")),
    _pp("s4bq7", 88.8, "Numeracy, aged 15-24", "Table 4.9", lambda p: p.s4bq7.astype(str).eq("Yes"), lambda p: _age(p).between(15, 24), columns=("s4bq7", "s1q3y")),
    _pp("s4bq13b", 11.0, "Computer literacy, aged 10+", "Table 4.10", lambda p: p.s4bq13b.astype(str).eq("Yes"), lambda p: _age(p) >= 10, columns=("s4bq13b", "s1q3y")),
    _pp("s4bq13b", 12.8, "Computer literacy, aged 15+", "Table 4.10", lambda p: p.s4bq13b.astype(str).eq("Yes"), lambda p: _age(p) >= 15, columns=("s4bq13b", "s1q3y")),
    _pp("s4bq13b", 15.6, "Computer literacy, aged 15-24", "Table 4.10", lambda p: p.s4bq13b.astype(str).eq("Yes"), lambda p: _age(p).between(15, 24), columns=("s4bq13b", "s1q3y")),
    *[_pp(column, value, f"Used computer skill in last 3 months: {label}, aged 10+", "Table 4.11", (lambda c: lambda p: p[c].astype(str).eq("Yes"))(column), lambda p: _age(p) >= 10, columns=(column, "s1q3y"))
      for column, value, label in COMPUTER_SKILLS],
    # Orphan status of children 0-17
    _pp("s1q12", 92.8, "Not an orphan (aged 0-17)", "Table 1.5", lambda p: ~(_orphan(p)[0] | _orphan(p)[1]), lambda p: _age(p) < ORPHAN_AGE, columns=("s1q12", "s1q13", "s1q3y")),
    _pp("s1q12", 6.7, "Single orphan (aged 0-17)", "Table 1.5", lambda p: _orphan(p)[0] ^ _orphan(p)[1], lambda p: _age(p) < ORPHAN_AGE, columns=("s1q12", "s1q13", "s1q3y")),
    _pp("s1q12", 0.5, "Double orphan (aged 0-17)", "Table 1.5", lambda p: _orphan(p)[0] & _orphan(p)[1], lambda p: _age(p) < ORPHAN_AGE, columns=("s1q12", "s1q13", "s1q3y")),
    # Main economic activity of workers
    _sector("A:", 61.6, "Agriculture, forestry and fishing"), _sector("F:", 6.5, "Construction"), _sector("G:", 9.3, "Wholesale and retail trade"),
    _sector("C:", 3.5, "Manufacturing"), _sector("H:", 3.4, "Transportation and storage"), _sector("T:", 3.1, "Households as employers"),
    _sector("P:", 2.4, "Education"), _sector("I:", 2.1, "Accommodation and food services"), _sector("O:", 1.7, "Public administration"),
    _sector("S:", 1.6, "Other service activities"), _sector("B:", 1.1, "Mining and quarrying"),
]


def read_frames(archive: zipfile.ZipFile, notices: list | None = None) -> dict[str, pd.DataFrame]:
    return {"household": _read(archive, HOUSEHOLD, ["hhid", "district", *HOUSEHOLD_COLUMNS], notices), "person": _read(archive, PERSON, ["hhid", "district", "weight", *PERSON_COLUMNS[1:]], notices)}


def run_checks(frames: dict[str, pd.DataFrame]) -> list[dict]:
    results = []
    for check in CHECKS:
        frame = frames[check["table"]]
        if check["mask"] is None:
            estimate = _mean(frame, check["columns"][0])
        else:
            base = check["base"](frame) if check["base"] else None
            estimate = _share(frame, check["mask"](frame), base)
        difference = round(estimate - check["published"], 2)
        results.append({"table": check["table"], "columns": list(check["columns"]), "measure": check["measure"], "published": check["published"], "estimate": round(estimate, 2),
                        "difference": difference, "tolerance": check["tolerance"], "ok": abs(estimate - check["published"]) <= check["tolerance"], "source": check["source"]})
    return results


def validated_columns(results: list[dict]) -> dict[str, set[str]]:
    """Columns whose every check passed, by table kind (household/person)."""
    failed = {(item["table"], column) for item in results if not item["ok"] for column in item["columns"]}
    passed = {(item["table"], column) for item in results if item["ok"] for column in item["columns"]}
    out: dict[str, set[str]] = {"household": set(), "person": set()}
    for table, column in passed - failed:
        out[table].add(column)
    return out


def calculate(data_root: Path) -> list[dict]:
    archives = list(data_root.rglob("*EICV7 2023-2024.zip"))
    if len(archives) != 1:
        raise ValueError(f"Expected one EICV7 cross-section archive; found {len(archives)}")
    with zipfile.ZipFile(archives[0]) as archive:
        return run_checks(read_frames(archive))


def format_table(results: list[dict]) -> str:
    lines = [f"{'variable(s)':<22}{'published':>10}{'estimate':>10}{'diff':>7}{'tol':>6}  result  measure (source)"]
    for item in results:
        lines.append(f"{','.join(item['columns']):<22}{item['published']:>10}{item['estimate']:>10}{item['difference']:>7}{item['tolerance']:>6}  {'PASS' if item['ok'] else 'FAIL'}    {item['measure']} ({item['source'].split(', ')[-1]})")
    return "\n".join(lines)


if __name__ == "__main__":
    import sys
    print(format_table(calculate(Path(sys.argv[1] if len(sys.argv) > 1 else "Data"))))
