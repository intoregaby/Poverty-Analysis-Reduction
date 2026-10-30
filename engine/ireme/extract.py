"""Structured extraction of official tables (EP-06) with table-cell provenance.

PDF: text per page via pypdf, caption-anchored table location, row parsing into labelled
numeric columns, then *intrinsic table verification*: each row's published CI and CV must be
arithmetically consistent with its estimate and standard error. Rows failing this are marked
`needs_review` and can never become `table_verified` official facts.
XLSX: cell values are read as data (formulas are never evaluated); text starting with a formula
trigger is neutralised before it can reach any export (PRIV-10).
Archives: members are validated before extraction (PRIV-11).
"""
from __future__ import annotations

import hashlib
import io
import re
import zipfile
from pathlib import Path, PurePosixPath

NUM = r"-?\d+(?:\.\d+)?"
ROW = re.compile(rf"^\s*([A-Za-z][A-Za-z .'\-/()]*?)\s{{2,}}((?:{NUM}\s+)*{NUM})\s*$")


class ArchiveRejected(ValueError):
    pass


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def pdf_pages(pdf_bytes: bytes) -> list[str]:
    from pypdf import PdfReader
    r = PdfReader(io.BytesIO(pdf_bytes))
    return [(p.extract_text(extraction_mode="layout") or "") for p in r.pages]


def find_table_pages(pages: list[str], caption: str) -> list[int]:
    """1-based pages whose text contains the caption followed by table content (skips the contents list)."""
    hits = []
    for i, t in enumerate(pages, start=1):
        for m in re.finditer(re.escape(caption), t):
            tail = t[m.end(): m.end() + 200]
            if "...." in tail.split("\n")[0]:
                continue                                  # table-of-contents entry
            hits.append(i)
            break
    return hits


def parse_rows(page_text: str, caption: str, columns: list[str]) -> list[dict]:
    start = page_text.find(caption)
    body = page_text[start:] if start >= 0 else page_text
    out = []
    for n, line in enumerate(body.splitlines()):
        m = ROW.match(line)
        if not m:
            continue
        nums = [float(x) for x in m.group(2).split()]
        if len(nums) != len(columns):
            continue
        out.append({"label": re.sub(r"\s+", " ", m.group(1)).strip(), "values": dict(zip(columns, nums)), "line": n})
    return out


def verify_poverty_row(values: dict, z: float = 1.96) -> list[str]:
    """Intrinsic checks for a (estimate, se, ci_low, ci_high, cv) row; returns problems (empty = consistent)."""
    est, se, lo, hi, cv = (values[k] for k in ("estimate", "se", "ci_low", "ci_high", "cv"))
    problems = []
    if not (lo <= est <= hi):
        problems.append("estimate outside its CI")
    if abs((est - lo) - z * se) > 0.15 or abs((hi - est) - z * se) > 0.15:
        problems.append("CI half-width inconsistent with 1.96 x SE")
    if est and abs(100 * se / est - cv) > 0.1:
        problems.append("CV inconsistent with SE/estimate")
    return problems


POVERTY_COLUMNS = ["estimate", "se", "ci_low", "ci_high", "cv", "deff"]


def extract_poverty_table(pdf_bytes: bytes, source_id: str, caption: str, publication_date: str,
                          retrieved_at: str | None = None) -> dict:
    pages = pdf_pages(pdf_bytes)
    where = find_table_pages(pages, caption)
    doc_hash = sha256_bytes(pdf_bytes)
    facts, review = [], []
    for pg in where:
        for row in parse_rows(pages[pg - 1], caption, POVERTY_COLUMNS):
            v = row["values"]
            problems = verify_poverty_row(v)
            loc = f"{source_id} pdf-page {pg} {caption.split(':')[0]} row '{row['label']}'"
            rec = {"official_fact_id": f"{source_id}:{caption.split(':')[0].replace(' ', '')}:{row['label'].replace(' ', '_')}",
                   "source_document_id": source_id, "source_sha256": doc_hash, "publisher": "NISR",
                   "publication_date": publication_date, "table_location": loc,
                   "indicator_id": "poverty_headcount_official", "concept": "headcount poverty rate (%), total poverty line",
                   "geography_id": row["label"], "period": "2023/24", "population": "person", "unit": "percent",
                   "point_estimate": v["estimate"], "standard_error": v["se"], "ci_lower": v["ci_low"],
                   "ci_upper": v["ci_high"], "origin_type": "independent_official_document",
                   "origin_artifact_hash": sha256_bytes(f"{doc_hash}|{pg}|{row['label']}".encode()),
                   "extraction_status": "table_verified" if not problems else "needs_review"}
            if retrieved_at:
                rec["retrieved_at"] = retrieved_at
            (facts if not problems else review).append(rec)
            if problems:
                rec["_problems"] = problems
    return {"pages": where, "facts": facts, "needs_review": review, "document_sha256": doc_hash}


