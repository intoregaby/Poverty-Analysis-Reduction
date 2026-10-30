"""Run the raw-archive R reference; a returned calculation is not scientific approval."""
from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import re
import subprocess
import tempfile

SCRIPT = Path(__file__).resolve().parents[1] / 'reference' / 'eicv7_survey.R'


class ReferenceUnavailable(RuntimeError):
    pass


def rscript_path():
    configured = os.environ.get('IREME_RSCRIPT')
    if configured:
        return shutil.which(configured) or (configured if Path(configured).is_file() else None)
    executable = shutil.which('Rscript')
    if executable:
        return executable
    # R's Windows installer does not add Rscript to PATH by default.
    candidates = []
    for base in (os.environ.get('LOCALAPPDATA'), os.environ.get('ProgramFiles')):
        if base:
            root = Path(base) / ('Programs/R' if base == os.environ.get('LOCALAPPDATA') else 'R')
            candidates.extend(root.glob('R-*/bin/Rscript.exe'))
    if candidates:
        return str(max(candidates, key=lambda p: tuple(int(n) for n in re.findall(r'\d+', p.parent.parent.name))))
    return None


def runtime_fingerprint(timeout=30):
    executable = rscript_path()
    if not executable:
        raise ReferenceUnavailable('Rscript unavailable')
    expression = ('p <- c("survey","haven","digest","jsonlite"); '
        'jsonlite::write_json(list(r_version=R.version.string, packages=setNames('
        'lapply(p,function(x) as.character(utils::packageVersion(x))),p)), stdout(), auto_unbox=TRUE)')
    proc = subprocess.run([executable, '--vanilla', '-e', expression], capture_output=True,
                          encoding='utf-8', errors='replace', timeout=timeout)
    if proc.returncode:
        raise ReferenceUnavailable('R reference environment unavailable: ' + proc.stderr[-500:])
    result = json.loads(proc.stdout)
    result['rscript_sha256'] = hashlib.sha256(Path(executable).read_bytes()).hexdigest()
    return result


def calculate(archive: Path, timeout: int = 300) -> dict:
    executable = rscript_path()
    if not executable:
        raise ReferenceUnavailable('Rscript unavailable; configure IREME_RSCRIPT or install R and required packages')
    archive = Path(archive).resolve(strict=True)
    before = hashlib.sha256(archive.read_bytes()).hexdigest()
    code_before = SCRIPT.read_bytes()
    with tempfile.TemporaryDirectory(prefix='ireme-reference-') as work:
        output = Path(work) / 'reference.json'
        proc = subprocess.run([executable, '--vanilla', str(SCRIPT), str(archive), str(output)],
                              capture_output=True, encoding='utf-8', errors='replace', timeout=timeout)
        if proc.returncode:
            raise ReferenceUnavailable(f'R reference exit {proc.returncode}: {proc.stderr[-1000:]}')
        result = json.loads(output.read_text(encoding='utf-8'))
    if result.get('schema') != 'ireme-r-reference/1' or result.get('dataset_sha256') != before:
        raise ValueError('R reference provenance differs from supplied raw archive')
    if hashlib.sha256(archive.read_bytes()).hexdigest() != before:
        raise ValueError('Raw archive changed during R computation')
    if SCRIPT.read_bytes() != code_before:
        raise ValueError('R reference implementation changed during computation')
    rows = result.get('estimates', [])
    if len(rows) != 31 or len({r['geography'] for r in rows}) != 31 or not any(r['geography'] == 'Rwanda' for r in rows):
        raise ValueError('Reference must calculate national and all 30 district estimates')
    for row in rows:
        if any(not isinstance(row.get(k), (int, float)) or not math.isfinite(row[k]) for k in ('point', 'se', 'ci_lower', 'ci_upper', 'df')):
            raise ValueError('Reference has nonfinite or missing statistical quantities')
        if not 0 <= row['point'] <= 1 or row['se'] < 0 or row['df'] <= 0:
            raise ValueError('Invalid reference estimate, SE or design degrees of freedom')
    contrast_rows = result.get('contrasts', [])
    expected_districts = {r['geography'] for r in rows} - {'Rwanda'}
    if len(contrast_rows) != 30 or {r['geography'] for r in contrast_rows} != expected_districts:
        raise ValueError('Reference must include all 30 joint district-national contrasts')
    for row in contrast_rows:
        if row.get('comparator') != 'Rwanda' or row.get('unit') != 'fraction':
            raise ValueError('Unexpected contrast comparator or unit')
        if any(not isinstance(row.get(k), (int, float)) or not math.isfinite(row[k]) for k in ('point', 'se', 'df', 'ci_lower', 'ci_upper')):
            raise ValueError('Nonfinite reference contrast')
        if row['se'] < 0 or row['df'] <= 0 or not row['ci_lower'] <= row['point'] <= row['ci_upper']:
            raise ValueError('Invalid joint contrast uncertainty')
    result['reference_code_sha256'] = hashlib.sha256(code_before).hexdigest()
    result['reference_code_utf8'] = code_before.decode('utf-8')
    result['certification'] = 'PENDING_INDEPENDENT_OWNERSHIP_AND_SCIENTIFIC_REVIEW'
    return result
