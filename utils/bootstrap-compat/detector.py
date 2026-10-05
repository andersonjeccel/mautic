"""Small stdlib WebDriver harness. No Bootstrap migration code."""
import hashlib
import json
import os
import subprocess
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
APP = os.environ.get('BOOTSTRAP_APP_URL', 'http://ddev-mautic-bootstrap-compat-7x-web')

# Deterministic substitutions for dynamic Twig values/includes; see provenance.json.
FIXTURES = {
    'webhook': '''<div class="panel shd-none bdr-rds-0 bdr-w-0 mt-sm mb-0"><div class="panel-heading"><div class="panel-title">{label}</div></div><div class="panel-body pt-xs"><div class="input-group"><input type="text" class="form-control" readonly value="{value}"><span class="input-group-btn"><button type="button" class="btn btn-ghost"><i class="ri-external-link-line"></i></button></span></div></div></div>''',
    'import': '''<div class="row"><div class="col-sm-offset-3 col-sm-6"><div class="ml-lg mr-lg mt-md pa-lg"><div class="panel panel-info"><div class="panel-heading"><div class="panel-title">{label}</div></div><div class="panel-body"><form><div class="input-group well mt-lg"><input type="file" class="form-control"><span class="input-group-btn"><button type="button" class="btn btn-primary">{label}</button></span></div></form></div></div></div></div></div>''',
    'timeline': '''<div class="mt-10"><p class="mt-0 mb-10 text-info"><span><i class="ri-time-line"></i><span>{label}</span></span><span class="form-buttons btn-group btn-group-xs mb-3" role="group" aria-label="Field options"><button type="button" class="btn btn-ghost btn-nospin" style="display:none"><i class="ri-save-line text-interactive"></i></button><button type="button" class="btn btn-ghost btn-nospin btn-reschedule" title="{label}"><i class="ri-time-line text-interactive"></i></button><button type="button" class="btn btn-ghost btn-nospin" title="{label}"><i class="ri-close-line text-danger"></i></button></span></p></div>''',
}

