"""Bootstrap 3 input routing contracts in real Chromium."""
import fcntl
import json
import os
import subprocess
import tempfile
import unittest
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = os.environ.get('BOOTSTRAP_APP_URL', 'http://ddev-mautic-bootstrap-compat-7x-web')


class Contracts(unittest.TestCase):
    records = []

    @classmethod
    def setUpClass(cls):
        lock_directory = Path(os.environ.get('BOOTSTRAP_COMPAT_LOCK_DIR', tempfile.gettempdir()))
        lock_directory.mkdir(parents=True, exist_ok=True)
        cls.lock = (lock_directory / 'bootstrap-compat-selenium.lock').open('a')
        fcntl.flock(cls.lock, fcntl.LOCK_EX)
        cls.url = os.environ.get('WEBDRIVER_URL')
        if not cls.url:
            addresses = subprocess.check_output(
                [
                    'docker', 'inspect', '-f',
                    '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}',
                    'ddev-mautic-bootstrap-compat-7x-selenium-chrome',
                ],
                text=True,
            ).split()
            for address in addresses:
                try:
                    with urllib.request.urlopen(f'http://{address}:4444/status', timeout=3) as response:
                        if json.load(response)['value']['ready']:
                            cls.url = f'http://{address}:4444'
                            break
                except Exception:
                    pass
        session = cls.call(
            'POST',
            '/session',
            {
                'capabilities': {
                    'alwaysMatch': {
                        'browserName': 'chrome',
                        'goog:loggingPrefs': {'browser': 'ALL'},
                        'goog:chromeOptions': {
                            'args': ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
                        },
                    },
                },
            },
        )
        cls.capabilities = session['capabilities']
        cls.session_id = session['sessionId']
        cls.command('POST', '/timeouts', {'script': 30000, 'pageLoad': 30000, 'implicit': 0})

    @classmethod
    def call(cls, method, path, payload=None):
        request = urllib.request.Request(
            cls.url + path,
            data=None if payload is None else json.dumps(payload).encode(),
            method=method,
            headers={'Content-Type': 'application/json'},
        )
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.load(response)['value']

    @classmethod
    def command(cls, method, path, payload=None):
        return cls.call(method, f'/session/{cls.session_id}{path}', payload)

    @classmethod
    def tearDownClass(cls):
        (HERE / 'logs' / 'observations.json').write_text(
            json.dumps({'capabilities': cls.capabilities, 'records': cls.records}, indent=2) + '\n'
        )
        cls.command('DELETE', '')
        cls.lock.close()

    def page(self):
        self.command('POST', '/url', {'url': f'{APP}/utils/bootstrap-compat/adapter/fixture.html'})
        result = self.command(
            'POST',
            '/execute/async',
            {
                'script': (
                    'const done=arguments[arguments.length-1];'
                    'fixtureReady.then(done).catch(error=>done({error:String(error)}));'
                ),
                'args': [],
            },
        )
        self.assertNotIn('error', result)
        return result

    def check(self, body):
        metadata = self.page()
        result = self.command(
            'POST',
            '/execute/async',
            {
                'script': (
                    'const done=arguments[arguments.length-1];'
                    '(async()=>{const $=mQuery,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));'
                    'const assert=(condition,message)=>{if(!condition)throw Error(message)};'
                    "const m=$('#modal'),t=$('#tip');"
                    + body
                    + ";return 'ok'})().then(done).catch(error=>done({error:String(error),stack:error.stack}));"
                ),
                'args': [],
            },
        )
        browser_logs = self.command('POST', '/se/log', {'type': 'browser'})
        self.records.append(
            {'test': self._testMethodName, 'meta': metadata, 'result': result, 'browserLogs': browser_logs}
        )
        self.assertEqual('ok', result, f'{metadata} {result}')
        self.assertFalse(
            [entry for entry in browser_logs if entry['level'] == 'SEVERE' and 'favicon.ico' not in entry['message']],
            browser_logs,
        )

    def test_legacy_data_attributes_are_mirrored_to_bootstrap_5(self):
        self.check('''const pairs=[['#opener','toggle'],['#opener','target'],['#dismiss','dismiss'],['#tip','toggle'],['#pop','content'],['#collapse-trigger','toggle'],['#collapse-trigger','target'],['#accordion-trigger','parent']];for(const [selector,name] of pairs){const element=document.querySelector(selector);assert(element.getAttribute('data-bs-'+name)===element.getAttribute('data-'+name),selector+' '+name)}''')

    def test_dynamic_markup_and_attribute_changes_are_routed(self):
        self.check('''const dynamic=document.createElement('button');dynamic.setAttribute('data-toggle','modal');dynamic.setAttribute('data-target','#modal');document.body.append(dynamic);await sleep(0);assert(dynamic.getAttribute('data-bs-toggle')==='modal','dynamic toggle');assert(dynamic.getAttribute('data-bs-target')==='#modal','dynamic target');dynamic.removeAttribute('data-bs-target');dynamic.setAttribute('data-target','#modal');await sleep(0);assert(dynamic.getAttribute('data-bs-target')==='#modal','attribute update');''')

    def test_owned_attribute_updates_and_removals_propagate(self):
        self.check('''const element=document.querySelector('#opener');element.setAttribute('data-target','#another');await sleep(0);assert(element.getAttribute('data-bs-target')==='#another','changed legacy value');element.removeAttribute('data-target');await sleep(0);assert(!element.hasAttribute('data-bs-target'),'removed legacy value');''')

    def test_explicit_bootstrap_5_attributes_are_not_overwritten(self):
        self.check('''const element=document.querySelector('#opener');element.setAttribute('data-bs-target','#modern');element.setAttribute('data-target','#another');await sleep(0);assert(element.getAttribute('data-bs-target')==='#modern','modern override');element.removeAttribute('data-target');await sleep(0);assert(element.getAttribute('data-bs-target')==='#modern','modern attribute retained');''')

    def test_jquery_plugins_route_to_bootstrap_5_constructors(self):
        self.check('''const map={alert:'Alert',button:'Button',carousel:'Carousel',collapse:'Collapse',dropdown:'Dropdown',modal:'Modal',offcanvas:'Offcanvas',popover:'Popover',scrollspy:'ScrollSpy',tab:'Tab',toast:'Toast',tooltip:'Tooltip'};for(const [plugin,constructor] of Object.entries(map)){assert(typeof $.fn[plugin]==='function',plugin+' router');assert($.fn[plugin].Constructor===bootstrap[constructor],plugin+' constructor');assert($.fn[plugin].mauticBootstrapCompatibility===true,plugin+' marker')}''')

    def test_modal_options_and_methods_are_routed_without_legacy_class_logic(self):
        self.check('''m.modal({show:false,keyboard:false,backdrop:'static'});let native=bootstrap.Modal.getInstance(m[0]);assert(native&&native._config.keyboard===false&&native._config.backdrop==='static','native modal config');assert(m.data('bs.modal').native===native,'legacy instance facade');m.modal('show');await sleep(100);assert(native._isShown,'native show');m.modal('hide');await sleep(100);assert(!native._isShown,'native hide');m.modal('destroy');assert(!bootstrap.Modal.getInstance(m[0]),'destroy routed to dispose');''')

    def test_modal_default_show_is_routed_to_bootstrap_5(self):
        self.check('''m.modal();await sleep(100);const native=bootstrap.Modal.getInstance(m[0]);assert(native&&native._isShown,'default show');m.modal('hide');''')

    def test_tooltip_options_and_destroy_are_routed(self):
        self.check('''t.tooltip({trigger:'manual',animation:false,viewport:'window'});const native=bootstrap.Tooltip.getInstance(t[0]);assert(native,'native tooltip');assert(native._config.boundary==='window','viewport mapped to boundary');assert(t.data('bs.tooltip').native===native,'legacy instance facade');t.tooltip('show');await sleep(50);t.tooltip('hide');await sleep(50);t.tooltip('destroy');assert(!bootstrap.Tooltip.getInstance(t[0]),'destroy routed to dispose');''')

    def test_fix_title_is_routed_through_bootstrap_5_data(self):
        self.check('''t.tooltip({trigger:'manual',animation:false});assert(bootstrap.Tooltip.getInstance(t[0]),'initialized');t.attr('data-original-title','Updated').tooltip('fixTitle');assert(t.attr('data-bs-title')==='Updated','title routed');assert(!bootstrap.Tooltip.getInstance(t[0]),'stale instance disposed');t.tooltip({trigger:'manual',animation:false}).tooltip('show');await sleep(50);assert(document.querySelector('.tooltip-inner').textContent==='Updated','updated title consumed by Bootstrap 5');t.tooltip('destroy');''')

    def test_popover_content_is_consumed_by_bootstrap_5(self):
        self.check('''const p=$('#pop');p.popover({trigger:'manual',animation:false,html:true,sanitize:false}).popover('show');await sleep(50);const native=bootstrap.Popover.getInstance(p[0]);assert(native,'native popover');assert(document.querySelector('.popover-body select option').textContent==='One','native content');assert(p.data('bs.popover').native===native,'legacy facade');p.popover('destroy');''')

    def test_collapse_dropdown_tab_and_button_use_native_instances(self):
        self.check('''const panel=$('#legacy-collapse');panel.collapse({toggle:false});assert(bootstrap.Collapse.getInstance(panel[0]),'collapse');$('#dropdown-toggle').dropdown();assert(bootstrap.Dropdown.getInstance($('#dropdown-toggle')[0]),'dropdown');$('#tab-two').tab('show');assert(bootstrap.Tab.getInstance($('#tab-two')[0]),'tab');$('#check-button').button('toggle');assert(bootstrap.Button.getInstance($('#check-button')[0]),'button');''')

    def test_router_source_loaded_in_production_without_bootstrap_3_runtime(self):
        self.check('''const scripts=[...document.scripts].filter(script=>script.src).map(script=>script.src);assert(scripts.filter(src=>src.includes('bootstrap.bundle.js')).length===1,'one Bootstrap 5 bundle');assert(scripts.some(src=>src.includes('1.bootstrap-compatibility.js')),'router loaded');assert(!scripts.some(src=>src.includes('bootstrap-sass/bootstrap.js')),'no Bootstrap 3 runtime');assert(MauticBootstrapCompatibility.version==='5.3.8-router','router version');''')


if __name__ == '__main__':
    unittest.main(verbosity=2)
