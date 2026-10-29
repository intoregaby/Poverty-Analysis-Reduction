"""Audit-only helpers. Never writes application files or existing investigations."""
import hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
def save(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False, default=str), encoding='utf-8')
def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1048576), b''): h.update(block)
    return h.hexdigest()
def baseline():
    files=[]
    for directory in ['src','tools','Data','investigations']:
        for p in (ROOT/directory).rglob('*'):
            if p.is_file() and '__pycache__' not in p.parts: files.append(p)
    files += [p for p in ROOT.iterdir() if p.is_file()]
    return {str(p.relative_to(ROOT)):digest(p) for p in sorted(set(files))}
if __name__=='__main__':
    import sys
    current=baseline()
    if '--after' in sys.argv:
        original=json.loads((OUT/'baseline.json').read_text())
        save('preservation.json', {'changed':[k for k,v in original.items() if current.get(k)!=v], 'added':[k for k in current if k not in original], 'files_checked':len(original)})
    else: save('baseline.json',current)