# ---- XLSX ---------------------------------------------------------------------------------------------
FORMULA_TRIGGERS = ("=", "+", "-", "@", "\t", "\r")


def neutralise_cell(value):
    """Return a string safe to place in a spreadsheet/CSV cell (CWE-1236)."""
    if isinstance(value, str) and value.startswith(FORMULA_TRIGGERS) and not re.fullmatch(NUM, value.strip()):
        return "'" + value
    return value


def read_xlsx_tables(xlsx_bytes: bytes, max_cells: int = 2_000_000) -> dict:
    """Read every sheet as raw data; formulas are returned as inert text, never evaluated."""
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), data_only=False, read_only=True)
    sheets, formulas = {}, []
    cells = 0
    for ws in wb.worksheets:
        rows = []
        for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
            out = []
            for c_idx, v in enumerate(row, start=1):
                cells += 1
                if cells > max_cells:
                    raise ValueError("workbook too large")
                if isinstance(v, str) and v.startswith("="):
                    formulas.append({"sheet": ws.title, "row": r_idx, "col": c_idx, "text": v})
                v = neutralise_cell(v)
                out.append(v)
            rows.append(out)
        sheets[ws.title] = rows
    return {"sheets": sheets, "formulas_found": formulas, "sha256": sha256_bytes(xlsx_bytes)}


def locate_xlsx_cell(sheets: dict, sheet: str, row_label: str, col_label: str, header_row: int = 1):
    """Find a value by row label (first column) and column header; returns (value, 'Sheet!A1-style ref')."""
    rows = sheets[sheet]
    header = rows[header_row - 1]
    if col_label not in header:
        raise KeyError(f"column '{col_label}' not in header")
    c = header.index(col_label)
    for i, row in enumerate(rows, start=1):
        if row and isinstance(row[0], str) and row[0].strip().lower() == row_label.strip().lower():
            return row[c], f"{sheet}!{_col(c + 1)}{i}"
    raise KeyError(f"row '{row_label}' not found")


def _col(n: int) -> str:
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


# ---- archives ---------------------------------------------------------------------------------------------
def safe_extract_zip(zip_bytes: bytes, dest: Path, max_total: int = 4 * 1024**3, max_ratio: int = 200) -> list[str]:
    dest = Path(dest).resolve()
    dest.mkdir(parents=True, exist_ok=True)
    names = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        total = 0
        for info in z.infolist():
            p = PurePosixPath(info.filename.replace("\\", "/"))
            if p.is_absolute() or ".." in p.parts or (p.parts and ":" in p.parts[0]):
                raise ArchiveRejected(f"unsafe member path {info.filename!r}")
            if (info.external_attr >> 16) & 0o170000 == 0o120000:
                raise ArchiveRejected(f"symlink member {info.filename!r}")
            total += info.file_size
            if total > max_total:
                raise ArchiveRejected("archive expands beyond limit")
            if info.compress_size and info.file_size / info.compress_size > max_ratio and info.file_size > 10_000_000:
                raise ArchiveRejected("suspicious compression ratio")
            target = (dest / p).resolve()
            if dest not in target.parents and target != dest:
                raise ArchiveRejected(f"member escapes destination {info.filename!r}")
        for info in z.infolist():
            z.extract(info, dest)
            names.append(info.filename)
    return names
