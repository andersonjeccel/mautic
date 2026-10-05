"""Verify full-suite observations and produce machine-readable actual totals."""
import ast, hashlib, json
from pathlib import Path
HERE=Path(__file__).resolve().parent
expected={n.name for n in ast.walk(ast.parse((HERE/'test_adapter.py').read_text())) if isinstance(n,ast.FunctionDef) and n.name.startswith('test_')}
observed=json.loads((HERE/'logs/observations.json').read_text())
records=observed['records'];actual={r['test'] for r in records}
assert expected==actual,{'missing':sorted(expected-actual),'unexpected':sorted(actual-expected)}
assert all(r['result']=='ok' or r['result']=={'hidden':True,'restored':True,'trusted':True} for r in records), 'Failing browser observation'
errors=[e for r in records for e in r.get('browserLogs',[]) if e['level']=='SEVERE']
assert not errors,errors
summary={'tests':len(expected),'browserObservations':len(records),'baselineObservations':sum(r['meta']['baseline'] for r in records),'candidateObservations':sum(not r['meta']['baseline'] for r in records),'browserVersion':observed['capabilities']['browserVersion'],'baselineVersions':sorted({r['meta']['version'] for r in records if r['meta']['baseline']}),'candidateVersions':sorted({r['meta']['version'] for r in records if not r['meta']['baseline']}),'severeBrowserMessages':len(errors),'testNames':sorted(actual),'localArtifactHashes':{p:hashlib.sha256((HERE/p).read_bytes()).hexdigest() for p in ['adapter.js','fixture.html','early.html','test_adapter.py','inventory.py','report.py','run.sh']}}
(HERE/'logs/summary.json').write_text(json.dumps(summary,indent=2)+'\n')
(HERE/'TESTS.md').write_text('# Exact automated contracts\n\nGenerated from test_adapter.py and verified full-suite observations.\n\n'+ '\n'.join('- `'+t+'` ('+ ('baseline + candidate' if any(r['test']==t and r['meta']['baseline'] for r in records) else 'candidate only')+')' for t in sorted(actual))+'\n')
print(json.dumps(summary,indent=2))
