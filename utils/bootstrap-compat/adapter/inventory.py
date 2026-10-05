"""Read-only source triage and local runtime provenance; outputs stay here.
Regex records are consumer discovery aids, NOT an exhaustive AST/runtime audit.
"""
import hashlib, json, re
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
records=[]
for base in ['app/bundles','plugins']:
 for p in sorted((ROOT/base).rglob('*.js')):
  text=p.read_text(errors='replace');lines=text.splitlines()
  for i,line in enumerate(lines):
   if re.search(r'\.(?:modal|tooltip)\s*\(|bs\.(?:modal|tooltip)|\.modal\.in',line):
    kind='tooltip' if 'tooltip' in line else 'modal'
    tests=['test_tooltip_lifecycle_destroy_and_reinit','test_tooltip_consumer_title_refresh_and_legacy_options','test_dynamic_tooltip_focus_hover_delay_title_callback'] if kind=='tooltip' else ['test_modal_init_lifecycle_chainability','test_modal_cancellation_bridge','test_modal_dynamic_legacy_data_api_focus_restore']
    limitations=[]
    if 'options' in line:tests=['test_modal_mutable_options_and_keyboard_focus'];limitations.append('Mutable keyboard/backdrop applied before next opening only; live mutation while open not preserved.')
    if '.modal.in' in line:limitations.append('Legacy in class observed after complete operations; arbitrary reentrant event-time selection not proven.')
    records.append({'path':str(p.relative_to(ROOT)),'line':i+1,'context':lines[max(0,i-1):min(len(lines),i+5)],'kind':kind,'coverage':'representative contract only, not full route execution','tests':tests,'limitations':limitations})
assets=['node_modules/jquery/dist/jquery.js','utils/bootstrap-compat/adapter/baseline/bootstrap-sass/bootstrap.js','utils/bootstrap-compat/toolchain/node_modules/bootstrap/dist/js/bootstrap.bundle.js','utils/bootstrap-compat/toolchain/node_modules/bootstrap/dist/css/bootstrap.css','utils/bootstrap-compat/toolchain/node_modules/bootstrap/js/src/modal.js','utils/bootstrap-compat/toolchain/node_modules/bootstrap/js/src/tooltip.js','utils/bootstrap-compat/toolchain/node_modules/bootstrap/js/src/dom/event-handler.js','utils/bootstrap-compat/toolchain/node_modules/bootstrap/js/src/util/index.js']
manifest=json.loads((ROOT/'assets/build/manifest.json').read_text());assets.append(manifest['css/app.scss'].lstrip('/'))
provenance=[{'path':p,'sha256':hashlib.sha256((ROOT/p).read_bytes()).hexdigest()} for p in assets]
(HERE/'source-inventory.json').write_text(json.dumps({'method':'regex line triage plus manual consumer inspection; not an exhaustive AST or real-route census','records':records,'recordCount':len(records),'fileCount':len({r['path'] for r in records})},indent=2)+'\n')
(HERE/'provenance.json').write_text(json.dumps({'gitHead':None,'runtime':provenance,'officialSourceChecks':{'event-handler.js':'trigger performs exactly one jQuery namespaced trigger then one native namespaced event; propagates preventDefault. Adapter does not redispatch events.','util/index.js':'getjQuery requires window.jQuery and no body[data-bs-no-jquery]; defineJQueryPlugin runs on DOMContentLoaded.','modal.js':'show/hide/toggle and focus trap delegate to BS5; mutable legacy config uses pinned private _config and _backdrop._config.isVisible before next opening.','tooltip.js':'get title callback runs with element this; dispose destroys Popper and overlay.'}},indent=2)+'\n')
print(json.dumps({'records':len(records),'files':len({r['path'] for r in records}),'assets':len(provenance)}))
