"""Fetch a small allowlist of official publications with TLS verification."""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from .fileio import replace_file
from urllib.request import Request, urlopen

from .registry import ADDITIONAL_SOURCES, WORLD_BANK_INDICATORS, load_extra, same_site

OFFICIAL_SOURCES = [
    {
        "id": "loda-vup-design", "publisher": "Local Administrative Entities Development Agency",
        "title": "Vision Umurenge Programme document",
        "url": "https://www.loda.gov.rw/fileadmin/user_upload/LODA/Publications/Laws___Policies/Policies/Vision_Umurenge_Programme_document..pdf",
        "data_period": "Programme design document; historical policy context, not current outcomes",
        "geographic_coverage": "Rwanda", "measurement_definition": "VUP components and programme design",
        "methodology": "Programme policy document; no district effectiveness or current budget can be inferred",
    },
    {
        "id": "eicv7-main", "publisher": "National Institute of Statistics of Rwanda",
        "title": "EICV7 Main Indicators Report 2023/24",
        "url": "https://statistics.gov.rw/sites/default/files/documents/2025-07/EICV7_Main%20Indicator%20Report.pdf",
        "data_period": "October 2023–October 2024", "geographic_coverage": "Rwanda and districts",
        "measurement_definition": "EICV7 headcount poverty and other social indicators",
        "methodology": "EICV7 survey; district estimates carry sampling uncertainty",
    },
    {
        "id": "eicv7-poverty", "publisher": "National Institute of Statistics of Rwanda",
        "title": "EICV7 Poverty Profile 2023/24",
        "url": "https://statistics.gov.rw/sites/default/files/documents/2025-07/EICV7_Poverty%20Profile.pdf",
        "data_period": "2016/17 modelled comparison and 2023/24 observed", "geographic_coverage": "Rwanda and districts",
        "measurement_definition": "Poverty under the EICV7 method, including modelled 2016/17 rates",
        "methodology": "NISR multiple-imputation model for 2016/17 comparability",
    },
    {
        "id": "eicv7-method", "publisher": "National Institute of Statistics of Rwanda",
        "title": "EICV7 Methodological Note",
        "url": "https://statistics.gov.rw/sites/default/files/documents/2025-07/EICV7_Methodological%20Note.pdf",
        "data_period": "2023/24", "geographic_coverage": "Rwanda",
        "measurement_definition": "Survey design and poverty measurement methods",
        "methodology": "Official method note; not an outcome dataset",
    },
    {
        "id": "eicv7-vup", "publisher": "National Institute of Statistics of Rwanda",
        "title": "EICV7 VUP Thematic Report 2023/24",
        "url": "https://statistics.gov.rw/sites/default/files/documents/2025-07/EICV7_VUP_Thematic_Report__0.pdf",
        "data_period": "2023/24", "geographic_coverage": "Primarily national VUP beneficiary sample",
        "measurement_definition": "VUP participant characteristics and reported programme experience",
        "methodology": "Separate VUP beneficiary sample; not directly interchangeable with the EICV7 cross-section",
    },
    {
        "id": "eicv7-utilities", "publisher": "National Institute of Statistics of Rwanda",
        "title": "EICV7 Utilities and Amenities Thematic Report",
        "url": "https://statistics.gov.rw/sites/default/files/documents/2025-05/EICV7_Thematic%20Report%20Amenities%20and%20Utilities%20%281%29.pdf",
        "data_period": "2023/24", "geographic_coverage": "Rwanda and published subgroups",
        "measurement_definition": "Household amenities and electricity access",
        "methodology": "EICV7 household survey; not an intervention evaluation",
    },
]


def registered_sources() -> list[dict]:
    """Six NISR/LODA publications, the additional registry and analyst-added sources, each with a tier and retrieval kind."""
    sources = [{"tier": 1, "kind": "pdf", "use": "Calculation and finding support", **item} for item in OFFICIAL_SOURCES]
    return [*sources, *ADDITIONAL_SOURCES, *load_extra()]


SOURCES = registered_sources()


