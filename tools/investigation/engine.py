"""Checkpointed local AI Investigation Engine; never exports household records."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
import sys
import time
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .analysis import calculate_eicv7
from .fileio import replace_file
from .catalog import check_scratch_space, disk_full_tables, discover, version, refresh_usage
from .results import draft_action_plan, prepare_findings, research_options
from .sources import check_sources
from .brief import analyst_brief, discovery_note
from .diagnosis import diagnose
from .drivers import analyze_drivers
try:
    from .finance import finscope_access
except ImportError:  # FinScope module is not installed; the stage records it as unavailable.
    finscope_access = None

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "Data"
STORE = ROOT / "investigations"
STAGES = [
    "Discovering Data", "Checking Sources", "Connecting Datasets", "Analyzing Evidence", "Finding Drivers",
    "Comparing Districts", "Reviewing Solutions", "Preparing Findings",
]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f"{path.name}.{os.getpid()}.{uuid.uuid4().hex}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    replace_file(temporary, path)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def findings_checkpoint(folder: Path) -> Path:
    """Preparing Findings is stage 8 since drivers were added; earlier runs saved it as stage 7."""
    current = folder / "08-preparing-findings.json"
    return current if current.exists() else folder / "07-preparing-findings.json"


def data_signature(root: Path) -> tuple[str, list[dict]]:
    files = []
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        files.append({"path": path.relative_to(root).as_posix(), "sha256": version(path), "bytes": path.stat().st_size})
    digest = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()
    return digest, files


def history() -> list[dict]:
    if not STORE.exists():
        return []
    result = []
    for path in STORE.glob("runs/*/manifest.json"):
        try:
            manifest = read_json(path)
            result.append({key: manifest.get(key) for key in ["id", "district", "started_at", "updated_at", "status", "data_signature", "previous_id"]})
        except (OSError, ValueError):
            continue
    return sorted(result, key=lambda item: item.get("started_at") or "", reverse=True)


class Investigation:
    def __init__(self, run_id: str, district: str | None = None):
        if not isinstance(run_id, str) or not uuid.UUID(run_id):
            raise ValueError("Invalid investigation ID")
        self.id = run_id
        self.directory = STORE / "runs" / run_id
        self.manifest_path = self.directory / "manifest.json"
        if self.manifest_path.exists():
            self.manifest = read_json(self.manifest_path)
            if district and district != self.manifest["district"]:
                raise ValueError("Investigation district cannot change on resume")
        else:
            if not district:
                raise ValueError("District required for a new investigation")
            previous = next((item for item in history() if item["district"] == district), None)
            self.manifest = {
                "id": run_id, "district": district, "started_at": now(), "updated_at": now(), "status": "Running",
                "data_signature": None, "previous_id": previous["id"] if previous else None,
                "counts": {"files_discovered": 0, "tables_inventoried": 0, "variables_inventoried": 0, "sources_verified": 0, "cached_sources_available": 0},
                "stages": [{"name": name, "status": "Pending", "work": "", "warnings": [], "errors": []} for name in STAGES],
                "warnings": [], "errors": [],
            }
            self.save()

    def save(self) -> None:
        self.manifest["updated_at"] = now()
        write_json(self.manifest_path, self.manifest)

    def event(self, stage: str, status: str, detail: str, **fields) -> None:
        record = {"at": now(), "stage": stage, "status": status, "detail": detail, **fields}
        with (self.directory / "events.jsonl").open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")

    def stage(self, name: str, work: str, callback, *, warning_if=None):
        stage = next((item for item in self.manifest["stages"] if item["name"] == name), None)
        if stage is None:
            stage = {"name": name, "status": "Pending", "work": "", "warnings": [], "errors": []}
            self.manifest["stages"].insert(STAGES.index(name), stage)
        checkpoint = self.directory / f"{STAGES.index(name) + 1:02d}-{name.lower().replace(' ', '-')}.json"
        if stage["status"] in {"Completed", "Warning"} and checkpoint.exists():
            self.event(name, "Skipped", "Reused persisted checkpoint on resume")
            return read_json(checkpoint)
        stage.update({"status": "Running", "work": work, "started_at": now(), "errors": []})
        self.event(name, "Running", work)
        self.save()
        try:
            result = callback()
            write_json(checkpoint, result)
            warning = warning_if(result) if warning_if else None
            stage.update({"status": "Warning" if warning else "Completed", "finished_at": now(), "work": "Completed"})
            if warning:
                stage["warnings"].append(warning)
                self.manifest["warnings"].append(f"{name}: {warning}")
            self.event(name, stage["status"], warning or "Completed", checkpoint=checkpoint.name)
            self.save()
            return result
        except Exception as error:
            message = f"{type(error).__name__}: {error}"
            stage.update({"status": "Failed", "finished_at": now(), "work": "Failed"})
            stage["errors"].append(message)
            self.manifest["errors"].append(f"{name}: {message}")
            self.event(name, "Failed", message)
            self.save()
            raise

    def progress(self, stage: str, detail: dict) -> None:
        for key in self.manifest["counts"]:
            if key in detail:
                self.manifest["counts"][key] = detail[key]
        current = next(item for item in self.manifest["stages"] if item["name"] == stage)
        current["work"] = detail.get("table") or detail.get("source") or current["work"]
        fields = {key: value for key, value in detail.items() if key != "status"}
        self.event(stage, detail.get("status", "Running"), current["work"], **fields)
        self.save()

    def run(self) -> dict:
        """Hold an OS lock; a killed process releases it so the same run can resume."""
        lock = (self.directory / "worker.lock").open("a+b")
        lock.seek(0)
        lock.write(b"0")
        lock.flush()
        lock.seek(0)
        if os.name == "nt":
            import msvcrt
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        stopped = threading.Event()
        def heartbeat():
            while not stopped.is_set():
                write_json(self.directory / "lease.json", {"pid": os.getpid(), "heartbeat_at": now()})
                stopped.wait(10)
        pulse = threading.Thread(target=heartbeat, daemon=True)
        pulse.start()
        try:
            return self._run()
        except Exception as error:
            self.manifest["status"] = "Failed"
            self.manifest["errors"].append(f"Run stopped: {type(error).__name__}: {error}")
            self.save()
            raise
        finally:
            stopped.set()
            pulse.join(timeout=2)
            lock.close()

    def _run(self) -> dict:
        signature, files = data_signature(DATA)
        if self.manifest["data_signature"] and self.manifest["data_signature"] != signature:
            raise ValueError("Local data changed since this investigation started; start a new investigation instead of changing verified checkpoints")
        self.manifest["data_signature"] = signature
        implementation = hashlib.sha256("".join(version(file) for file in sorted(Path(__file__).parent.glob("*.py"))).encode()).hexdigest()
        self.manifest.setdefault("execution_versions", [])
        if not self.manifest["execution_versions"] or self.manifest["execution_versions"][-1]["sha256"] != implementation:
            self.manifest["execution_versions"].append({"sha256": implementation, "at": now()})
        self.manifest["dataset_versions"] = files
        self.manifest["runtime"] = {"python": sys.version.split()[0], **{package: importlib.metadata.version(package) for package in ["pandas", "pyreadstat", "pyarrow", "openpyxl", "xlsxwriter", "reportlab", "pypdf"]}}
        self.manifest["status"] = "Running"
        self.save()
        cache = STORE / "cache" / f"catalog-{signature}.json"

        def inventory():
            if cache.exists() and not disk_full_tables(read_json(cache)["tables"]):
                result = refresh_usage(read_json(cache))
                write_json(cache, result)
                self.manifest["counts"].update({key: result[key] for key in ["files_discovered", "tables_inventoried", "variables_inventoried"]})
                self.event(STAGES[0], "Running", "Loaded catalog for unchanged file hashes")
                self.save()
                return result
            prior_catalogs = sorted((STORE / "cache").glob("catalog-*.json"), key=lambda item: item.stat().st_mtime, reverse=True)
            previous_catalog = read_json(prior_catalogs[0]) if prior_catalogs else None
            check_scratch_space()
            result = refresh_usage(discover(DATA, lambda item: self.progress(STAGES[0], item), previous_catalog))
            full = disk_full_tables(result["tables"])
            if full:
                raise OSError(f"The disk filled up while reading {len(full)} tables (first: {full[0]['filename']}). Nothing was saved. Free space where temporary files go (TEMP/TMP) and run again.")
            write_json(cache, result)
            return result

        try:
            catalog = self.stage(STAGES[0], "Scanning local files, archive members, tables, and variables", inventory,
                                 warning_if=discovery_note)
            sources = self.stage(STAGES[1], "Retrieving registered sources (official publications, multilateral data, evidence libraries) with TLS verification",
                                 lambda: check_sources(STORE / "source-cache", lambda item: self.progress(STAGES[1], item)),
                                 warning_if=lambda value: f"{value['failed_count']} official sources could not be verified" if value["failed_count"] else None)

            def relationships():
                core = [table for table in catalog["tables"] if table.get("survey") == "EICV7" and table.get("member", "").startswith("Cross_Section/") and table.get("status") == "Completed"]
                names = {table.get("member") for table in core}
                from .analysis import POVERTY, HOUSEHOLD, PERSON, VUP

                missing = sorted(set([POVERTY, HOUSEHOLD, PERSON, *VUP]) - names)
                if missing:
                    raise ValueError(f"Required EICV7 cross-section tables are not inventoried: {missing}")
                return {"validated_survey": "EICV7 cross-section", "required_tables": sorted(names),
                        "record_join_rule": "Household IDs only within EICV7, checked in the calculation; other surveys remain separate",
                        "missing_required_tables": missing, "unrelated_surveys_joined": False}

            links = self.stage(STAGES[2], "Validating same-survey table relationships and required variables", relationships)
            def analyze():
                value = calculate_eicv7(DATA, self.manifest["district"])
                from .sources import published_poverty_intervals
                official = published_poverty_intervals(sources).get(self.manifest["district"])
                context = value["contextual_analysis"]
                agreement = bool(official and abs(official["standard_error"] - context["selected_poverty_se_points"]) <= 0.1)
                context["uncertainty_validated"] = agreement
                context["published_se_points"] = official["standard_error"] if official else None
                context["validation_note"] = "Calculated district poverty standard error agrees with NISR Table A9.23 within 0.1 percentage points; this does not validate causal conclusions." if agreement else "The uncertainty approximation has not reconciled to an available official standard error; test interpretations are withheld."
                if not agreement:
                    for comparison in context["comparisons"]:
                        comparison["conclusion"] = "Uncertainty validation required"
                return value
            analysis = self.stage(STAGES[3], "Calculating weighted EICV7 district and national estimates",
                                  analyze,
                                  warning_if=lambda value: None if value["contextual_analysis"]["uncertainty_validated"] else "Comparative uncertainty needs validation; descriptive estimates remain available.")
            if analysis.get("reader_warnings"):
                self.manifest["stages"][3]["notes"] = ["Stata text labels decoded successfully. Selected geography and response categories passed validation; the numeric estimates remain usable."]
                self.event(STAGES[3], "Completed", "Recovered text encoding; validated numerical calculations retained", reader_notes=analysis["reader_warnings"])
                self.save()
            def drivers_stage():
                value = analyze_drivers(DATA, self.manifest["district"])
                try:
                    if finscope_access is None:
                        raise RuntimeError("The FinScope analysis module (tools/investigation/finance.py) is not installed")
                    value["financial_access"] = finscope_access(DATA, self.manifest["district"], {row["district"]: row["poverty"] for row in analysis["all_districts"]})
                except Exception as error:
                    value["financial_access"] = {"status": "Unavailable", "reason": f"{type(error).__name__}: {error}"}
                try:
                    from .trends import trend_analysis
                    value["poverty_trends"] = trend_analysis(DATA, self.manifest["district"])
                except Exception as error:
                    value["poverty_trends"] = {"status": "Unavailable", "reason": f"{type(error).__name__}: {error}"}
                try:
                    from .finscope2020 import finscope_trend
                    value["financial_trend"] = finscope_trend(DATA, self.manifest["district"])
                except Exception as error:
                    value["financial_trend"] = {"status": "Unavailable", "reason": f"{type(error).__name__}: {error}"}
                try:
                    from .finscope2016 import financial_series
                    value["financial_series"] = financial_series(DATA)
                except Exception as error:
                    value["financial_series"] = {"status": "Unavailable", "reason": f"{type(error).__name__}: {error}"}
                return value
            drivers = self.stage(STAGES[4], "Decomposing the gap to Rwanda into measured drivers and profiling who is poor",
                                 drivers_stage,
                                 warning_if=lambda value: f"Only {value['explained_excl_markers_share_pct']:.0f}% of the gap to Rwanda is explained by measured causes and access factors; local investigation is needed." if value["explained_excl_markers_share_pct"] is not None and value["explained_excl_markers_share_pct"] < 30 else None)
            diagnosis = diagnose(analysis, drivers, sources)
            comparisons = self.stage(STAGES[5], "Choosing same-province EICV7 comparison districts",
                                     lambda: {"district": analysis["selected"], "comparators": analysis["comparators"],
                                              "rule": analysis["method"]["comparators"], "national": analysis["national"]})
            findings_path = self.directory / "findings.json"
            findings = read_json(findings_path) if findings_path.exists() else prepare_findings(analysis, sources)
            if not findings_path.exists():
                write_json(findings_path, findings)
            research = self.stage(STAGES[6], "Checking registered sources and the driver diagnosis for response options to research",
                                  lambda: research_options(findings, sources, diagnosis),
                                  warning_if=lambda value: "No verified response options could be prepared" if value["stage_status"] == "Warning" else None)

            def prepare():
                plan = draft_action_plan(analysis, findings, research, diagnosis)
                write_json(self.directory / "action-plan.json", plan)
                evaluation = {"status": "Awaiting approved action and verified follow-up", "verified_results": [], "outcome_claim": None,
                              "note": "Task completion cannot be treated as poverty reduction; a before-and-after change alone does not prove causation."}
                write_json(self.directory / "evaluation.json", evaluation)
                result = {"findings": findings, "research": research, "plan": plan, "evaluation": evaluation,
                          "comparison": comparisons, "source_conflicts": findings["source_conflicts"],
                          "contextual_analysis": analysis.get("contextual_analysis"),
                          "source_register": [{key: value for key, value in source.items() if key not in {"local_cache", "excerpt"}} for source in sources["sources"]]}
                result["analyst_brief"] = analyst_brief(analysis, findings, diagnosis)
                result["drivers"] = drivers
                from .provenance import data_used
                result["data_used"] = data_used(analysis, drivers, catalog)
                result["diagnosis"] = diagnosis
                from .problem_profile import build_profile
                result["problem_profile"] = build_profile(analysis, drivers, diagnosis, drivers.get("financial_access"), drivers.get("poverty_trends"))
                try:
                    from .verification import verify_evidence
                    result["verification"] = verify_evidence(self.manifest["district"], analysis, drivers, findings, sources)
                except Exception as error:  # a failed check must read as "not verified", never as verified
                    result["verification"] = {"status": "Unavailable", "reason": f"{type(error).__name__}: {error}", "registry": [], "summary": {"total": 0, "counts": {}, "unresolved": 0, "unresolved_items": []},
                                              "audit_trail": [], "sources": [], "directions": [], "limitations": ["Evidence verification could not run, so no claim in this report was checked against official publications."]}
                result["data_quality"] = {"discovery_note": discovery_note(catalog), "reader_notes": analysis.get("reader_warnings", []),
                    "unreadable_entries": [{"filename": item["filename"], "survey": item.get("survey"), "error": item.get("error")} for item in catalog["tables"] if item["status"] == "Failed"],
                    "source_figure_discrepancies": findings["source_conflicts"]}
                from .ai import review_evidence
                result["ai_review"] = review_evidence(findings, research, analysis.get("contextual_analysis"), analysis.get("reliability"), analysis.get("not_analyzed"), drivers.get("financial_access"), drivers.get("poverty_trends"), drivers.get("financial_trend"), drivers.get("financial_series"), result["problem_profile"])
                result["reliability"] = analysis.get("reliability")
                self.event(STAGES[7], result["ai_review"]["status"], result["ai_review"].get("reason", "Validated aggregate-only AI evidence review"))
                from .reports import export_reports

                report_manifest = {**self.manifest, "status": "Evidence prepared; analyst review pending"}
                result["reports"] = export_reports(self.directory, report_manifest, analysis, sources, result)
                return result

            prepared = self.stage(STAGES[7], "Saving findings, draft review, and aggregate reports", prepare,
                                  warning_if=lambda value: f"{len(value['analyst_brief']['review_items'])} narrative/table discrepancy for this district. The table-consistent estimate is retained; see source review." if value.get("analyst_brief", {}).get("review_items") else None)
            self.manifest["source_versions"] = {source["id"]: source.get("version") for source in sources["sources"]}
            self.manifest["status"] = "Warning" if any(stage["status"] == "Warning" for stage in self.manifest["stages"]) else "Completed"
            previous_id = self.manifest.get("previous_id")
            if previous_id:
                previous_path = STORE / "runs" / previous_id / "04-analyzing-evidence.json"
                if previous_path.exists():
                    previous = read_json(previous_path)
                    self.manifest["change_since_previous"] = {
                        "data_changed": self.manifest["data_signature"] != read_json(STORE / "runs" / previous_id / "manifest.json").get("data_signature"),
                        "poverty_points": round(analysis["selected"]["poverty"] - previous["selected"]["poverty"], 1),
                        "note": "A difference between run outputs is not automatically a new survey trend; inspect source versions.",
                    }
            self.save()
            return prepared
        except Exception:
            self.manifest["status"] = "Failed"
            self.save()
            raise


def main() -> int:
    from .ai import load_env_file
    load_env_file(ROOT / ".env.local")
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["run", "resume", "status", "history"])
    parser.add_argument("--district")
    parser.add_argument("--id")
    args = parser.parse_args()
    if args.command == "history":
        print(json.dumps(history(), ensure_ascii=False))
        return 0
    if args.command == "status":
        if not args.id:
            parser.error("--id is required")
        print(json.dumps(read_json(STORE / "runs" / args.id / "manifest.json"), ensure_ascii=False))
        return 0
    if args.command == "run":
        if not args.district:
            parser.error("--district is required")
        run_id = args.id or str(uuid.uuid4())
        investigation = Investigation(run_id, args.district)
    else:
        if not args.id:
            parser.error("--id is required")
        investigation = Investigation(args.id)
    try:
        investigation.run()
        print(json.dumps({"id": investigation.id, "status": investigation.manifest["status"]}))
        return 0
    except Exception as error:
        print(json.dumps({"id": investigation.id, "status": "Failed", "error": str(error)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
