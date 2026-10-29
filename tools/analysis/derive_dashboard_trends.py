"""Create aggregate-only dashboard data for poverty trends, panel mobility and financial inclusion by district.

Run from the project root with: .venv/Scripts/python.exe tools/analysis/derive_dashboard_trends.py
Uses the same validated modules as the investigation engine. No respondent or household identifiers are written.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from tools.investigation import finance, finscope2016, finscope2020, trends  # noqa: E402

DATA = ROOT / "Data"
OUTPUT = ROOT / "src/data/dashboard-trends.json"
PERIODS = {"2010_11_to_2013_14": "change_2010_11_to_2013_14", "2013_14_to_2016_17": "change_2013_14_to_2016_17"}
CELLS = ("stayed_poor", "escaped", "fell_back", "never_poor")


def compact(item: dict | None) -> dict | None:
    if not item or item.get("pct") is None:
        return None
    return {key: item[key] for key in ("pct", "ci_lower", "ci_upper")}


def build() -> dict:
    loaded = trends.load_rounds(DATA)
    rounds, names = loaded["rounds"], sorted(loaded["districts"].values())
    old, new = trends.old_series(rounds, names), trends.new_series(rounds["EICV7"], names)
    panel = trends.panel_mobility(loaded["panel"], loaded["provinces"])
    checks = trends.national_checks(rounds)
    if not all(item["matches"] for item in checks if item["round"] != "EICV3") or not all(item["eicv7_matches_published"] and item["decrease_check"] for item in new):
        raise ValueError("Derived trend values do not reconcile with NISR's published figures")

    national = []
    for name, period in trends.ROUNDS:
        frame = rounds[name]
        result = trends.shown(trends.estimate(frame, pd.Series(True, index=frame.index), "poor"))
        national.append({"round": name, "period": period, "published": trends.PUBLISHED_NATIONAL[name], **compact(result)})
    districts = []
    for row, modelled in zip(old, new):
        changes = {}
        for key, source in PERIODS.items():
            item = row.get(source)
            changes[key] = None if not item else {k: item[k] for k in ("points", "ci_lower", "ci_upper", "holm_adjusted_p", "label")}
        districts.append({"name": row["district"], "rates": {k: compact(row[k]) for k in ("eicv3", "eicv4", "eicv5")}, "changes": changes,
                          "poverty2023_24": modelled["eicv7"]["pct"]})

    _, frame = finance.load_finscope(DATA)
    poverty = {row["district"]: row["eicv7"]["pct"] for row in new}
    estimated = {row["district"]: row for row in finance.finscope_estimates(frame, names[0], poverty)["all_districts"]}
    access = []
    for name in names:
        banked, other, informal, excluded = finance.PUBLISHED_DISTRICTS[name]
        printed = excluded is not None
        access.append({"name": name, "published": {"banked": banked, "otherFormal": other, "informalOnly": informal,
                                                    "excluded": excluded if printed else round(100 - banked - other - informal, 1)},
                       "excludedPrinted": printed, "mobileMoneyEstimated": estimated[name]["mobile_money_pct"],
                       "sampleAdults": estimated[name]["sample_adults"], "poverty": poverty[name]})
    table = pd.DataFrame([{"banked": a["published"]["banked"], "excluded": a["published"]["excluded"], "mobile": a["mobileMoneyEstimated"], "poverty": a["poverty"]} for a in access])
    links = {"excludedPublished": finance.rank_link(table.excluded, table.poverty), "bankedPublished": finance.rank_link(table.banked, table.poverty),
             "mobileMoneyEstimated": finance.rank_link(table.mobile, table.poverty)}
    fs = finscope2020.finscope_trend(DATA)
    if not all(item["ok"] for item in fs["checks"]):
        raise ValueError("FinScope 2020 values do not reconcile with NISR's published figures")
    fs_districts = []
    for row in fs["changes"]:
        item = {"name": row["district"], "sampleAdults2020": row["sample_adults_2020"], "sampleAdults2024": row["sample_adults_2024"]}
        for measure in finscope2020.TREND_MEASURES:
            cell, change = row[measure], row[measure]["change"]
            item[measure] = {"y2020": compact(cell["y2020"]), "y2024": cell["y2024_pct"],
                             "change": None if not change else {k: change[k] for k in ("points", "ci_lower", "ci_upper", "holm_adjusted_p", "label")}}
        fs_districts.append(item)
    nat20 = {key: fs["national"]["y2020"][key]["pct"] for key in (*finscope2020.STRANDS, "formal", "mobile_money", "bank_account")}
    finscope_trend = {
        "sources": fs["sources"], "files": fs["files"],
        "national": {"y2020Microdata": nat20, "y2020Restated": finscope2020.PUBLISHED_2020_RESTATED, "y2024": finscope2020.PUBLISHED_2024,
                     "originalBanked2020": finscope2020.PUBLISHED_2020_ORIGINAL_BANKED, "mobileMoney": {"2020": nat20["mobile_money"], "2024": fs["national"]["mobile_money_2024_estimated"],
                                                                                                      "published": finscope2020.PUBLISHED_MOBILE_WALLET}},
        "checks": [{k: c[k] for k in ("measure", "calculated", "published", "ok")} for c in fs["checks"]],
        "districts": fs_districts, "counts": fs["change_counts"], "limitations": fs["limitations"],
    }
    fs_series = finscope2016.financial_series(DATA)
    if not all(item["ok"] for item in fs_series["checks"]):
        raise ValueError("FinScope 2016 values do not reconcile with NISR's reported figures")
    finscope_series = {
        "series": fs_series["series"], "checks": [{k: c[k] for k in ("measure", "calculated", "published", "ok")} for c in fs_series["checks"]], "sources": fs_series["sources"],
        "provinces": [{"province": item["province"], "sampleAdults2016": item["sample_adults_2016"], "sampleAdults2020": item["sample_adults_2020"],
                       **{measure: {"y2016": item[measure]["y2016_pct"], "y2020": item[measure]["y2020_pct"],
                                    "change": None if not item[measure]["change"] else {k: item[measure]["change"][k] for k in ("points", "ci_lower", "ci_upper", "holm_adjusted_p", "label")}}
                           for measure in finscope2016.SERIES_MEASURES}} for item in fs_series["provinces"]],
        "limitations": fs_series["limitations"],
    }
    return {
        "sources": {"trends": trends.POVERTY_PROFILE_URL, "nationalSeries": trends.MAIN_REPORT_URL, "finscope": finance.REPORT_URL},
        "finscopeTrend": finscope_trend,
        "finscopeSeries": finscope_series,
        "national": {"oldSeries": national, "modelled2016_17": trends.PUBLISHED_NATIONAL["EICV5_modelled"], "eicv7": trends.PUBLISHED_NATIONAL["EICV7"],
                     "checks": [{k: c[k] for k in ("round", "calculated", "published", "matches")} for c in checks]},
        "districts": districts,
        "changeCounts": {key: {"clearImprovement": sum(1 for d in districts if d["changes"][key] and d["changes"][key]["label"] == "Clear improvement"),
                               "clearWorsening": sum(1 for d in districts if d["changes"][key] and d["changes"][key]["label"] == "Clear worsening"),
                               "possible": sum(1 for d in districts if d["changes"][key] and d["changes"][key]["label"].startswith("Possible")),
                               "noClearChange": sum(1 for d in districts if d["changes"][key] and d["changes"][key]["label"] == "No clear change")} for key in PERIODS},
        "panel": {"people": panel["people"], "households": panel["households"],
                  "shares": {k: panel["shares_of_people"][k]["pct"] for k in CELLS},
                  "escaped": compact(panel["overall"]["escaped_poverty"]), "fellInto": compact(panel["overall"]["fell_into_poverty"]),
                  "byProvince": [{"province": p["province"].replace(" Province", ""), "people": p["people"], "shares": {k: p["shares_of_people"][k]["pct"] for k in CELLS},
                                  "escaped": compact(p["escaped_poverty"]), "fellInto": compact(p["fell_into_poverty"])} for p in panel["by_province"]]},
        "access": {"national": finance.PUBLISHED_NATIONAL, "districts": access, "links": links},
    }


if __name__ == "__main__":
    result = build()
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size // 1024} KB)")
    print("Change counts:", result["changeCounts"])
    print("Panel shares:", result["panel"]["shares"])
    print("Links:", result["access"]["links"])
    print("FinScope change counts:", result["finscopeTrend"]["counts"])