def _page_details(content: bytes, content_type: str) -> dict:
    text = content[:400_000].decode("utf-8", errors="replace")
    title = re.search(r"<title[^>]*>(.*?)</title>", text, re.I | re.S)
    plain = re.sub(r"\s+", " ", re.sub(r"<(?:script|style)[^>]*>.*?</(?:script|style)>|<[^>]+>", " ", text, flags=re.I | re.S)).strip()
    return {"document_title": re.sub(r"\s+", " ", title.group(1)).strip()[:200] if title else None, "excerpt": plain[:600]}


def _fetch_world_bank(source: dict, result: dict) -> dict:
    indicators, errors = [], []
    for code, label in WORLD_BANK_INDICATORS:
        try:
            request = Request(f"{source['url']}{code}?format=json&mrnev=1&per_page=5", headers={"User-Agent": "NISR-Track2-Investigation/1.0"})
            with urlopen(request, timeout=15) as response:
                body = json.loads(response.read(200_000))
            row = body[1][0] if len(body) > 1 and body[1] else None
            if row and row.get("value") is not None:
                indicators.append({"code": code, "label": label, "year": int(row["date"]), "value": row["value"], "last_updated": body[0].get("lastupdated")})
            else:
                errors.append(f"{code}: no recent observation")
        except Exception as error:
            errors.append(f"{code}: {type(error).__name__}")
    result["indicators"] = indicators
    result["indicator_errors"] = errors
    if indicators:
        digest = hashlib.sha256(json.dumps(indicators, sort_keys=True).encode()).hexdigest()
        result.update({"status": "Completed", "version": digest, "content_type": "application/json"})
        if errors:
            result["limitations"] += " Some indicators had no recent observation: " + "; ".join(errors)
    else:
        result["error"] = "No World Bank indicator could be retrieved: " + "; ".join(errors)
    return result


