"""Generate aggregate documentation from a persisted investigation, never respondent records."""

from collections import Counter, defaultdict
from .catalog import refresh_usage
from .engine import ROOT, STORE, findings_checkpoint, read_json


def main():
    manifests = [read_json(path) for path in (STORE / "runs").glob("*/manifest.json")]
    run = max((item for item in manifests if item["district"] == "Gisagara" and item["status"] in {"Completed", "Warning"}), key=lambda item: item["started_at"])
    folder = STORE / "runs" / run["id"]
    result = read_json(findings_checkpoint(folder))
    catalog = refresh_usage(read_json(folder / "01-discovering-data.json"))
    documents = ROOT / "docs"
    lines = ["# Gisagara investigation findings", "", f"Generated from investigation `{run['id']}`, started {run['started_at']}. This is a historical EICV7 2023/24 analysis, not a current-year poverty assessment.", "",
             "Status: evidence prepared for analyst review. Operational actions and follow-up outcomes are not authorized or implemented by this local worker.", ""]
    for item in result["findings"]["findings"]:
        lines += [f"## {item['title']}", "", item["explanation"], "", f"- Coverage: {item['geography']}; {item['period']}; {item['unit']}.",
                  f"- Sample: {item['sample']} survey observations (households unless the finding says people).",
                  f"- Evidence: {item['evidence_strength']}.", f"- Method: {item['method']}", f"- Limit: {item['limitations']}", f"- Next step: {item['next_step']}", f"- [Original source]({item['source']})", ""]
        if item.get("confidence_interval"):
            ci = item["confidence_interval"]
            lines += [f"NISR Table A9.23 gives the published 95% confidence interval {ci['lower']:.2f}%–{ci['upper']:.2f}%. It was extracted from the verified report rather than estimated by this application.", ""]
    lines += ["## Source conflicts", "", *[f"- {item['explanation']}" for item in result["source_conflicts"]], "", "## Unanalyzed subjects", "", *[f"- {item}" for item in result["findings"]["not_analyzed"]], "",
              "## Action and evaluation", "", result["plan"]["approval_status"], "", result["plan"]["reason"], "", result["evaluation"]["status"], "", result["evaluation"]["note"], "",
              "The local review note is unverified and conveys no operational authority. The original architecture's approval, work assignment and verified follow-up interfaces remain explicit integration boundaries."]
    (documents / "GISAGARA_INVESTIGATION.md").write_text("\n".join(lines), encoding="utf-8")

    lines = ["# Information source register", "", "Tier 1: official statistics and government (may support calculations). Tier 2: multilateral agencies and evidence libraries (context, cross-checks, response research). Tier 3: analyst-added (reading only). Any HTTPS source can be registered in `tools/investigation/registry.py` or `extra_sources.json`.", "", f"Snapshot from `{run['id']}`. A retrieval timestamp is not a publication date or a survey year. Unknown publication dates remain unverified.", ""]
    for source in result.get("source_register", []):
        lines += [f"## {source['title']}", "", f"- Publisher: {source['publisher']} (tier {source.get('tier', 1)})", f"- Used for: {source.get('use') or 'Calculation and finding support'}", f"- [Original URL]({source['original_url']})", f"- Latest retrieval status: {source['status']}",
                  f"- Retrieval timestamp: {source['retrieved_at']}", f"- Publication date: {source.get('publication_date') or 'Not verified'}", f"- Data period: {source['data_period']}",
                  f"- Geography: {source['geographic_coverage']}", f"- Measurement: {source['measurement_definition']}", f"- Methodology: {source['methodology']}",
                  f"- Version SHA256: `{source.get('version') or 'Unavailable'}`", f"- Limits: {source['limitations']}", f"- Error: {source.get('error') or 'None'}", ""]
    lines += ["## Discovery limits", "", "This worker retrieves every registered source on each run (the six NISR/LODA PDFs, the World Bank API, and landing pages of government, multilateral and evidence-library publishers). Landing pages prove reachability only; figures on them must be registered as specific documents before they support a finding. It does not search the whole web. Dataset-specific adapters are required before automatic analysis of new data. No access restriction is bypassed.", "",
              "On update failures, the register keeps the failed check and separately records a previously verified cached copy only after validating its content hash. The original retrieval date and the uncertainty about newer versions remain visible."]
    (documents / "OFFICIAL_SOURCE_REGISTER.md").write_text("\n".join(lines), encoding="utf-8")

    groups = defaultdict(list)
    classification = Counter()
    for table in catalog["tables"]:
        groups[table.get("container") or table["filename"]].append(table)
        classification.update(item["classification"] for item in table["variables"])
    lines = ["# Local data inventory", "", f"The supplied Data folder contains {catalog['files_discovered']} files, {catalog['tables_inventoried']} table/archive entries and {catalog['variables_inventoried']} inventoried variables. {catalog['failed_tables']} entry is unreadable and {catalog['skipped_tables']} archive metadata entries are recorded as skipped.", "",
             "Every readable column is present in the searchable workspace catalog and in `investigations/runs/<id>/01-discovering-data.json`. Counts include separate supplied SAV and DTA versions; they are not independent survey samples.", "",
             "Survey identity and dates inferred from filenames are explicitly provisional. The EICV3–EICV4 panel spans both rounds and is never treated as a single-wave cross-section. Core EICV7 geography and record joins are validated by the analytical adapter.", "",
             "| File | Tables/entries | Variables | Failed |", "| --- | ---: | ---: | ---: |"]
    for name, tables in sorted(groups.items()):
        short = name.rsplit("/", 1)[-1].replace("T2 Finance and Poverty - ", "")
        lines.append(f"| {short} | {len(tables)} | {sum(len(item['variables']) for item in tables)} | {sum(item['status'] == 'Failed' for item in tables)} |")
    lines += ["", "## Variable use", "", *[f"- {name}: {count}" for name, count in sorted(classification.items())], "",
              "Labels, missing values, types, possible survey weights, geographic identifiers, access restrictions, inferred relationships and classification explanations are retained. Only explicitly validated table/column combinations are marked Used. Missingness and topic heuristics are catalog review flags, not automated survey-design decisions.", "", "## Unreadable and skipped entries", ""]
    for table in catalog["tables"]:
        if table["status"] != "Completed":
            lines.append(f"- `{table['filename']}` — {table['status']}: {table.get('error')}")
    lines += ["", "The unreadable EICV4 expenditure SAV has a separately supplied readable DTA counterpart with 32 variables, catalogued independently. Their equivalence is not assumed. A compatible reader or corrected source is needed to prove the SAV's exact contents.", "",
              "The acceptance test added a CSV derived from real EICV7 aggregates to an isolated temporary data directory. All four added columns were discovered; the original Data folder remained unchanged. Unchanged source hashes reused catalog metadata. Additional files require validated definitions and adapters before contributing new analytical findings."]
    (documents / "DATA_INVENTORY.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated three evidence documents for {run['id']}")


if __name__ == "__main__":
    main()
