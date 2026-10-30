import json
from pathlib import Path

REGISTRY = Path(r"D:\Project\Poverty-Analysis-Reduction\docs\implementation\registry.json")
reg = json.loads(REGISTRY.read_text(encoding="utf-8"))

for blocker in reg["blockers"]:
    if blocker["id"] == "BLK-NISR":
        blocker["status"] = "resolved"
        blocker["detail"] = (
            "NISR Terms of Use (https://statistics.gov.rw/terms-use) and Hackathon page "
            "(https://statistics.gov.rw/about/hackathon) explicitly state: 'Unless otherwise indicated, "
            "data and analysis by the National Institute of Statistics of Rwanda (NISR) is licensed under "
            "a Creative Commons Attribution 4.0 International License.' This covers all published PDF "
            "reports (EICV7 Poverty Profile, Main Indicators, Methodological Notes) and XLSX tables "
            "(EICV7_Tables_Rwanda_Poverty_Profile.xlsx) which include Table A9.23. CC BY 4.0 permits "
            "copying, distribution, adaptation, and commercial use with attribution. "
            "Evidence artefacts updated with source_licence metadata: eicv7_vs_nisr_table_a9_23.json, "
            "python_r_eicv7_comparison.json, governed_science_workflow.json, r_reference_eicv7.json. "
            "Anonymized EICV7 microdata (v1) available via NADA portal with registration; published "
            "tables derived from it are CC BY 4.0."
        )

REGISTRY.write_text(json.dumps(reg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("BLK-NISR resolved")