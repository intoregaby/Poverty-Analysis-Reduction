"""Verifies ZIP *design-package* consistency, not the production AI engine.
Run: python 10_VERIFICATION_TESTS/verify_bundle_structure.py
Optional dependencies: jsonschema and PyYAML.
"""
from pathlib import Path
import json,csv,re,sys,subprocess
ROOT=Path(__file__).resolve().parents[1]
errors=[]
md=list(ROOT.rglob('*.md'))
mermaid=list(ROOT.rglob('*.mmd'))
schemas=list((ROOT/'09_MACHINE_CONTRACTS/schemas').glob('*.schema.json'))
assert len(mermaid)==14, f'Expected 14 diagrams, got {len(mermaid)}'
assert len(schemas)==9, f'Expected 9 contract schemas, got {len(schemas)}'
try:
 import jsonschema
except ImportError:
 print('SKIP: jsonschema dependency unavailable')
else:
 for f in schemas:
  try: jsonschema.Draft202012Validator.check_schema(json.loads(f.read_text(encoding='utf8')))
  except Exception as e: errors.append(f'{f}: {e}')
 mapping={'indicator_definition_example.json':'indicator-definition.schema.json',
 'calculated_fact_ILLUSTRATIVE_NOT_VERIFIED.json':'calculated-fact.schema.json',
 'typed_claim_example.json':'claim-proposal.schema.json'}
 for e,s in mapping.items():
  try: jsonschema.validate(json.loads((ROOT/'09_MACHINE_CONTRACTS/examples'/e).read_text()),json.loads((ROOT/'09_MACHINE_CONTRACTS/schemas'/s).read_text()))
  except Exception as exc: errors.append(f'Example {e}: {exc}')
try:
 import yaml
except ImportError: print('SKIP: PyYAML dependency unavailable')
else:
 for f in list(ROOT.rglob('*.yaml')):
  try: yaml.safe_load(f.read_text(encoding='utf8'))
  except Exception as e: errors.append(f'YAML {f}: {e}')
for f in mermaid:
 text=f.read_text(encoding='utf8')
 first=text.splitlines()[0].strip()
 if not first.startswith(('flowchart ','sequenceDiagram','stateDiagram-v2')):
  errors.append(f'Mermaid invalid header: {f}')
 if first.startswith('flowchart ') and text.count('subgraph ')!=sum(1 for line in text.splitlines() if line.strip()=='end'):
  errors.append(f'Mermaid unbalanced subgraphs: {f}')
 if text.count('[')!=text.count(']'):
  errors.append(f'Mermaid brackets unbalanced: {f}')
with (ROOT/'10_VERIFICATION_TESTS/ACCEPTANCE_MATRIX.csv').open(encoding='utf8',newline='') as fp:
 rows=list(csv.DictReader(fp))
 if len(rows)!=95: errors.append(f'Expected 95 tests, found {len(rows)}')
 if len({r['test_id'] for r in rows})!=len(rows): errors.append('Duplicate acceptance IDs')
 if any(r['status']!='NOT RUN' for r in rows): errors.append('Package claimed acceptance tests had run')
print('Markdown documents:',len(md),'Mermaid sources:',len(mermaid),'JSON Schemas:',len(schemas),'Acceptance planned cases:',len(rows))
if errors:
 for e in errors:print('FAIL:',e)
 sys.exit(1)
print('PASS: design bundle structure and schema fixtures. No production engine tests were performed.')