COLLECT = r'''
const [markup, cssURLs, mutation] = arguments, done = arguments[arguments.length-1];
(async () => {
 document.head.querySelectorAll('link,style').forEach(e=>e.remove());
 performance.clearResourceTimings();
 const options=typeof arguments[3]==='object' ? arguments[3] : {};
 document.body.innerHTML = '<main id="fixture" style="margin:16px">'+markup+'</main>';
 for (const url of cssURLs) {
   await new Promise((resolve,reject)=>{
    const link=document.createElement('link'); link.rel='stylesheet'; link.href=url;
    link.onload=resolve; link.onerror=()=>reject(Error('CSS failed: '+url));document.head.append(link);
   });
 }
 const style=document.createElement('style');
 style.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;}'+mutation;
 document.head.append(style);
 if(options.state==='disabled')document.querySelectorAll('#fixture button,#fixture input').forEach(e=>e.disabled=true);
 if(options.state==='focus')document.querySelector('#fixture button:not([style*="none"])')?.focus({preventScroll:true});
 await document.fonts.ready;
 const all=[...document.querySelectorAll('#fixture, #fixture *')];
 const fontRequests=[];
 for(const e of all) for(const pseudo of [null,'::before','::after']) {
   const s=getComputedStyle(e,pseudo);
   if(pseudo && ['none','normal','""'].includes(s.content)) continue;
   const family=s.fontFamily.split(',')[0].trim();
   const spec=`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${family}`;
   if(fontRequests.some(f=>f.spec===spec))continue;
   const loaded=await document.fonts.load(spec,'ABCxyz012');
   // Declared local webfonts must load, not silently fall back.
   const name=family.replace(/["']/g,'');
   const declared=[...document.fonts].some(f=>f.family.replace(/["']/g,'')===name);
   if(declared && (!loaded.length || loaded.some(f=>f.status!=='loaded')))throw Error('Used font failed: '+spec);
   if(!document.fonts.check(spec,'ABCxyz012'))throw Error('Font not ready: '+spec);
   fontRequests.push({spec,declared,loaded:loaded.map(f=>({family:f.family,status:f.status,weight:f.weight}))});
 }
 await document.fonts.ready;
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const properties=['font-weight','font-family','font-size','font-style','line-height','letter-spacing','text-align','text-transform','text-decoration-line','white-space','word-break','overflow-wrap','color','background-color','background-image','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','box-shadow','opacity','visibility','transform','overflow-x','overflow-y'];
 const visual=s=>Object.fromEntries(properties.map(p=>[p,s.getPropertyValue(p)]));
 const overflow=e=>({scrollWidth:e.scrollWidth,scrollHeight:e.scrollHeight,clientWidth:e.clientWidth,clientHeight:e.clientHeight,x:Math.max(0,e.scrollWidth-e.clientWidth),y:Math.max(0,e.scrollHeight-e.clientHeight)});
 const nodes=all.map((e,index)=>{const r=e.getBoundingClientRect();return {id:index,tag:e.tagName,classes:e.className,
    identity:{parent:all.indexOf(e.parentElement),text:[...e.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(''),attributes:Object.fromEntries([...e.attributes].filter(a=>a.name!=='style').map(a=>[a.name,a.value]))},
    geometry:{x:r.x,y:r.y,width:r.width,height:r.height},overflow:overflow(e),
    visual:visual(getComputedStyle(e)),
    pseudo:Object.fromEntries(['::before','::after'].map(p=>{const s=getComputedStyle(e,p);return [p,{content:s.content,visual:visual(s),display:s.display}];})),
    diagnostic:{display:getComputedStyle(e).display}};});
 const resources=performance.getEntriesByType('resource').map(e=>({name:e.name,initiatorType:e.initiatorType,transferSize:e.transferSize}));
 done({documentOverflow:overflow(document.documentElement),nodes,fonts:fontRequests,css:cssURLs,resources,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},userAgent:navigator.userAgent});
})().catch(error=>done({error:String(error),stack:error.stack}));
'''

