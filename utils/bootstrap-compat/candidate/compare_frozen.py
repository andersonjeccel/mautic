"""Compare all original frozen controls. Never refresh baseline."""
import collections
import hashlib
import json
import pathlib
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from detector import APP, Browser, compare, summarize_results
HERE = pathlib.Path(__file__).resolve().parent
BASELINE = pathlib.Path('/home/anderson/.hermes/workspaces/mautic/bootstrap-compat-artifacts/baseline/observable-initial.json')

if __name__ == '__main__':
    output = sys.argv[1] if len(sys.argv)>1 else 'final.json'
    frozen = json.loads(BASELINE.read_text())
    browser = Browser()
    browser.css = [APP+'/utils/bootstrap-compat/candidate/app.css']
    browser.metadata['baseline_initialization_assets'] = browser.metadata['assets']
    browser.metadata['assets'] = [{'url':browser.css[0], 'sha256':hashlib.sha256((HERE/'app.css').read_bytes()).hexdigest()}]
    records=[]
    try:
        for control in frozen['controls']:
            candidate=browser.snapshot(control['fixture'], width=control['width'], text=control['text'])
            differences=compare(control['snapshot'],candidate)
            records.append({'fixture':control['fixture'],'width':control['width'],'text':control['text'],'differences':differences,'snapshot':candidate})
    finally:
        browser.close()
    result={'baseline':str(BASELINE),'baseline_sha256':hashlib.sha256(BASELINE.read_bytes()).hexdigest(),'candidate_sha256':hashlib.sha256((HERE/'app.css').read_bytes()).hexdigest(),'browser':browser.metadata,'summary':summarize_results(records),'records':records}
    (HERE/output).write_text(json.dumps(result,indent=2))
    print(json.dumps(result['summary']))
    print(collections.Counter(d['property'] for r in records for d in r['differences']))
    if result['summary']['rejected']:
        sys.exit(1)
