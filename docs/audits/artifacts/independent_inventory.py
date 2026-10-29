"""Independent source scan: does not import the application catalog."""
import sys, tempfile, zipfile, subprocess, json, re, collections
from pathlib import Path
import pyreadstat
sys.path.insert(0,str(Path(__file__).parent))
from audit_common import ROOT, OUT, save, digest
files=sorted(p for p in (ROOT/'Data').rglob('*') if p.is_file())
entries=[]
seven=list(Path('D:/application').glob('*Zip*/7-Zip/7z.exe'))
def inspect(path, key):
    ext=path.suffix.lower()
    if ext not in ['.sav','.dta']:
        return {'file':key,'status':'Unsupported','columns':[]}
    read=pyreadstat.read_sav if ext=='.sav' else pyreadstat.read_dta
    try:
        try: _,m=read(str(path),metadataonly=True)
        except UnicodeDecodeError: _,m=read(str(path),metadataonly=True,encoding='latin1')
        return {'file':key,'status':'Readable metadata','rows':m.number_rows,'columns':[{'name':n,'label':l,'type':m.readstat_variable_types.get(n),'value_labels':m.variable_value_labels.get(n,{})} for n,l in zip(m.column_names,m.column_labels)],'missing_definitions':m.missing_ranges}
    except Exception as e: return {'file':key,'status':'Failed','error':f'{type(e).__name__}: {e}','columns':[]}
for p in files:
    rel=p.relative_to(ROOT/'Data').as_posix()
    if p.suffix.lower()=='.zip':
        with zipfile.ZipFile(p) as z:
            for member in z.infolist():
                if member.is_dir(): continue
                key=rel+'!/'+member.filename
                if member.filename.startswith('__MACOSX/') or Path(member.filename).name.startswith('._'):
                    entries.append({'file':key,'status':'Metadata entry','columns':[]}); continue
                with tempfile.TemporaryDirectory(prefix='nisr-independent-') as temp:
                    q=Path(temp)/('table'+Path(member.filename).suffix)
                    try:
                        try: q.write_bytes(z.read(member))
                        except NotImplementedError:
                            if not seven: raise RuntimeError('7-Zip absent')
                            with q.open('wb') as f: subprocess.run([str(seven[0]),'e','-so',str(p),member.filename],stdout=f,stderr=subprocess.PIPE,check=True)
                        entries.append(inspect(q,key))
                    except Exception as e: entries.append({'file':key,'status':'Failed','error':str(e),'columns':[]})
    else: entries.append(inspect(p,rel))
    print('SCANNED',p.name, len(entries),flush=True)
result={'method':'Independent pyreadstat metadata-only reads; no application catalog imported. Full missing-value scan separately sampled, not independently repeated for every record.', 'file_count':len(files),'entry_count':len(entries),'variable_count':sum(len(e['columns']) for e in entries),'statuses':dict(collections.Counter(e['status'] for e in entries)),'files':[{'file':str(p.relative_to(ROOT/'Data')),'bytes':p.stat().st_size,'sha256':digest(p)} for p in files],'entries':entries}
save('independent-inventory.json',result)
print(json.dumps({k:v for k,v in result.items() if k not in ['files','entries']}),flush=True)