def verify_source(source: dict, cache: Path) -> dict:
    url = source["url"]
    result = {
        **source, "original_url": url, "publication_date": None,
        "retrieved_at": datetime.now(timezone.utc).isoformat(), "version": None,
        "status": "Failed", "error": None,
        "limitations": "Published report figures may have rounding and sampling uncertainty; data period is not publication date.",
    }
    if urlparse(url).scheme != "https":
        result["error"] = "Only HTTPS sources are retrieved."
        return result
    if source.get("kind") == "worldbank-api":
        return _fetch_world_bank(source, result)
    try:
        metadata_file = cache / f"{source['id']}.json"
        previous = json.loads(metadata_file.read_text(encoding="utf-8")) if metadata_file.exists() else {}
        headers = {"User-Agent": "NISR-Track2-Investigation/1.0 (public PDF retrieval)"}
        if previous.get("url") == url and previous.get("status") == "Completed" and Path(previous.get("local_cache", "")).is_file():
            if previous.get("etag"):
                headers["If-None-Match"] = previous["etag"]
            if previous.get("last_modified"):
                headers["If-Modified-Since"] = previous["last_modified"]
        request = Request(url, headers=headers)
        deadline = time.monotonic() + 60
        with urlopen(request, timeout=15) as response:
            if response.status != 200 or not same_site(url, response.geturl()):
                raise ValueError(f"Unexpected response or redirect: HTTP {response.status}")
            blocks = []
            total = 0
            while total <= 12_000_000:
                if time.monotonic() > deadline:
                    raise TimeoutError("Official document exceeded the 60-second retrieval budget")
                block = response.read(65536)
                if not block:
                    break
                blocks.append(block)
                total += len(block)
            content = b"".join(blocks)
            result["etag"] = response.headers.get("ETag")
            result["last_modified"] = response.headers.get("Last-Modified")
            content_type = (response.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if source.get("kind") == "html":
            if len(content) > 12_000_000 or content_type not in {"text/html", "application/xhtml+xml"}:
                raise ValueError("Response is not a bounded HTML page")
            digest = hashlib.sha256(content).hexdigest()
            result.update({"status": "Completed", "version": digest, "content_type": content_type, "final_url": response.geturl(), **_page_details(content, content_type)})
            result["limitations"] = "Landing page snapshot: its content changes without notice. It shows that the publisher and page were reachable on this date; figures on it must be registered and verified before they support a finding."
            return result
        if len(content) > 12_000_000 or not content.startswith(b"%PDF"):
            raise ValueError("Response is not a bounded PDF document")
        cache.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha256(content).hexdigest()
        target = cache / f"{source['id']}-{digest[:12]}.pdf"
        if not target.exists():
            target.write_bytes(content)
        result.update({"status": "Completed", "version": digest, "local_cache": str(target), "content_type": "application/pdf"})
        try:
            from pypdf import PdfReader

            pdf = PdfReader(target)
            result["page_count"] = len(pdf.pages)
            result["document_title"] = str(pdf.metadata.title) if pdf.metadata and pdf.metadata.title else None
            if pdf.metadata and pdf.metadata.creation_date:
                result["pdf_creation_date"] = pdf.metadata.creation_date.isoformat()
            result["excerpt"] = " ".join((pdf.pages[i].extract_text() or "") for i in range(min(2, len(pdf.pages))))[:2000]
        except Exception as error:
            result["pdf_metadata_error"] = str(error)
        temporary = metadata_file.with_suffix(f".{os.getpid()}.tmp")
        temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        replace_file(temporary, metadata_file)
    except HTTPError as error:
        if error.code == 304 and previous.get("version") and Path(previous.get("local_cache", "")).is_file():
            cached = Path(previous["local_cache"])
            if hashlib.sha256(cached.read_bytes()).hexdigest() == previous["version"]:
                return {**previous, "retrieved_at": result["retrieved_at"], "update_check": "Not modified (HTTP 304); cached content hash revalidated"}
        result["error"] = f"HTTPError: HTTP {error.code}"
    except (URLError, TimeoutError, ValueError, OSError) as error:
        result["error"] = f"{type(error).__name__}: {error}"
    if result["status"] == "Failed":
        # A failed update never becomes a successful retrieval. Previously verified
        # public documents may still support their original historical period.
        for register in sorted((cache.parent / "runs").glob("*/02-checking-sources.json"), key=lambda item: item.stat().st_mtime, reverse=True):
            try:
                old = next((item for item in json.loads(register.read_text(encoding="utf-8"))["sources"]
                            if item.get("url") == url and item.get("status") == "Completed"), None)
                if not old or not old.get("local_cache") or not old.get("version"):
                    continue
                file = Path(old["local_cache"]).resolve()
                if not file.is_relative_to(cache.resolve()) or not file.is_file():
                    continue
                if hashlib.sha256(file.read_bytes()).hexdigest() != old["version"]:
                    continue
                result["cached_evidence"] = {**old, "evidence_state": "Previously verified copy; latest update check failed"}
                result["limitations"] += " A hash-verified cached document is available for its original data period; a newer version could not be checked."
                break
            except (OSError, ValueError, KeyError):
                continue
    return result


def evidence_source(records: dict, source_id: str) -> dict | None:
    source = next((item for item in records["sources"] if item["id"] == source_id), None)
    if source and source["status"] == "Completed":
        return source
    if source and source.get("cached_evidence"):
        return source["cached_evidence"]
    return None


def _main_text(source: dict) -> str:
    """Cache extracted public text by the downloaded PDF's versioned path."""
    from pypdf import PdfReader

    pdf_path = Path(source["local_cache"])
    text_path = pdf_path.with_suffix(".txt")
    if text_path.exists():
        return text_path.read_text(encoding="utf-8")
    text = "\n\f\n".join(page.extract_text() or "" for page in PdfReader(pdf_path).pages)
    temporary = text_path.with_suffix(f".{os.getpid()}.tmp")
    temporary.write_text(text, encoding="utf-8")
    replace_file(temporary, text_path)
    return text


def check_sources(cache: Path, progress=None) -> dict:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    registry = registered_sources()
    checked: dict[int, dict] = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(verify_source, source, cache): position for position, source in enumerate(registry)}
        for future in as_completed(futures):
            position = futures[future]
            try:
                record = future.result()
            except Exception as error:
                record = {**registry[position], "original_url": registry[position]["url"], "status": "Failed", "error": f"{type(error).__name__}: {error}",
                          "retrieved_at": datetime.now(timezone.utc).isoformat(), "version": None, "publication_date": None, "limitations": ""}
            checked[position] = record
            if progress:
                done = list(checked.values())
                progress({"source": registry[position]["title"], "status": record["status"], "sources_checked": len(done),
                          "sources_verified": sum(item["status"] == "Completed" for item in done),
                          "cached_sources_available": sum(bool(item.get("cached_evidence")) for item in done)})
    ordered = [checked[position] for position in range(len(registry))]
    return {"sources": ordered, "verified_count": sum(item["status"] == "Completed" for item in ordered),
            "failed_count": sum(item["status"] == "Failed" for item in ordered),
            "cached_count": sum(bool(item.get("cached_evidence")) for item in ordered)}


