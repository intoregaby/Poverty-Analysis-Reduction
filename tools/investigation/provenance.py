"""Which supplied files each result came from, how they were linked, and which supplied data is not yet used."""

from __future__ import annotations

from pathlib import Path

HOUSEHOLD = "Household-level linked"
AGGREGATE = "Aggregate comparison only"


def name_of(path: str | None) -> str | None:
    return Path(path).name if path else None


def data_used(analysis: dict, drivers: dict | None, catalog: dict | None = None) -> dict:
    access = (drivers or {}).get("financial_access") or {}
    trends = (drivers or {}).get("poverty_trends") or {}
    files = trends.get("files") or {}
    used = [{"dataset": "EICV7 2023/24 cross-section", "file": name_of(analysis.get("source_file")), "status": "Used",
             "linkage": f"{HOUSEHOLD}: poverty, household, person and VUP modules joined on household ID after uniqueness and district checks",
             "used_for": "District poverty, extreme poverty, health insurance, grid electricity, VUP participation, driver analysis, reliability grades"}]
    used.append({"dataset": "FinScope Rwanda 2024", "file": name_of(access.get("source_file")), "status": access.get("status", "Not run"),
                 "linkage": f"{AGGREGATE}: district averages; FinScope respondents are not linked to EICV households",
                 "used_for": "Access strand (banked, other formal, informal only, excluded), mobile money, comparison with district poverty"})
    for key, dataset, rounds in (("EICV3", "EICV3 2010/11 poverty file (January 2014 version)", "old series"), ("EICV4", "EICV4 2013/14 poverty file", "old series"),
                                  ("EICV5", "EICV5 2016/17 poverty file", "old series")):
        used.append({"dataset": dataset, "file": files.get(key), "status": trends.get("status", "Not run"),
                     "linkage": f"{AGGREGATE}: separate survey samples, same poverty method", "used_for": "District poverty trend, 2010/11 to 2016/17"})
    used.append({"dataset": "EICV3–EICV4 panel", "file": files.get("panel"), "status": trends.get("status", "Not run"),
                 "linkage": f"{HOUSEHOLD}: the same households in EICV3 and EICV4", "used_for": "Who escaped poverty and who fell into it"})
    used.append({"dataset": "FinScope Rwanda 2020", "file": ((drivers or {}).get("financial_trend") or {}).get("files", {}).get("2020"), "status": ((drivers or {}).get("financial_trend") or {}).get("status", "Not run"),
                 "linkage": f"{AGGREGATE}: NISR's own 2020 access strand compared with 2024 district figures; not linked to EICV households",
                 "used_for": "Change in excluded, informal-only, formally served and registered mobile money shares by district, 2020 to 2024"})
    series = ((drivers or {}).get("financial_series") or {})
    used.append({"dataset": "FinScope Rwanda 2016", "file": series.get("files", {}).get("2016"), "status": series.get("status", "Not run"),
                 "linkage": f"{AGGREGATE}: NISR's own 2016 access strand, national and province only; not linked to EICV households",
                 "used_for": "Financial inclusion series 2016, 2020 and 2024, and province change 2016 to 2020"})
    used.append({"dataset": "NISR published tables (EICV7 Poverty Profile Annex B, Main Indicators Report)", "file": None, "status": "Reference",
                 "linkage": f"{AGGREGATE}: published figures, not recalculated", "used_for": "Modelled 2016/17 poverty on the EICV7 method; checks of national and district figures"})
    not_used = [
        {"dataset": "FinScope 2012", "reason": "No NISR access strand variable in the file; the strand would have to be rebuilt from a different questionnaire and checked against the 2012 published figures first."},
        {"dataset": "EICV4 expenditure table (SAV)", "reason": "The SAV is truncated at 793,992 of about 2.1 million rows; the DTA copy is readable and identical on the rows that can be compared, but no analysis uses expenditure yet."},
        {"dataset": "EICV4 and EICV5 VUP files", "reason": "Separate beneficiary samples, not interchangeable with the cross-sections; not yet validated."},
        {"dataset": "Most other EICV modules (education, employment, land, livestock, remittances, credit, savings)", "reason": "Catalogued but variable definitions, denominators and weights are not yet validated."},
    ]
    summary = None
    if catalog:
        variables = [variable for table in catalog.get("tables", []) for variable in table.get("variables", [])]
        summary = {"variables_catalogued": len(variables), "variables_marked_used": sum(1 for variable in variables if variable.get("classification") == "Used")}
    return {"used": used, "not_yet_used": not_used, "catalog": summary}
