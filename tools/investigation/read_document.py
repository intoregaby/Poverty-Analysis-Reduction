"""Reads one downloaded file (PDF, CSV, JSON or Excel) into plain text the AI can search.

Usage: python -m tools.investigation.read_document <kind> <path>
Prints one JSON object: {"title", "text", "rows", "columns", "pages", "truncated"}.
Tables are written one row per line so a search for a district finds its row.
"""

from __future__ import annotations

import json
import sys

MAX_TEXT = 400000
MAX_ROWS = 20000
MAX_PAGES = 300


def _clean(value) -> str:
    text = str(value).replace("\n", " ").replace("\r", " ").strip()
    return text[:120]


def _table_text(frame, label: str) -> dict:
    import pandas as pd

    rows_total = len(frame)
    frame = frame.head(MAX_ROWS)
    frame.columns = [_clean(column) or f"column {index + 1}" for index, column in enumerate(frame.columns)]
    lines = [f"{label}: {rows_total:,} rows by {len(frame.columns)} columns.", "Columns: " + "; ".join(frame.columns)]
    stats = []
    for column in frame.columns:
        numbers = pd.to_numeric(frame[column], errors="coerce")
        if numbers.notna().sum() >= max(3, len(frame) // 2):
            stats.append(f"{column}: min {numbers.min():g}, mean {numbers.mean():.4g}, max {numbers.max():g}")
    if stats:
        lines.append("Numeric summary: " + " | ".join(stats[:12]))
    used = sum(len(line) + 1 for line in lines)
    kept = 0
    for number, record in enumerate(frame.itertuples(index=False), start=1):
        line = f"Row {number}: " + "; ".join(f"{column}={_clean(value)}" for column, value in zip(frame.columns, record) if str(value) not in ("nan", "None", ""))
        used += len(line) + 1
        if used > MAX_TEXT:
            break
        lines.append(line)
        kept += 1
    return {"text": "\n".join(lines), "rows": rows_total, "columns": len(frame.columns), "truncated": kept < rows_total}


def _read_csv(path: str) -> dict:
    import pandas as pd

    last = None
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            frame = pd.read_csv(path, sep=None, engine="python", encoding=encoding, nrows=MAX_ROWS + 1, on_bad_lines="skip")
            return _table_text(frame, "CSV table")
        except Exception as error:  # noqa: BLE001 - try the next encoding, report the last failure
            last = error
    raise ValueError(f"The CSV file could not be read ({type(last).__name__}).")


def _read_excel(path: str) -> dict:
    import pandas as pd

    sheets = pd.read_excel(path, sheet_name=None, nrows=MAX_ROWS + 1)
    parts = [_table_text(frame, f"Sheet '{name}'") for name, frame in list(sheets.items())[:6]]
    return {"text": "\n\n".join(part["text"] for part in parts)[:MAX_TEXT], "rows": sum(part["rows"] for part in parts), "columns": max((part["columns"] for part in parts), default=0), "truncated": any(part["truncated"] for part in parts)}


def _records(value):
    if isinstance(value, list) and value and all(isinstance(item, dict) for item in value):
        return value
    if isinstance(value, list) and len(value) == 2 and isinstance(value[1], list) and value[1] and all(isinstance(item, dict) for item in value[1]):
        return value[1]  # World Bank style: [metadata, rows]
    if isinstance(value, dict):
        for key in ("data", "results", "items", "records", "rows", "datasets", "result"):
            found = _records(value.get(key))
            if found:
                return found
    return None


def _read_json(path: str) -> dict:
    import pandas as pd

    with open(path, encoding="utf-8-sig") as handle:
        value = json.load(handle)
    records = _records(value)
    if records:
        return _table_text(pd.json_normalize(records), "JSON table")
    text = json.dumps(value, ensure_ascii=False, indent=1)
    return {"text": text[:MAX_TEXT], "rows": None, "columns": None, "truncated": len(text) > MAX_TEXT}


def _read_pdf(path: str) -> dict:
    from pypdf import PdfReader

    reader = PdfReader(path)
    if reader.is_encrypted:
        raise ValueError("This PDF is password protected.")
    pages = []
    size = 0
    for number, page in enumerate(reader.pages[:MAX_PAGES], start=1):
        text = (page.extract_text() or "").strip()
        if not text:
            continue
        pages.append(f"[page {number}]\n{text}")
        size += len(text)
        if size > MAX_TEXT:
            break
    joined = "\n\n".join(pages)
    if len(joined.strip()) < 200:
        raise ValueError("This PDF has no readable text. It may be a scan of paper pages, which needs OCR.")
    title = ""
    try:
        title = (reader.metadata.title or "") if reader.metadata else ""
    except Exception:  # noqa: BLE001
        title = ""
    return {"text": joined[:MAX_TEXT], "title": str(title)[:160], "pages": len(reader.pages), "truncated": len(reader.pages) > MAX_PAGES or len(joined) > MAX_TEXT}


def _read_txt(path: str) -> dict:
    with open(path, "rb") as handle:
        raw = handle.read(MAX_TEXT * 4)
    text = raw.decode("utf-8", errors="replace").strip()
    if len(text) < 20:
        raise ValueError("This text file is almost empty.")
    return {"text": text[:MAX_TEXT], "title": "", "truncated": len(text) > MAX_TEXT}


def _read_docx(path: str) -> dict:
    import re
    import zipfile
    from html import unescape

    with zipfile.ZipFile(path) as archive:
        if "word/document.xml" not in archive.namelist():
            raise ValueError("This is not a Word (.docx) document.")
        xml = archive.read("word/document.xml").decode("utf-8", errors="replace")
    xml = re.sub(r"</w:p>|<w:br[^>]*/>|</w:tr>", "\n", xml)
    xml = re.sub(r"</w:tc>|<w:tab/>", " | ", xml)
    text = unescape(re.sub(r"<[^>]+>", "", xml))
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(text) < 20:
        raise ValueError("This document has no readable text.")
    return {"text": text[:MAX_TEXT], "title": "", "truncated": len(text) > MAX_TEXT}


READERS = {"csv": _read_csv, "json": _read_json, "xlsx": _read_excel, "pdf": _read_pdf, "txt": _read_txt, "docx": _read_docx}

if __name__ == "__main__":
    kind, path = sys.argv[1], sys.argv[2]
    try:
        sys.stdout.write(json.dumps(READERS[kind](path), ensure_ascii=False))
    except ValueError as failure:  # our own readable messages
        sys.stdout.write(json.dumps({"error": str(failure) or "The file could not be read."}))
    except Exception:  # noqa: BLE001 - damaged or unusual files get one plain message
        sys.stdout.write(json.dumps({"error": f"This {kind.upper()} file could not be opened. It may be damaged or in an unsupported format."}))