class Browser:
    def __init__(self):
        import fcntl
        lock_directory = Path(os.environ.get('BOOTSTRAP_COMPAT_LOCK_DIR', tempfile.gettempdir()))
        lock_directory.mkdir(parents=True, exist_ok=True)
        self._lock_path = lock_directory / 'bootstrap-compat-selenium.lock'
        self._lock = self._lock_path.open('a')
        fcntl.flock(self._lock, fcntl.LOCK_EX)
        try:
            self._initialize()
        except BaseException:
            self._lock.close()
            raise

    def _initialize(self):
        self.url = os.environ.get('WEBDRIVER_URL')
        if not self.url:
            ips=subprocess.check_output(['docker','inspect','-f','{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}','ddev-mautic-bootstrap-compat-7x-selenium-chrome'],text=True).split()
            errors=[]
            for ip in ips:
                candidate=f'http://{ip}:4444'
                try:
                    with urllib.request.urlopen(candidate+'/status',timeout=5) as response:
                        if json.load(response)['value']['ready']:
                            self.url=candidate; break
                except Exception as error: errors.append(str(error))
            if not self.url: raise RuntimeError('No ready Selenium: '+repr(errors))
        session=self.call('POST','/session',{'capabilities':{'alwaysMatch':{
            'browserName':'chrome','goog:chromeOptions':{'args':['--headless=new','--no-sandbox','--disable-dev-shm-usage','--lang=en-US','--force-device-scale-factor=1']}}}})
        self.session=session['sessionId']
        manifest=json.loads((ROOT/'assets/build/manifest.json').read_text())
        self.css=[APP+manifest['css/app.scss'],APP+'/media/css/app.css']
        self.metadata={'webdriver':self.url,'capabilities':session['capabilities'],
                       'assets':[{'url':url,'sha256':hashlib.sha256((ROOT/url.removeprefix(APP).lstrip('/')).read_bytes()).hexdigest()} for url in self.css]}
        self.command('POST','/timeouts',{'script':60000,'pageLoad':60000,'implicit':0})

    def call(self, method, path, payload=None):
        request=urllib.request.Request(self.url+path,data=None if payload is None else json.dumps(payload).encode(),method=method,headers={'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(request,timeout=90) as response:
                result=json.load(response)['value']
        except urllib.error.HTTPError as error:
            body=error.read().decode(errors='replace')
            try:
                result=json.loads(body).get('value', body)
            except json.JSONDecodeError:
                result=body
            raise RuntimeError({'status': error.code, 'webdriver': result}) from error
        if isinstance(result,dict) and 'error' in result: raise RuntimeError(result)
        return result

    def command(self,method,path,payload=None):
        return self.call(method,'/session/'+self.session+path,payload)

    def select_css(self, urls):
        from urllib.parse import urlsplit
        if not urls or len(set(urls)) != len(urls):
            raise ValueError('CSS URLs must be nonempty and unique')
        assets=[]
        for url in urls:
            parsed=urlsplit(url)
            if not url.startswith(APP+'/') or parsed.query or parsed.fragment:
                raise ValueError('CSS must be a local same-origin file')
            path=(ROOT/parsed.path.lstrip('/')).resolve()
            if not path.is_relative_to(ROOT) or path.suffix != '.css':
                raise ValueError('Unsafe CSS path')
            assets.append({'url':url,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        self.css=list(urls)
        self.metadata['assets']=assets

    def snapshot(self,fixture,mutation='',width=768,text='short',context='original',container_width=None,state='normal'):
        if context not in ('original','nested') or state not in ('normal','focus','disabled'):
            raise ValueError('Unsupported gallery context/state')
        self.command('POST','/window/rect',{'width':width,'height':900})
        self.command('POST','/url',{'url':APP+'/utils/bootstrap-compat/host.html'})
        label='Open' if text=='short' else 'Open the configured webhook endpoint with a long translated action description'
        value='https://example.test/hook' if text=='short' else 'https://example.test/'+('long-webhook-path/'*12)
        markup=FIXTURES[fixture].format(label=label,value=value)
        if context=='nested':
            if not isinstance(container_width,int) or container_width < 1:
                raise ValueError('Nested gallery requires positive container_width')
            markup=f'<section style="width:{container_width}px"><div class="panel panel-info"><div class="panel-body"><div class="row"><div class="col-md-6">{markup}</div></div></div></div></section>'
        result=self.command('POST','/execute/async',{'script':COLLECT,'args':[markup,self.css,mutation,{'state':state}]})
        if 'error' in result: raise RuntimeError(result)
        if result['viewport']['width']!=width: raise AssertionError(result['viewport'])
        return result

    def attest(self, snapshot):
        import base64
        expected_css=[a['url'] for a in self.metadata['assets']]
        script=r'''
const [urls]=arguments,done=arguments[arguments.length-1];
(async()=>{
 const sheets=[...document.styleSheets];
 const links=sheets.filter(s=>s.href).map(s=>s.href);
 if(JSON.stringify(links)!==JSON.stringify(urls)||sheets.length!==urls.length+1)throw Error('Extra/missing stylesheet');
 for(const s of sheets)for(const rule of s.cssRules)if(rule.type===CSSRule.IMPORT_RULE)throw Error('Imported stylesheet not permitted');
 const resources=[...new Set([...urls,...performance.getEntriesByType('resource').filter(r=>r.initiatorType==='css').map(r=>r.name)])];
 const data=[];
 for(const url of resources){const response=await fetch(url,{cache:'reload'});if(!response.ok)throw Error('Resource failed: '+url);const bytes=new Uint8Array(await response.arrayBuffer());let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));data.push({url,base64:btoa(str)});}
 done({resources:data,links,styles:sheets.length});
})().catch(e=>done({failure:String(e)}));
'''
        data=self.command('POST','/execute/async',{'script':script,'args':[expected_css]})
        if 'failure' in data:
            raise ValueError(data['failure'])
        expected={a['url']:a['sha256'] for a in self.metadata['assets']}
        for entry in data['resources']:
            digest=hashlib.sha256(base64.b64decode(entry.pop('base64'))).hexdigest()
            url=entry['url']
            if url in expected:
                if digest != expected[url]: raise ValueError('Served CSS hash changed: '+url)
            else:
                manifest=json.loads((FROZEN/'manifest.json').read_text())
                if not url.startswith(APP+'/') or digest not in {e['sha256'] for e in manifest['outputs'] if e['path'].endswith(('.woff','.woff2','.ttf','.otf','.svg','.png'))}:
                    raise ValueError('Unverified font/image resource: '+url)
            entry['sha256']=digest
        if snapshot['css'] != expected_css:
            raise ValueError('Snapshot CSS selection changed')
        return data

    def screenshot(self, path):
        import base64
        Path(path).write_bytes(base64.b64decode(self.command('GET','/screenshot')))

    def close(self):
        if self._lock.closed:
            return
        try:
            self.command('DELETE','')
        finally:
            self._lock.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


FROZEN = HERE / 'frozen'
FROZEN_PINS = {
    'manifest.json': 'a75fec88dcb7017d1847f93df6288a3d4e8d1bea549949f9aa566d8b9af3a294',
    'observable-initial.json': 'ca2549bdd46bd4c83e56242949499bc9649dbcbf5629b0c1f3bc266547416965',
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def frozen_inputs():
    for name, digest in FROZEN_PINS.items():
        if sha256(FROZEN / name) != digest:
            raise ValueError('Immutable baseline hash changed: ' + name)
    manifest = json.loads((FROZEN / 'manifest.json').read_text())
    for entry in manifest['outputs']:
        if sha256(FROZEN / entry['path']) != entry['sha256']:
            raise ValueError('Frozen output hash changed: ' + entry['path'])
    initial = json.loads((FROZEN / 'observable-initial.json').read_text())
    if len(initial['controls']) != 18:
        raise ValueError('Original controls must remain 18')
    return {'manifest':manifest,'initial':initial,'pins':dict(FROZEN_PINS),
            'css':[APP+'/utils/bootstrap-compat/frozen'+manifest['main_css'],
                   APP+'/utils/bootstrap-compat/frozen/media/css/app.css']}


def verify_provenance(reference_browser, browser, snapshot, attestation, reference_snapshot=None):
    for key in ('browserName','browserVersion','platformName'):
        if reference_browser['capabilities'][key] != browser['capabilities'][key]:
            raise ValueError('Pinned browser mismatch: '+key)
    before=reference_browser['capabilities']['chrome']['chromedriverVersion']
    after=browser['capabilities']['chrome']['chromedriverVersion']
    if before != after:
        raise ValueError('Pinned chromedriverVersion mismatch')
    if snapshot['viewport']['dpr'] != 1:
        raise ValueError('Pinned DPR mismatch')
    if not snapshot['fonts'] or any(not f['declared'] or not f['loaded'] or any(v['status']!='loaded' for v in f['loaded']) for f in snapshot['fonts']):
        raise ValueError('Undeclared or unloaded font')
    if attestation['links'] != snapshot['css']:
        raise ValueError('Stylesheet provenance mismatch')
    if reference_snapshot:
        if reference_snapshot['viewport'] != snapshot['viewport'] or reference_snapshot['userAgent'] != snapshot['userAgent']:
            raise ValueError('Pinned viewport/userAgent mismatch')
        # Equivalent duplicate @font-face declarations are internal structure,
        # not a font change. Keep specs/descriptors exact; dedupe only identical
        # loaded descriptors while independently pinning actual resource bytes.
        def font_contract(fonts):
            return [{'spec':f['spec'],'declared':f['declared'],
                     'loaded':sorted({json.dumps(face,sort_keys=True) for face in f['loaded']})}
                    for f in fonts]
        if font_contract(reference_snapshot['fonts']) != font_contract(snapshot['fonts']):
            raise ValueError('Pinned used font inventory mismatch')
        old=sorted(r['sha256'] for r in reference_snapshot['attestation']['resources'] if r['url'] not in reference_snapshot['css'])
        new=sorted(r['sha256'] for r in attestation['resources'] if r['url'] not in snapshot['css'])
        if old != new:
            raise ValueError('Pinned used font/image bytes mismatch')


def matrix_cases():
    cases=[]
    def add(fixture,width,text,context='original',container_width=None,state='normal'):
        identifier=f'{fixture}-{width}-{text}-{context}-{container_width or 0}-{state}'
        cases.append(dict(id=identifier,fixture=fixture,width=width,text=text,context=context,container_width=container_width,state=state))
    for fixture in FIXTURES:
        for width in (375,768,1280):
            for text in ('short','long'):
                add(fixture,width,text)
        for boundary in (576,768,992,1200,1400):
            for width in (boundary-1,boundary,boundary+1):
                for text in ('short','long'):
                    for container in (280,640):
                        add(fixture,width,text,'nested',container)
        for width in (375,768,1280):
            for state in ('focus','disabled'):
                add(fixture,width,'long','nested',min(width-32,480),state)
    return cases


def pixel_compare(pairs):
    result=subprocess.run(['node',str(HERE/'cycle/pixels.mjs')],
                          input=json.dumps([[str(p) for p in pair] for pair in pairs]),
                          text=True,capture_output=True,check=True)
    return json.loads(result.stdout)


def summarize_results(records):
    accepted=sum(not record['differences'] for record in records)
    return {'comparisons':len(records),'accepted':accepted,'rejected':len(records)-accepted}


def compare(baseline,candidate):
    # This spike only supports a fixed DOM; never silently truncate via zip.
    if len(baseline['nodes']) != len(candidate['nodes']):
        raise ValueError('Unsupported DOM node count change: '
                         f"{len(baseline['nodes'])} -> {len(candidate['nodes'])}")
    differences=[]
    for prop,value in baseline['documentOverflow'].items():
        if value != candidate['documentOverflow'][prop]:
            differences.append({'node':'document','property':'overflow.'+prop,'baseline':value,'candidate':candidate['documentOverflow'][prop]})
    for before,after in zip(baseline['nodes'],candidate['nodes']):
        if any(before[key] != after[key] for key in ('id', 'tag', 'classes')) or ('identity' in before and before['identity'] != after.get('identity')):
            raise ValueError('Unsupported DOM node identity/correspondence change')
        for prop,value in before['overflow'].items():
            if value != after['overflow'][prop]:
                differences.append({'node':before['id'],'property':'overflow.'+prop,'baseline':value,'candidate':after['overflow'][prop]})
        for prop,value in before['geometry'].items():
            if abs(value-after['geometry'][prop]) > 0.5:
                differences.append({'node':before['id'],'property':'geometry.'+prop,'baseline':value,'candidate':after['geometry'][prop]})
        for pseudo,before_pseudo in before['pseudo'].items():
            after_pseudo=after['pseudo'][pseudo]
            if before_pseudo['content'] != after_pseudo['content']:
                differences.append({'node':before['id'],'property':'pseudo.'+pseudo+'.content','baseline':before_pseudo['content'],'candidate':after_pseudo['content']})
            if before_pseudo['content'] not in ('none','normal') or after_pseudo['content'] not in ('none','normal'):
                for prop,value in before_pseudo['visual'].items():
                    if value != after_pseudo['visual'][prop]:
                        differences.append({'node':before['id'],'property':'pseudo.'+pseudo+'.'+prop,'baseline':value,'candidate':after_pseudo['visual'][prop]})
        for prop,value in before['visual'].items():
            if value != after['visual'][prop]:
                differences.append({'node':before['id'],'property':prop,'baseline':value,'candidate':after['visual'][prop]})
    return differences


from cycle.runner import capture_reference, check_reference, load_reference, coverage_manifest

