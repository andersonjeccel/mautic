"""Bootstrap 3 compatibility contracts in real Chromium."""
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
PLUGINS = (
    'alert', 'button', 'carousel', 'collapse', 'dropdown', 'modal',
    'popover', 'scrollspy', 'tab', 'tooltip', 'affix',
)


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

    def page(self, baseline=False, suffix=''):
        query = '?baseline=1' if baseline else suffix
        self.command('POST', '/url', {'url': f'{APP}/utils/bootstrap-compat/adapter/fixture.html{query}'})
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

    def check(self, body, baseline=False, suffix=''):
        metadata = self.page(baseline, suffix)
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

    def compare(self, body):
        for baseline in (True, False):
            with self.subTest(baseline=baseline):
                self.check(body, baseline)

    def test_complete_bootstrap_3_plugin_surface_survives_bootstrap_5_registration(self):
        expected = json.dumps(list(PLUGINS))
        self.check(
            f'''const names={expected};assert(names.every(name=>typeof $.fn[name]==='function'),'plugin surface');assert(names.every(name=>$.fn[name].Constructor&&$.fn[name].Constructor.VERSION==='3.4.1'),'plugin versions');assert(Bootstrap3Compat.version==='3.4.1','runtime marker');'''
        )

    def test_modal_init_lifecycle_chainability(self):
        self.compare('''let events=[];m.on('show.bs.modal shown.bs.modal hide.bs.modal hidden.bs.modal',event=>events.push(event.type));assert(m.modal({show:false})===m,'chain init');const instance=m.data('bs.modal');assert(instance&&instance.options,'legacy instance');m.modal({show:false});assert(m.data('bs.modal')===instance,'stable instance');m.modal('show');await sleep(100);assert(m.hasClass('in'),'shown');m.modal('hide');await sleep(100);assert(events.join(',')==='show,shown,hide,hidden','lifecycle '+events);''')

    def test_modal_mutable_options_and_keyboard_focus(self):
        self.compare('''m.modal({show:false,keyboard:false,backdrop:'static'});const instance=m.data('bs.modal');assert(instance.options.keyboard===false&&instance.options.backdrop==='static','options');instance.options.keyboard=true;instance.options.backdrop=true;assert(instance.options.keyboard===true&&instance.options.backdrop===true,'mutable options');''')

    def test_legacy_static_backdrop_and_data_show_false(self):
        self.compare('''m.attr({'data-show':'false','data-backdrop':'static'}).modal();await sleep(50);assert(!m.hasClass('in'),'data show false');m.modal('show');await sleep(100);assert(m.hasClass('in'),'manual show');m.modal('hide');''')

    def test_production_modal_data_api_keeps_legacy_adapter_ownership(self):
        self.check('''let events=[];m.on('show.bs.modal shown.bs.modal hide.bs.modal hidden.bs.modal',event=>events.push(event.type));$('#opener')[0].click();await sleep(100);assert(m.data('bs.modal'),'legacy owner');assert(!bootstrap.Modal.getInstance(m[0]),'native owner absent');$('#dismiss')[0].click();await sleep(100);assert(events.join(',')==='show,shown,hide,hidden','single lifecycle '+events);''')

    def test_tooltip_lifecycle_destroy_and_reinit(self):
        self.compare('''t.tooltip({trigger:'manual',animation:false,container:'body'});const instance=t.data('bs.tooltip');t.tooltip('show');await sleep(50);assert(document.querySelector('.tooltip'),'shown');t.tooltip('hide');await sleep(50);t.tooltip('destroy');assert(!t.data('bs.tooltip'),'destroyed');t.tooltip({trigger:'manual',animation:false});assert(t.data('bs.tooltip')!==instance,'reinitialized');t.tooltip('destroy');''')

    def test_tooltip_consumer_title_refresh_and_legacy_options(self):
        self.compare('''t.tooltip({trigger:'manual',animation:false,container:'body',html:true,placement:'left'});t.attr('title','<b>Updated</b>').tooltip('fixTitle').tooltip('show');await sleep(50);assert(document.querySelector('.tooltip-inner b').textContent==='Updated','content');assert(t.data('bs.tooltip').options.placement==='left','placement');t.tooltip('destroy');''')

    def test_popover_legacy_instance_and_content_contract(self):
        self.compare('''const p=$('#pop');p.popover({animation:false,html:true,sanitize:false,trigger:'manual',container:'body'}).popover('show');await sleep(50);const instance=p.data('bs.popover');assert(instance&&instance.tip().text().includes('One'),'content');p.popover('destroy');assert(!p.data('bs.popover'),'destroyed');''')

    def test_production_collapse_jquery_methods_match_legacy(self):
        self.compare('''const panel=$('#legacy-collapse'),events=[];panel.on('show.bs.collapse shown.bs.collapse hide.bs.collapse hidden.bs.collapse',event=>events.push(event.type));panel.collapse('hide');await sleep(500);assert(!panel.hasClass('in'),'hidden');panel.collapse('show');await sleep(500);assert(panel.hasClass('in'),'shown');assert(events.join(',')==='hide,hidden,show,shown','lifecycle '+events);''')

    def test_production_collapse_normalizes_in_show_and_lifecycle(self):
        self.compare('''const panel=$('#legacy-collapse');$('#collapse-trigger')[0].click();await sleep(500);assert(!panel.hasClass('in'),'data api hide');$('#collapse-trigger')[0].click();await sleep(500);assert(panel.hasClass('in'),'data api show');''')

    def test_production_tab_preserves_legacy_state_and_events(self):
        self.compare('''const two=$('#tab-two'),events=[];two.on('show.bs.tab shown.bs.tab',event=>events.push(event.type));two.tab('show');assert(two.parent().hasClass('active'),'active trigger parent');assert($('#pane-two').hasClass('active'),'active panel');assert(events.join(',')==='show,shown','events '+events);''')

    def test_production_data_api_tab_prepares_legacy_active_lifecycle(self):
        self.compare('''$('#tab-two')[0].click();assert($('#tab-two').parent().hasClass('active'),'data api trigger');assert($('#pane-two').hasClass('active'),'data api panel');''')

    def test_legacy_button_groups_toggle_inputs_and_active_state(self):
        self.compare('''const one=$('#choice-one'),two=$('#choice-two'),check=$('#check-choice');$('#radio-two')[0].click();assert(!one.prop('checked')&&two.prop('checked'),'radio state');assert($('#radio-two').hasClass('active'),'radio class');$('#check-button')[0].click();assert(check.prop('checked')&&$('#check-button').hasClass('active'),'checkbox on');$('#check-button')[0].click();assert(!check.prop('checked')&&!$('#check-button').hasClass('active'),'checkbox off');''')

    def test_legacy_dropdown_data_api_matches_visible_state_and_events(self):
        self.compare('''const host=$('#legacy-dropdown'),events=[];host.on('show.bs.dropdown shown.bs.dropdown hide.bs.dropdown hidden.bs.dropdown',event=>events.push(event.type));$('#dropdown-toggle')[0].click();assert(host.hasClass('open'),'open');$('#dropdown-toggle')[0].click();assert(!host.hasClass('open'),'closed');assert(events.join(',')==='show,shown,hide,hidden','events '+events);''')


if __name__ == '__main__':
    unittest.main(verbosity=2)
