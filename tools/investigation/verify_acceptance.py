"""Verify real completed runs and discover an added aggregate file in an isolated data copy."""

import csv
import json
import os
import tempfile
from pathlib import Path

from .analysis import calculate_eicv7
from .catalog import discover, refresh_usage
from .engine import DATA, ROOT, STORE, data_signature, findings_checkpoint, read_json, write_json


def main():
    runs = [read_json(path) for path in (STORE / "runs").glob("*/manifest.json")]
    complete = sorted((item for item in runs if item["status"] in {"Completed", "Warning"}), key=lambda item: item["started_at"], reverse=True)
    gisagara = [item for item in complete if item["district"] == "Gisagara"][:2]
    other = next(item for item in complete if item["district"] == "Nyanza")
    assert len(gisagara) == 2
    first = read_json(STORE / "runs" / gisagara[0]["id"] / "04-analyzing-evidence.json")
    current_result = read_json(findings_checkpoint(STORE / "runs" / gisagara[0]["id"]))
    second = read_json(STORE / "runs" / gisagara[1]["id"] / "04-analyzing-evidence.json")
    assert first["selected"] == second["selected"]
    assert first["all_districts"] == second["all_districts"]
    assert gisagara[0]["data_signature"] == gisagara[1]["data_signature"]
    original = refresh_usage(read_json(STORE / "runs" / gisagara[0]["id"] / "01-discovering-data.json"))
    with tempfile.TemporaryDirectory(prefix="added-data-", dir=STORE) as temporary:
        root = Path(temporary) / "Data"
        root.mkdir()
        for source in DATA.rglob("*"):
            if source.is_file():
                target = root / source.relative_to(DATA)
                target.parent.mkdir(parents=True, exist_ok=True)
                os.link(source, target)  # Read-only processing; original survey files are never edited.
        before, _ = data_signature(root)
        added = root / "added-eicv7-aggregate-validation.csv"
        with added.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream)
            writer.writerow(["district", "poverty", "survey_period", "source_url"])
            for row in first["all_districts"]:
                writer.writerow([row["district"], row["poverty"], "2023/24", "https://statistics.gov.rw/data-sources/surveys/EICV/integrated-household-living-conditions-survey-7-eicv-7"])
        after, _ = data_signature(root)
        assert before != after
        updated = refresh_usage(discover(root, previous=original))
        added_table = next(table for table in updated["tables"] if table["filename"] == added.name)
        assert len(added_table["variables"]) == 4 and added_table["row_count"] == 30
        assert updated["files_discovered"] == original["files_discovered"] + 1
        assert updated["variables_inventoried"] == original["variables_inventoried"] + 4
        recalculated = calculate_eicv7(root, "Gisagara")
        assert recalculated["selected"] == first["selected"]
        addition = {"status": "Passed", "files": updated["files_discovered"], "tables": updated["tables_inventoried"],
                    "variables": updated["variables_inventoried"], "columns_added": 4,
                    "interpretation": "An added file derived from real aggregate estimates was catalogued. It was not double-counted or promoted to independent evidence without a validated adapter."}
    output = {"gisagara_runs": [item["id"] for item in gisagara], "repeat_values_identical": True,
              "gisagara_estimates": first["selected"], "other_district_run": other["id"],
              "other_district_estimates": read_json(STORE / "runs" / other["id"] / "04-analyzing-evidence.json")["selected"],
              "added_dataset": addition,
              "operational_acceptance": "Blocked: trusted server roles, Action Center and verified follow-up integration are not configured",
              "live_ai_acceptance": current_result.get("ai_review", {})}
    write_json(ROOT / "docs" / "investigation-verification.json", output)
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
