"""Checks the engine's own findings against published official evidence.

The engine's numbers always come from its own calculations. This module only reads published tables (from documents the engine
has already retrieved and cached, with their version and retrieval time) and reports whether each claim matches, differs,
cannot be compared, or cannot be checked. It never changes an internal value to match a publication, and it never reports a
claim as verified when the source could not be read.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

STATUS_VERIFIED = "verified_match"
STATUS_DISCREPANCY = "discrepancy_requires_review"
STATUS_UNVERIFIED = "not_externally_verified"
STATUS_MISMATCH = "methodology_mismatch"
STATUS_NEW = "new_analytical_finding"
STATUSES = (STATUS_VERIFIED, STATUS_DISCREPANCY, STATUS_UNVERIFIED, STATUS_MISMATCH, STATUS_NEW)
STATUS_LABELS = {STATUS_VERIFIED: "Verified match", STATUS_DISCREPANCY: "Discrepancy requiring review", STATUS_UNVERIFIED: "Not externally verified",
                 STATUS_MISMATCH: "Methodology mismatch", STATUS_NEW: "New analytical finding"}

# Published rates carry one or two decimals and the engine rounds to one, so a gap of up to a tenth is rounding.
TOLERANCE_POINTS = 0.1
# Two official publications of the same figure may be rounded differently.
PUBLICATION_TOLERANCE_POINTS = 0.15

MAIN_COLUMNS = ("value", "standard_error", "lower", "upper", "cv", "design_effect")
COUNT_COLUMNS = ("value", "standard_error", "lower", "upper", "unweighted_count")
NUMBER = r"-?\d+(?:\.\d+)?"

# What each published table measures, compared with what the engine measures.
CLAIMS = [
    {"id": "poverty_headcount", "label": "Poverty rate (district)", "geography": "district", "key": "poverty", "unit": "percent of people", "denominator": "people",
     "internal_definition": "Population-weighted share of residents with pov_jan == Poor (January 2024 poverty method).",
     "published": [{"source": "eicv7-main", "table": "A9.23", "columns": MAIN_COLUMNS, "row": "district", "denominator": "people", "period": "2023/24", "same_concept": True,
                    "definition": "Headcount poverty rate (%) by district, EICV7 2023/24."}]},
    {"id": "poverty_headcount_national", "label": "Poverty rate (Rwanda)", "geography": "national", "key": "poverty", "unit": "percent of people", "denominator": "people",
     "internal_definition": "Population-weighted share of residents with pov_jan == Poor, all Rwanda.",
     "published": [{"source": "eicv7-main", "table": "9.1", "columns": MAIN_COLUMNS, "row": "Rwanda", "denominator": "people", "period": "2023/24", "same_concept": True,
                    "definition": "Headcount poverty rate (%), Rwanda, EICV7 2023/24."}]},
    {"id": "extreme_poverty_national", "label": "Extreme poverty rate (Rwanda)", "geography": "national", "key": "extreme_poverty", "unit": "percent of people", "denominator": "people",
     "internal_definition": "Population-weighted share of residents below the extreme poverty line, all Rwanda.",
     "published": [{"source": "eicv7-main", "table": "9.2", "columns": MAIN_COLUMNS, "row": "Rwanda", "denominator": "people", "period": "2023/24", "same_concept": True,
                    "definition": "Headcount extreme poverty rate (%), Rwanda, EICV7 2023/24."}]},
    {"id": "health_insurance", "label": "People with current health insurance (district)", "geography": "district", "key": "health_insurance", "unit": "percent of people", "denominator": "people",
     "internal_definition": "Person-weighted share answering Yes to current health insurance; Don't know excluded.",
     "published": [{"source": "eicv7-main", "table": "A3.7", "columns": MAIN_COLUMNS, "row": "district", "denominator": "people", "period": "2023/24", "same_concept": True,
                    "definition": "Percentage (%) of population with health insurance, by district."}]},
    {"id": "health_insurance_national", "label": "People with current health insurance (Rwanda)", "geography": "national", "key": "health_insurance", "unit": "percent of people", "denominator": "people",
     "internal_definition": "Person-weighted share answering Yes to current health insurance, all Rwanda; Don't know excluded.",
     "published": [{"source": "eicv7-main", "table": "A3.7", "columns": MAIN_COLUMNS, "row": "Rwanda", "denominator": "people", "period": "2023/24", "same_concept": True,
                    "definition": "Percentage (%) of population with health insurance, Rwanda."}]},
    {"id": "grid_connection", "label": "Households with grid electricity (district)", "geography": "district", "key": "grid_connection", "unit": "percent of households", "denominator": "households",
     "internal_definition": "Household-weighted share reporting a grid connection (grid, or grid and solar); solar-only excluded.",
     "published": [
         {"source": "eicv7-main", "table": "A5.14", "columns": MAIN_COLUMNS, "row": "district", "denominator": "households", "period": "2023/24", "same_concept": False,
          "definition": "Households using electricity as the main source of lighting (a different question from having a grid connection)."},
         {"source": "eicv7-utilities", "table": "B.7", "columns": COUNT_COLUMNS, "row": "district", "denominator": "households", "period": "2023/24", "same_concept": False,
          "definition": "Households using the electricity distributor as the primary source of lighting (a different question from having a grid connection)."}]},
    {"id": "grid_connection_national", "label": "Households with grid electricity (Rwanda)", "geography": "national", "key": "grid_connection", "unit": "percent of households", "denominator": "households",
     "internal_definition": "Household-weighted share reporting a grid connection (grid, or grid and solar), all Rwanda; solar-only excluded.",
     "published": [{"source": "eicv7-main", "table": "A5.14", "columns": MAIN_COLUMNS, "row": "Rwanda", "denominator": "households", "period": "2023/24", "same_concept": False,
                    "definition": "Households using electricity as the main source of lighting (a different question from having a grid connection)."}]},
    {"id": "vup_among_poor", "label": "Poor households reporting VUP participation (district)", "geography": "district", "key": "vup_among_poor", "unit": "percent of surveyed poor households", "denominator": "poor households",
     "internal_definition": "Household-weighted share of surveyed poor households with a VUP participant in any of five S9D modules; not payment receipt or eligibility.",
     "published": []},
    {"id": "district_sample_households", "label": "Surveyed households in the district", "geography": "district", "key": "sample_households", "unit": "households", "denominator": "households", "count": True,
     "internal_definition": "Households interviewed in the district in EICV7.",
     "published": [{"source": "eicv7-utilities", "table": "B.7", "columns": COUNT_COLUMNS, "row": "district", "denominator": "households", "period": "2023/24", "same_concept": True,
                    "definition": "Unweighted household count shown beside the electricity table for the district.", "compare": "unweighted_count"}]},
]


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---- reading published tables --------------------------------------------------------------------------------------

def page_texts(source: dict) -> list[str]:
    from .sources import _main_text

    return _main_text(source).split("\f")


def printed_page(text: str) -> str | None:
    """The page number printed on the document page, which differs from the PDF page index."""
    for line in [item.strip() for item in text.splitlines() if item.strip()][:6]:
        if re.fullmatch(r"\d{1,3}", line):
            return line
        match = re.match(r"^(\d{1,3})\s*\|", line) or re.search(r"\|\s*(\d{1,3})$", line)
        if match:
            return match.group(1)
    return None


def _marker(table_id: str) -> re.Pattern:
    parts = [re.escape(part) for part in table_id.split(".")]
    return re.compile(r"Table\s+" + r"\.\s*".join(parts) + r"\s*[:.]")


NEXT_TABLE = re.compile(r"(?m)^\s*Table\s+[A-Z]?\d+\s*\.?\s*\d*\s*[:.]")


def find_row(source: dict, table_id: str, label: str, columns: tuple, lookahead: int = 4) -> dict | None:
    """Finds a labelled row of a published table, following it onto the next pages. Contents pages carry titles but no rows, so they never match."""
    pages = page_texts(source)
    marker = _marker(table_id)
    row = re.compile(rf"(?m)^\s*(?:All\s+)?{re.escape(label)}\s+((?:{NUMBER}\s*)+)$")
    for index, text in enumerate(pages):
        for found in marker.finditer(text):
            for offset in range(lookahead + 1):
                if index + offset >= len(pages):
                    break
                chunk = text[found.end():] if offset == 0 else pages[index + offset]
                following = NEXT_TABLE.search(chunk)
                if following:
                    chunk = chunk[:following.start()]
                match = row.search(chunk)
                if match:
                    numbers = [float(token) for token in re.findall(NUMBER, match.group(1))]
                    if len(numbers) < 4:
                        continue
                    values = dict(zip(columns, numbers))
                    return {**values, "table": table_id, "pdf_page": index + offset + 1, "printed_page": printed_page(pages[index + offset]),
                            "decimals": max(len(token.split(".")[1]) if "." in token else 0 for token in re.findall(NUMBER, match.group(1))[:1])}
                if following:
                    break
    return None


# ---- comparing one claim ----------------------------------------------------------------------------------------------

def comparability(internal: dict, published: dict) -> list[str]:
    """Reasons two figures with the same indicator name must not be treated as directly comparable."""
    issues = []
    if internal.get("period") and published.get("period") and internal["period"] != published["period"]:
        issues.append(f"Different survey period: internal {internal['period']}, published {published['period']}.")
    if internal.get("denominator") != published.get("denominator"):
        issues.append(f"Different population or denominator: internal {internal.get('denominator')}, published {published.get('denominator')}.")
    if internal.get("unit") and published.get("unit") and internal["unit"] != published["unit"]:
        issues.append(f"Different unit: internal {internal['unit']}, published {published['unit']}.")
    if internal.get("geography") != published.get("geography"):
        issues.append(f"Different geography: internal {internal.get('geography')}, published {published.get('geography')}.")
    if published.get("same_concept") is False:
        issues.append(f"Different definition. Internal: {internal.get('definition')} Published: {published.get('definition')}")
    return issues


def decide(internal_value, internal_meta: dict, candidates: list[dict], tolerance: float = TOLERANCE_POINTS) -> dict:
    """Status for one claim from the internal value and every published candidate that could be read."""
    if internal_value is None:
        return {"status": STATUS_UNVERIFIED, "comparable": None, "notes": ["The engine has no internal value for this indicator."], "difference": None}
    if not candidates:
        return {"status": STATUS_UNVERIFIED, "comparable": None, "notes": [], "difference": None}
    comparable, mismatched = [], []
    for candidate in candidates:
        issues = comparability(internal_meta, candidate)
        (mismatched if issues else comparable).append((candidate, issues))
    notes = []
    if comparable:
        values = [item["value"] for item, _ in comparable]
        if len(values) > 1 and max(values) - min(values) > PUBLICATION_TOLERANCE_POINTS:
            notes.append("Official publications disagree with each other: " + "; ".join(f"{item['source']} {item['table']} = {item['value']}" for item, _ in comparable) + ".")
            return {"status": STATUS_DISCREPANCY, "comparable": True, "notes": notes, "difference": None, "primary": comparable[0][0]}
        primary = comparable[0][0]
        difference = round(internal_value - primary["value"], 2)
        if abs(difference) <= tolerance:
            return {"status": STATUS_VERIFIED, "comparable": True, "difference": difference, "primary": primary,
                    "notes": ["The published value matches within rounding. This confirms the value only; it does not independently validate how the internal figure was calculated."]}
        notes.append(f"Internal value {internal_value} differs from the published value {primary['value']} by {difference} points. Possible causes to check: data version, survey weighting, population coverage, units or a calculation error. The internal value was not changed.")
        return {"status": STATUS_DISCREPANCY, "comparable": True, "notes": notes, "difference": difference, "primary": primary}
    primary, issues = mismatched[0]
    notes.extend(issues)
    notes.append(f"The published figure ({primary['value']}) is not a like-for-like comparison, so a difference of {round(internal_value - primary['value'], 2)} points is not treated as an error.")
    return {"status": STATUS_MISMATCH, "comparable": False, "notes": notes, "difference": round(internal_value - primary["value"], 2), "primary": primary}


# ---- the registry ------------------------------------------------------------------------------------------------------

def _internal_value(claim: dict, district_row: dict, national_row: dict):
    row = district_row if claim["geography"] == "district" else national_row
    return row.get(claim["key"])


def _source_info(records: dict, source_id: str) -> dict:
    from .sources import evidence_source

    source = evidence_source(records, source_id) if records else None
    if source is None:
        listed = next((item for item in (records or {}).get("sources", []) if item["id"] == source_id), None)
        return {"id": source_id, "available": False, "error": (listed or {}).get("error") or "The source could not be retrieved and no cached copy exists.",
                "url": (listed or {}).get("url"), "title": (listed or {}).get("title")}
    return {"id": source_id, "available": True, "record": source, "url": source.get("url"), "title": source.get("title"), "version": source.get("version"),
            "retrieved_at": source.get("retrieved_at"), "last_modified": source.get("last_modified"), "publication_date": source.get("publication_date"),
            "organization": source.get("publisher")}


def check_claim(claim: dict, district: str, district_row: dict, national_row: dict, records: dict, audit: list, period: str = "2023/24") -> dict:
    internal = _internal_value(claim, district_row, national_row)
    meta = {"period": period, "denominator": claim["denominator"], "unit": claim["unit"], "geography": claim["geography"], "definition": claim["internal_definition"]}
    candidates, retrieval_notes, used_sources = [], [], []
    for spec in claim["published"]:
        info = _source_info(records, spec["source"])
        audit.append({"at": now(), "step": "retrieve", "indicator_id": claim["id"], "detail": f"{spec['source']} Table {spec['table']}: " + ("cached document read" if info["available"] else "source unavailable")})
        if not info["available"]:
            retrieval_notes.append(f"{info.get('title') or spec['source']} could not be retrieved ({info['error']}), so this claim was not verified against it.")
            continue
        label = district if spec["row"] == "district" else spec["row"]
        try:
            row = find_row(info["record"], spec["table"], label, spec["columns"])
        except Exception as error:  # an unreadable document must not look like a verified claim
            retrieval_notes.append(f"{info['title']} could not be read ({type(error).__name__}).")
            continue
        if row is None:
            retrieval_notes.append(f"Table {spec['table']} in {info['title']} has no row for {label}.")
            continue
        candidates.append({**spec, "value": row.get(spec.get("compare", "value")), "row": row, "unit": claim["unit"], "geography": claim["geography"], "info": info})
        used_sources.append(info)
    outcome = decide(internal, meta, candidates)
    status = outcome["status"]
    primary = outcome.get("primary") or (candidates[0] if candidates else None)
    notes = list(outcome["notes"]) + retrieval_notes
    if status == STATUS_UNVERIFIED and not claim["published"]:
        notes.append("No published district table reports this indicator, so it is an analysis of the microdata that has not been compared with an official figure.")
    entry = {
        "indicator_id": claim["id"], "indicator": claim["label"], "district": district if claim["geography"] == "district" else "Rwanda",
        "survey_period": period, "internal_value": internal, "published_value": primary["value"] if primary else None, "unit": claim["unit"],
        "source_organization": primary["info"].get("organization") if primary else None,
        "source_document": primary["info"].get("title") if primary else None,
        "source_url": primary["info"].get("url") if primary else None,
        "source_page_or_table": (f"Table {primary['table']}, PDF page {primary['row']['pdf_page']}" + (f" (printed page {primary['row']['printed_page']})" if primary["row"].get("printed_page") else "")) if primary else None,
        "verification_status": status, "status_label": STATUS_LABELS[status], "methodology_comparable": outcome["comparable"],
        "verification_notes": " ".join(notes), "retrieved_at": primary["info"].get("retrieved_at") if primary else None,
        "source_version": (primary["info"].get("version") or "")[:12] if primary else None,
        # The spread printed beside a household count belongs to the percentage in the same table, so it is not shown for counts.
        "published_standard_error": primary["row"].get("standard_error") if primary and not claim.get("count") else None,
        "published_interval": [primary["row"].get("lower"), primary["row"].get("upper")] if primary and not claim.get("count") else None,
        "estimate_type": "observed", "difference": outcome.get("difference"),
        "internal_definition": claim["internal_definition"], "published_definition": primary.get("definition") if primary else None,
        "other_published": [{"source_document": item["info"].get("title"), "table": item["table"], "value": item["value"], "pdf_page": item["row"]["pdf_page"],
                             "definition": item["definition"]} for item in candidates if item is not primary],
    }
    audit.append({"at": now(), "step": "compare", "indicator_id": claim["id"], "detail": f"{STATUS_LABELS[status]}: internal {internal}, published {entry['published_value']}"})
    return entry


def standard_error_claim(analysis: dict, district: str, records: dict, audit: list) -> dict:
    """The survey-design check: the engine's own standard error for district poverty against NISR's design-adjusted one."""
    context = analysis.get("contextual_analysis") or {}
    own, published = context.get("selected_poverty_se_points"), context.get("published_se_points")
    info = _source_info(records, "eicv7-main")
    row = find_row(info["record"], "A9.23", district, MAIN_COLUMNS) if info["available"] else None
    status = STATUS_UNVERIFIED
    notes = []
    if own is None or row is None:
        notes.append("The published design-adjusted standard error could not be read, so the survey-design calculation was not verified.")
    elif abs(own - row["standard_error"]) <= TOLERANCE_POINTS:
        status = STATUS_VERIFIED
        notes.append(f"The engine's standard error from the microdata (stratified, clustered design) agrees with NISR's design-adjusted value. NISR reports a design effect of {row['design_effect']}, so the simple random sampling formula would understate the uncertainty. The 95% interval shown in reports is NISR's published interval ({row['lower']} to {row['upper']}), not one recalculated here.")
    else:
        status = STATUS_DISCREPANCY
        notes.append(f"The engine's standard error ({own}) differs from NISR's ({row['standard_error']}). District comparisons that rely on it should be reviewed.")
    audit.append({"at": now(), "step": "compare", "indicator_id": "poverty_headcount_standard_error", "detail": f"{STATUS_LABELS[status]}: internal {own}, published {row['standard_error'] if row else None}"})
    return {"indicator_id": "poverty_headcount_standard_error", "indicator": "Standard error of the district poverty rate", "district": district, "survey_period": "2023/24",
            "internal_value": own, "published_value": row["standard_error"] if row else None, "unit": "percentage points",
            "source_organization": info.get("organization"), "source_document": info.get("title"), "source_url": info.get("url"),
            "source_page_or_table": f"Table A9.23, PDF page {row['pdf_page']}" + (f" (printed page {row['printed_page']})" if row.get("printed_page") else "") if row else None,
            "verification_status": status, "status_label": STATUS_LABELS[status], "methodology_comparable": True if row else None, "verification_notes": " ".join(notes),
            "retrieved_at": info.get("retrieved_at"), "source_version": (info.get("version") or "")[:12], "published_standard_error": None,
            "published_interval": None, "estimate_type": "observed", "difference": round(own - row["standard_error"], 3) if own is not None and row else None,
            "internal_definition": "Taylor-linearised standard error with strata and clusters.", "published_definition": "Design-adjusted standard error, 95% interval, design effect.", "other_published": []}


def modelled_claim(district: str, records: dict, findings: list, audit: list) -> dict | None:
    """The 2016/17 figure is a modelled estimate that NISR publishes; it is copied, not recalculated, and is never mixed with observed values."""
    from .sources import published_modelled_comparison

    try:
        row = published_modelled_comparison(records).get(district)
    except Exception:
        row = None
    finding = next((item for item in findings if item["id"] == "modelled_change"), None)
    if not row or not finding:
        return None
    info = _source_info(records, "eicv7-poverty")
    audit.append({"at": now(), "step": "retrieve", "indicator_id": "poverty_2016_17_modelled", "detail": "eicv7-poverty annex read"})
    return {"indicator_id": "poverty_2016_17_modelled", "indicator": "Poverty rate in 2016/17, modelled to the EICV7 method", "district": district, "survey_period": "2016/17 (modelled)",
            "internal_value": row["earlier_modelled"], "published_value": row["earlier_modelled"], "unit": "percent of people", "source_organization": info.get("organization"),
            "source_document": info.get("title"), "source_url": row["url"], "source_page_or_table": "Poverty Profile, annex table of modelled and observed district rates",
            "verification_status": STATUS_VERIFIED, "status_label": STATUS_LABELS[STATUS_VERIFIED], "methodology_comparable": False,
            "verification_notes": f"This is a modelled estimate, not an observed one. The engine reproduces NISR's published figure ({row['earlier_modelled']}%); it is copied, not recalculated. Observed EICV5 and EICV7 rates must not be subtracted directly; NISR's published decrease is {row['published_decrease_points']} points and district significance is not established.",
            "retrieved_at": info.get("retrieved_at"), "source_version": (info.get("version") or "")[:12], "published_standard_error": None, "published_interval": None,
            "estimate_type": "modelled", "difference": 0.0, "internal_definition": "Published modelled value, reproduced.", "published_definition": "Multiple-imputation modelled 2016/17 headcount.", "other_published": []}


def original_entries(district: str, analysis: dict, drivers: dict | None) -> list[dict]:
    """Findings with no published counterpart. They are reported as original analyses, never as verified."""
    entries = []

    def add(indicator_id, label, value, unit, note):
        entries.append({"indicator_id": indicator_id, "indicator": label, "district": district, "survey_period": "2023/24", "internal_value": value, "published_value": None, "unit": unit,
                        "source_organization": None, "source_document": None, "source_url": None, "source_page_or_table": None, "verification_status": STATUS_NEW,
                        "status_label": STATUS_LABELS[STATUS_NEW], "methodology_comparable": None, "verification_notes": note, "retrieved_at": None, "source_version": None,
                        "published_standard_error": None, "published_interval": None, "estimate_type": "observed", "difference": None,
                        "internal_definition": note, "published_definition": None, "other_published": []})

    depth = (drivers or {}).get("depth", {}).get("district") if drivers else None
    if depth:
        add("poverty_gap", "Poverty gap (average shortfall below the poverty line)", depth.get("poverty_gap_pct"), "percent of the poverty line", "Calculated from the microdata. No published district value was compared.")
        add("poverty_severity", "Poverty severity", depth.get("severity_pct"), "percent", "Calculated from the microdata. No published district value was compared.")
    if drivers:
        add("gap_explained_points", "Part of the gap to Rwanda lined up with measured factors (Oaxaca-Blinder)", drivers.get("explained_points"), "percentage points",
            "Original decomposition of the gap on a weighted linear probability model. It describes associations, not causes.")
        add("gap_unexplained_points", "Part of the gap to Rwanda not lined up with measured factors", drivers.get("unexplained_points"), "percentage points",
            "Original decomposition; the leftover includes everything the survey does not measure, as well as measurement error.")
    return entries


def methods_review(drivers: dict | None, analysis: dict) -> dict:
    """Checks on the decomposition that can be made from its own output: arithmetic, reproducibility, and what it can and cannot say."""
    checks = []
    if not drivers:
        return {"decomposition": {"status": "Unavailable", "checks": [], "assumptions": [], "reproduce": None}}
    gap, explained, unexplained = drivers.get("gap_points"), drivers.get("explained_points"), drivers.get("unexplained_points")
    if None not in (gap, explained, unexplained):
        checks.append({"check": "Explained plus unexplained equals the gap", "expected": gap, "observed": round(explained + unexplained, 2), "passed": abs(gap - explained - unexplained) <= 0.06})
    groups = drivers.get("groups") or []
    if groups and explained is not None:
        total = round(sum(item.get("contribution_points", 0) for item in groups), 2)
        checks.append({"check": "Factor-group contributions add up to the explained part", "expected": explained, "observed": total, "passed": abs(total - explained) <= 0.06})
    model = drivers.get("model") or {}
    checks.append({"check": "Bootstrap repeated at least 100 times with a recorded random seed", "expected": ">= 100 with a seed", "observed": f"{model.get('bootstrap_replicates')} replicates, seed {model.get('seed')}",
                   "passed": bool(model.get("seed") is not None and (model.get("bootstrap_replicates") or 0) >= 100)})
    markers = drivers.get("explained_excl_markers_points")
    if markers is not None and explained is not None:
        checks.append({"check": "Signs of deprivation (markers) are not counted as causes", "expected": f"{markers} or less counted", "observed": f"{markers} of {explained}", "passed": markers <= explained + 0.01})
    checks.append({"check": "Model fit is stated", "expected": "weighted R-squared reported", "observed": model.get("weighted_r_squared"), "passed": model.get("weighted_r_squared") is not None})
    return {"decomposition": {
        "status": "Completed" if all(item["passed"] for item in checks) else "Needs review", "checks": checks,
        "assumptions": ["The poverty indicator is modelled with a weighted linear probability model, which is a simple approximation for a yes/no outcome.",
                        "Rwanda is the reference group: the gap is split using Rwanda's coefficients, so a different reference would give different shares.",
                        "The unexplained part holds everything not measured (prices, markets, services, local shocks, income swings) and measurement error.",
                        "Contributions describe what lines up with the gap. They are associations and do not show that changing a factor would change poverty."],
        "reproduce": f"Run the engine for {drivers.get('district')} on the same data version; the bootstrap uses seed {model.get('seed')} with {model.get('bootstrap_replicates')} replicates and clusters as the resampling unit.",
    }}


def directions(district_row: dict, national_row: dict, findings: list) -> list[dict]:
    """The true direction of each district-versus-Rwanda comparison, so the wording of a report can be checked against it."""
    found = []
    for item in findings:
        if item.get("value") is None or item.get("national") is None or item["id"] == "modelled_change":
            continue
        gap = round(item["value"] - item["national"], 2)
        found.append({"id": item["id"], "district_value": item["value"], "national_value": item["national"], "difference": gap, "direction": "above" if gap > 0 else "below" if gap < 0 else "equal"})
    return found


def summarize(entries: list[dict], review: dict) -> dict:
    counts = {status: sum(item["verification_status"] == status for item in entries) for status in STATUSES}
    blocking = [item for item in entries if item["verification_status"] == STATUS_DISCREPANCY]
    review_status = (review.get("decomposition") or {}).get("status")
    return {"total": len(entries), "counts": counts, "unresolved": len(blocking) + (1 if review_status == "Needs review" else 0),
            "unresolved_items": [item["indicator_id"] for item in blocking] + (["decomposition"] if review_status == "Needs review" else [])}


def verify_evidence(district: str, analysis: dict, drivers: dict | None, findings: dict, records: dict) -> dict:
    """Runs every check for one district. Nothing here changes the findings."""
    audit: list[dict] = [{"at": now(), "step": "start", "indicator_id": None, "detail": f"Evidence verification started for {district}"}]
    district_row = (analysis.get("comparison") or {}).get("district") or analysis.get("selected") or {}
    national_row = (analysis.get("comparison") or {}).get("national") or analysis.get("national") or {}
    entries = [check_claim(claim, district, district_row, national_row, records, audit) for claim in CLAIMS]
    entries.append(standard_error_claim(analysis, district, records, audit))
    modelled = modelled_claim(district, records, findings["findings"], audit)
    if modelled:
        entries.append(modelled)
    entries.extend(original_entries(district, analysis, drivers))
    review = methods_review(drivers, analysis)
    summary = summarize(entries, review)
    used_ids = sorted({spec["source"] for claim in CLAIMS for spec in claim["published"]} | {"eicv7-poverty"})
    sources = []
    for source_id in used_ids:
        info = _source_info(records, source_id)
        sources.append({"id": source_id, "title": info.get("title"), "url": info.get("url"), "available": info["available"], "version": (info.get("version") or "")[:12],
                        "retrieved_at": info.get("retrieved_at"), "last_modified": info.get("last_modified"), "error": None if info["available"] else info.get("error")})
    audit.append({"at": now(), "step": "finish", "indicator_id": None, "detail": f"{summary['total']} claims checked; {summary['unresolved']} unresolved"})
    return {
        "status": "Completed", "generated_at": now(), "district": district, "summary": summary, "registry": entries, "methods_review": review, "directions": directions(district_row, national_row, findings["findings"]),
        "sources": sources, "audit_trail": audit,
        "limitations": ["A match with a published figure confirms the value only. It does not validate how the internal figure was calculated.",
                        "Published tables are read from the documents the engine retrieved and cached, with their version and retrieval time. If a document could not be retrieved, the claim is reported as not verified.",
                        "Two figures with the same indicator name are compared only when their definitions, population, period and geography agree; otherwise they are reported as a methodology mismatch.",
                        "Original analyses have no published counterpart and are labelled as new findings. They describe associations, not causes."],
    }