def detect_published_rate_conflicts(records: dict, district_rates: list[dict]) -> list[dict]:
    main = evidence_source(records, "eicv7-main")
    if not main:
        return []
    text = _main_text(main)
    official_table = published_poverty_intervals(records)
    conflicts = []
    for row in district_rates:
        district = re.escape(row["district"])
        for match in re.finditer(rf"\b{district}\s*\(\s*(\d+(?:\.\d+)?)\s*%\s*\)", text, re.I):
            mentioned = float(match.group(1))
            if abs(mentioned - row["poverty"]) > 0.05:
                table_rate = official_table.get(row["district"], {}).get("rate")
                agrees = table_rate is not None and abs(table_rate - row["poverty"]) <= 0.15
                conflicts.append({
                    "district": row["district"], "published_narrative": mentioned,
                    "calculated_eicv7": row["poverty"], "source_id": main["id"],
                    "published_table_rate": table_rate, "table_microdata_agree": agrees,
                    "explanation": f"{row['district']}: narrative {mentioned:.1f}% versus calculated {row['poverty']:.1f}%. " + (f"NISR Table A9.23 gives {table_rate:.2f}%, agreeing with the calculation after rounding. The calculation uses the table-consistent rate; the narrative discrepancy remains for publisher review." if agrees else "An official-table reconciliation is still needed before resolving the disagreement."),
                })
    return conflicts


def published_modelled_comparison(records: dict) -> dict[str, dict]:
    profile = evidence_source(records, "eicv7-poverty")
    if not profile:
        return {}
    from pypdf import PdfReader

    reader = PdfReader(profile["local_cache"])
    text = "\n".join(page.extract_text() or "" for page in reader.pages[-5:])
    result = {}
    for match in re.finditer(r"(?m)^\s*\d+\s+([A-Za-z]+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s*$", text):
        name, earlier, latest, decrease = match.groups()
        result[name] = {"earlier_modelled": float(earlier), "latest_published": float(latest),
                        "published_decrease_points": float(decrease), "source_id": profile["id"], "url": profile["url"]}
    return result


def published_poverty_intervals(records: dict) -> dict[str, dict]:
    """Read NISR's design-adjusted district intervals from EICV7 Main Indicators Table A9.23."""
    main = evidence_source(records, "eicv7-main")
    if not main:
        return {}
    for text in _main_text(main).split("\f"):
        if "Table A9.23: Headcount Poverty rate" not in text or "95%CI lower bound" not in text:
            continue
        result = {}
        for match in re.finditer(r"(?m)^\s*([A-Za-z]+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s*$", text):
            name, rate, standard_error, lower, upper, cv, design_effect = match.groups()
            result[name] = {"rate": float(rate), "standard_error": float(standard_error),
                            "lower": float(lower), "upper": float(upper), "coefficient_of_variation": float(cv),
                            "design_effect": float(design_effect), "level": 95, "source_id": main["id"], "url": main["url"]}
        if result:
            return result
    return {}
