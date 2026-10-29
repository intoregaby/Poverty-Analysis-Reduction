"""Runs the investigation for every district and ranks districts by how clearly they differ from Rwanda.

The board is a ranking of survey signals, not of need or of funding priority. It only restates each district's saved problem profile.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from .fileio import replace_file

ROOT = Path(__file__).resolve().parents[2]
STORE = ROOT / "investigations"
AGGREGATES = ROOT / "src" / "data" / "dashboard-eicv7-aggregates.json"
TIERS = ("stands_out", "possible", "better", "in_line", "context")
DEPENDABLE = {"Reliable", "Use with caution"}
Z_CAP = 6.0
NOTE = ("Districts are ordered by the total size of their clear differences from Rwanda (each signal at least 2 standard errors worse, counted up to 6), then by how many signals there are, then by the poverty signal. "
        "This ranks statistical signals only: it is not a ranking of need, it does not weigh how many people are affected, and it says nothing about causes.")


def district_names(path: Path = AGGREGATES) -> list[str]:
    return sorted(row["name"] for row in json.loads(path.read_text(encoding="utf-8"))["districts"])


def latest_profiles(store: Path = STORE) -> dict[str, dict]:
    """Newest saved run per district whose result carries a problem profile."""
    found: dict[str, tuple[str, dict, str, dict | None]] = {}
    for manifest_path in (store / "runs").glob("*/manifest.json"):
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            saved = json.loads((manifest_path.parent / "08-preparing-findings.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        result = saved.get("result", saved)
        profile = result.get("problem_profile")
        if not profile or manifest.get("status") not in ("Completed", "Warning"):
            continue
        district = manifest["district"]
        if district not in found or manifest["updated_at"] > found[district][0]:
            verification = result.get("verification") or {}
            found[district] = (manifest["updated_at"], profile, manifest["id"], verification.get("summary") if verification.get("status") == "Completed" else None)
    return {district: {"profile": profile, "run_id": run_id, "run_at": stamp, "verification": summary} for district, (stamp, profile, run_id, summary) in found.items()}


def signal(row: dict) -> dict:
    return {key: row.get(key) for key in ("id", "label", "district_pct", "rwanda_pct", "difference_points", "z", "ci_lower", "ci_upper", "reliability", "source")}


def build_board(profiles: dict[str, dict], expected: list[str]) -> dict:
    rows = []
    for district, saved in profiles.items():
        profile = saved["profile"]
        clear = [signal(row) for row in profile["stands_out"]]
        possible = [signal(row) for row in profile["possible"]]
        rows.append({
            "district": district, "run_id": saved["run_id"], "run_at": saved["run_at"], "headline": profile["headline"], "verification": saved.get("verification"),
            "clear_signals": clear, "possible_signals": possible,
            "clear_count": len(clear), "possible_count": len(possible),
            "score": round(sum(min(row["z"], Z_CAP) for row in clear if row["z"] is not None), 2),
            "poverty_z": next((row["z"] for row in clear + possible if row["id"] == "poverty"), None),
            "strongest_z": max((row["z"] for row in clear + possible if row["z"] is not None), default=None),
            "dependable_clear_count": sum(1 for row in clear if row["reliability"] in DEPENDABLE),
        })
    rows.sort(key=lambda row: (-row["score"], -row["clear_count"], -(row["poverty_z"] or 0), row["district"]))
    for rank, row in enumerate(rows, 1):
        row["rank"] = rank
    leaders: dict[str, dict] = {}
    for row in rows:
        for item in row["clear_signals"] + row["possible_signals"]:
            entry = leaders.setdefault(item["id"], {"id": item["id"], "label": item["label"], "districts": []})
            entry["districts"].append({"district": row["district"], "district_pct": item["district_pct"], "rwanda_pct": item["rwanda_pct"], "z": item["z"], "reliability": item["reliability"]})
    for entry in leaders.values():
        entry["districts"].sort(key=lambda item: -(item["z"] or 0))
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "note": NOTE,
        "districts_expected": len(expected), "districts_included": len(rows),
        "missing": [name for name in expected if name not in profiles],
        "districts": rows, "signals": sorted(leaders.values(), key=lambda entry: -len(entry["districts"])),
    }


def write_board(store: Path = STORE, expected: list[str] | None = None) -> dict:
    board = build_board(latest_profiles(store), expected if expected is not None else district_names())
    target = store / "priority_board.json"
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps(board, ensure_ascii=False, indent=1), encoding="utf-8")
    replace_file(temporary, target)
    return board


def run_missing(names: list[str], store: Path = STORE, temp: str | None = None, log=print) -> list[str]:
    """Runs one district at a time (each loads the full survey) without the AI review, so no figures leave the laptop; skipping districts whose latest run already has evidence verification."""
    done = latest_profiles(store)
    failed = []
    environment = {**os.environ, **({"TEMP": temp, "TMP": temp} if temp else {}), "PYTHONIOENCODING": "utf-8", "INVESTIGATION_NO_AI": "1"}
    for name in names:
        if name in done and done[name].get("verification"):
            log(f"{name}: already has a current run with evidence verification, skipped")
            continue
        started = datetime.now()
        outcome = subprocess.run([sys.executable, "-m", "tools.investigation.engine", "run", "--district", name], cwd=ROOT, env=environment, capture_output=True, text=True)
        status = "ok" if outcome.returncode == 0 else "FAILED"
        if outcome.returncode:
            failed.append(name)
        log(f"{name}: {status} in {(datetime.now() - started).seconds}s {outcome.stderr.strip()[-200:] if outcome.returncode else ''}")
        write_board(store)
    return failed


def main() -> int:
    from .ai import load_env_file
    load_env_file(ROOT / ".env.local")
    command = sys.argv[1] if len(sys.argv) > 1 else "build"
    if command == "run":
        temp = sys.argv[2] if len(sys.argv) > 2 else None
        failed = run_missing(district_names(), temp=temp)
        print(f"failed: {failed}" if failed else "all districts ran")
    board = write_board()
    print(f"board: {board['districts_included']}/{board['districts_expected']} districts, missing {board['missing']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
