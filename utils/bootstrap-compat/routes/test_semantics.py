#!/usr/bin/env python3
"""Focused browser contracts for Bootstrap 5 semantic compatibility."""

import importlib.util
import sys
import time
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
COMPAT = HERE.parent
sys.path.insert(0, str(COMPAT))

from detector import APP, Browser  # noqa: E402

AUDIT_SPEC = importlib.util.spec_from_file_location('route_audit', HERE / 'audit.py')
assert AUDIT_SPEC is not None and AUDIT_SPEC.loader is not None
route_audit = importlib.util.module_from_spec(AUDIT_SPEC)
AUDIT_SPEC.loader.exec_module(route_audit)


class SemanticCssContractsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.browser = Browser()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()

    def setUp(self):
        self.emulate_media('screen')

    def execute(self, script, args=None):
        return self.browser.command('POST', '/execute/sync', {'script': script, 'args': args or []})

    def emulate_media(self, media, reduced_motion=None):
        features = []
        if reduced_motion is not None:
            features.append({'name': 'prefers-reduced-motion', 'value': reduced_motion})
        self.browser.command(
            'POST',
            '/goog/cdp/execute',
            {'cmd': 'Emulation.setEmulatedMedia', 'params': {'media': media, 'features': features}},
        )

    def load_fixture(self, markup, attributes=None):
        self.browser.command('POST', '/window/rect', {'width': 1024, 'height': 900})
        self.browser.command('POST', '/url', {'url': f'{APP}/utils/bootstrap-compat/host.html'})
        result = self.browser.command(
            'POST',
            '/execute/async',
            {
                'script': '''
                    const [markup, cssURLs, attributes] = arguments;
                    const done = arguments[arguments.length - 1];
                    (async () => {
                        document.head.querySelectorAll('link, style').forEach(element => element.remove());
                        document.documentElement.removeAttribute('theme');
                        document.documentElement.removeAttribute('data-bs-theme');
                        document.documentElement.removeAttribute('reduce-motion');
                        for (const [name, value] of Object.entries(attributes || {})) {
                            document.documentElement.setAttribute(name, value);
                        }
                        document.body.innerHTML = `<main id="fixture">${markup}</main>`;
                        for (const url of cssURLs) {
                            await new Promise((resolve, reject) => {
                                const link = document.createElement('link');
                                link.rel = 'stylesheet';
                                link.href = url;
                                link.onload = resolve;
                                link.onerror = () => reject(new Error(`CSS failed: ${url}`));
                                document.head.append(link);
                            });
                        }
                        await document.fonts.ready;
                        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                        done(true);
                    })().catch(error => done({error: String(error)}));
                ''',
                'args': [markup, self.browser.css, attributes or {}],
            },
        )
        self.assertTrue(result)

    def test_text_emphasis_variants_override_bootstrap_utility_importance(self):
        self.load_fixture(
            '<h5 id="heading" class="text-white dark-md">Engagements</h5>'
            '<span id="action" class="text-white dark-sm">Action</span>'
        )
        colors = self.execute(
            '''
                return {
                    heading: getComputedStyle(document.querySelector('#heading')).color,
                    action: getComputedStyle(document.querySelector('#action')).color,
                };
            '''
        )

        self.assertNotEqual('rgb(255, 255, 255)', colors['heading'])
        self.assertNotEqual('rgb(255, 255, 255)', colors['action'])

    def test_legacy_dropdown_alignment_drives_bootstrap_5_popper_placement(self):
        self.load_fixture(
            '<div class="dropdown">'
            '<button id="toggle" data-bs-toggle="dropdown">Menu</button>'
            '<ul id="right" class="dropdown-menu dropdown-menu-right"></ul>'
            '</div>'
            '<ul id="left" class="dropdown-menu dropdown-menu-left"></ul>'
        )
        positions = self.execute(
            '''
                return {
                    right: getComputedStyle(document.querySelector('#right')).getPropertyValue('--bs-position').trim(),
                    left: getComputedStyle(document.querySelector('#left')).getPropertyValue('--bs-position').trim(),
                };
            '''
        )

        self.assertEqual({'right': 'end', 'left': 'start'}, positions)

    def test_glyphicon_font_and_removed_class_are_available(self):
        self.load_fixture('<span id="icon" class="glyphicon glyphicon-search"></span>')
        state = self.execute(
            '''
                const icon = document.querySelector('#icon');
                return {
                    family: getComputedStyle(icon).fontFamily,
                    content: getComputedStyle(icon, '::before').content,
                };
            '''
        )

        self.assertIn('Glyphicons Halflings', state['family'])
        self.assertNotEqual('none', state['content'])

    def test_legacy_columns_remain_relative_containing_blocks(self):
        self.load_fixture(
            '<div class="row"><div class="col-xs-6" id="column">'
            '<span id="anchored" style="position:absolute;inset:7px auto auto 9px">x</span>'
            '</div></div>'
        )
        state = self.execute(
            '''
                const column = document.querySelector('#column');
                const anchored = document.querySelector('#anchored');
                return {
                    position: getComputedStyle(column).position,
                    offsetParent: anchored.offsetParent.id,
                    top: anchored.offsetTop,
                    left: anchored.offsetLeft,
                };
            '''
        )
        self.assertEqual({'position': 'relative', 'offsetParent': 'column', 'top': 7, 'left': 9}, state)

    def test_nested_tables_do_not_inherit_outer_row_state(self):
        self.load_fixture(
            '<table class="table table-striped"><tbody><tr class="active"><td id="outer">'
            '<table class="table"><tbody><tr><td id="inner">nested</td></tr></tbody></table>'
            '</td></tr></tbody></table>'
        )
        colors = self.execute(
            '''
                const color = selector => getComputedStyle(document.querySelector(selector)).backgroundColor;
                return {outer: color('#outer'), inner: color('#inner'), background: color('body')};
            '''
        )
        self.assertNotEqual(colors['outer'], colors['inner'])
        self.assertEqual('rgba(0, 0, 0, 0)', colors['inner'])

    def test_links_are_themed_without_resetting_raw_list_semantics(self):
        self.load_fixture(
            '<a id="link" href="#target">link</a>'
            '<ul id="raw"><li>raw</li></ul>'
            '<ul id="unstyled" class="list-unstyled"><li>unstyled</li></ul>'
        )
        state = self.execute(
            '''
                const root = getComputedStyle(document.documentElement);
                const link = getComputedStyle(document.querySelector('#link'));
                const raw = getComputedStyle(document.querySelector('#raw'));
                const unstyled = getComputedStyle(document.querySelector('#unstyled'));
                return {
                    linkColor: link.color,
                    tokenColor: root.getPropertyValue('--link-primary').trim(),
                    decoration: link.textDecorationLine,
                    rawMarker: getComputedStyle(document.querySelector('#raw li')).listStyleType,
                    rawPadding: parseFloat(raw.paddingInlineStart),
                    unstyledMarker: getComputedStyle(document.querySelector('#unstyled li')).listStyleType,
                    unstyledPadding: parseFloat(unstyled.paddingInlineStart),
                };
            '''
        )
        token_color = self.execute(
            '''
                const probe = document.createElement('span');
                probe.style.color = 'var(--link-primary)';
                document.body.append(probe);
                return getComputedStyle(probe).color;
            '''
        )
        self.assertEqual(token_color, state['linkColor'])
        self.assertEqual('none', state['decoration'])
        self.assertEqual('disc', state['rawMarker'])
        self.assertGreater(state['rawPadding'], 0)
        self.assertEqual('none', state['unstyledMarker'])
        self.assertEqual(0, state['unstyledPadding'])

    def test_legacy_print_visibility_utilities_keep_their_display_contracts(self):
        self.load_fixture(
            '<span id="hidden" class="hidden-print">hidden</span>'
            '<span id="visible" class="visible-print">visible</span>'
            '<span id="block" class="visible-print-block">block</span>'
            '<span id="inline" class="visible-print-inline">inline</span>'
            '<span id="inline-block" class="visible-print-inline-block">inline-block</span>'
        )
        screen = self.execute(
            '''
                return Object.fromEntries(['hidden', 'visible', 'block', 'inline', 'inline-block'].map(id =>
                    [id, getComputedStyle(document.getElementById(id)).display]
                ));
            '''
        )
        self.assertNotEqual('none', screen['hidden'])
        for element_id in ('visible', 'block', 'inline', 'inline-block'):
            self.assertEqual('none', screen[element_id])

        self.emulate_media('print')
        printed = self.execute(
            '''
                return Object.fromEntries(['hidden', 'visible', 'block', 'inline', 'inline-block'].map(id =>
                    [id, getComputedStyle(document.getElementById(id)).display]
                ));
            '''
        )
        self.assertEqual('none', printed['hidden'])
        self.assertEqual('block', printed['visible'])
        self.assertEqual('block', printed['block'])
        self.assertEqual('inline', printed['inline'])
        self.assertEqual('inline-block', printed['inline-block'])

    def test_mautic_themes_drive_bootstrap_color_mode_variables(self):
        expected_modes = {
            'light': 'light',
            'solarized-light': 'light',
            'dark': 'dark',
            'solarized-dark': 'dark',
            'dark-freire': 'dark',
        }
        markup = (
            '<div id="body" style="color:var(--bs-body-color);background:var(--bs-body-bg)"></div>'
            '<div id="secondary" style="color:var(--bs-secondary-color);background:var(--bs-secondary-bg)"></div>'
            '<div id="tertiary" style="color:var(--bs-tertiary-color);background:var(--bs-tertiary-bg)"></div>'
            '<div id="border" style="border:1px solid var(--bs-border-color)"></div>'
        )
        for theme, mode in expected_modes.items():
            with self.subTest(theme=theme):
                self.load_fixture(markup, {'theme': theme, 'data-bs-theme': mode})
                state = self.execute(
                    '''
                        const root = getComputedStyle(document.documentElement);
                        const style = id => getComputedStyle(document.getElementById(id));
                        const probe = (property, token) => {
                            const element = document.createElement('i');
                            element.style[property] = `var(${token})`;
                            document.body.append(element);
                            const value = getComputedStyle(element)[property];
                            element.remove();
                            return value;
                        };
                        return {
                            mode: document.documentElement.dataset.bsTheme,
                            bodyColor: style('body').color,
                            bodyColorToken: probe('color', '--text-primary'),
                            bodyBackground: style('body').backgroundColor,
                            bodyBackgroundToken: probe('backgroundColor', '--background'),
                            secondaryColor: style('secondary').color,
                            secondaryColorToken: probe('color', '--text-secondary'),
                            secondaryBackground: style('secondary').backgroundColor,
                            secondaryBackgroundToken: probe('backgroundColor', '--layer-01'),
                            tertiaryColor: style('tertiary').color,
                            tertiaryColorToken: probe('color', '--text-helper'),
                            tertiaryBackground: style('tertiary').backgroundColor,
                            tertiaryBackgroundToken: probe('backgroundColor', '--layer-02'),
                            border: style('border').borderTopColor,
                            borderToken: probe('color', '--border-subtle'),
                        };
                    '''
                )
                self.assertEqual(mode, state.pop('mode'))
                for property_name, value in list(state.items()):
                    if property_name.endswith('Token'):
                        continue
                    self.assertEqual(state[f'{property_name}Token'], value, property_name)

    def test_os_reduced_motion_stops_decorative_motion_and_slows_progress_indicators(self):
        self.emulate_media('screen', 'reduce')
        self.load_fixture(
            '<div id="decorative" class="animation--slide-in-up"></div>'
            '<span id="pulse" class="publishstatus_pulse"></span>'
            '<i id="spinner" class="ri-spin"></i>'
            '<div id="loading" class="loading-bar active"></div>'
            '<div class="mdropzone"><div class="dz-preview dz-success"><span id="asset" class="dz-success-mark"></span></div></div>'
            '<div class="dashboard-widgets"><div class="ui-sortable-helper"><div id="dashboard" class="tile"></div></div></div>'
        )
        state = self.execute(
            '''
                const animation = (selector, pseudo = null) => {
                    const style = getComputedStyle(document.querySelector(selector), pseudo);
                    return {name: style.animationName, duration: parseFloat(style.animationDuration)};
                };
                return {
                    decorative: animation('#decorative'),
                    pulse: animation('#pulse', '::after'),
                    spinner: animation('#spinner'),
                    loading: animation('#loading', '::after'),
                    asset: animation('#asset'),
                    dashboard: animation('#dashboard'),
                };
            '''
        )
        for key in ('decorative', 'pulse', 'asset', 'dashboard'):
            self.assertEqual('none', state[key]['name'], key)
        self.assertEqual('ri-spin', state['spinner']['name'])
        self.assertGreaterEqual(state['spinner']['duration'], 4)
        self.assertRegex(state['loading']['name'], r'after-anim')
        self.assertGreaterEqual(state['loading']['duration'], 5)

    def test_explicit_reduced_motion_disables_decorative_and_progress_animation(self):
        self.load_fixture(
            '<div id="decorative" class="animation--slide-in-up"></div>'
            '<i id="spinner" class="ri-spin"></i>'
            '<div id="loading" class="loading-bar active"></div>',
            {'reduce-motion': 'true'},
        )
        state = self.execute(
            '''
                return {
                    decorative: getComputedStyle(document.querySelector('#decorative')).animationName,
                    spinner: getComputedStyle(document.querySelector('#spinner')).animationName,
                    loadingAfter: getComputedStyle(document.querySelector('#loading'), '::after').animationName,
                    loadingBefore: getComputedStyle(document.querySelector('#loading'), '::before').animationName,
                };
            '''
        )
        self.assertEqual(
            {'decorative': 'none', 'spinner': 'none', 'loadingAfter': 'none', 'loadingBefore': 'none'},
            state,
        )


class SemanticDocumentContractsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        HERE.joinpath('runtime').mkdir(exist_ok=True)
        cls.current, _baseline = route_audit.capture_html(
            {'id': 'semantic-dashboard', 'route': '/s/dashboard'}
        )
        cls.baseline = _baseline
        cls.browser = Browser()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.current.unlink(missing_ok=True)
        cls.baseline.unlink(missing_ok=True)

    def test_document_preserves_legacy_attributes_and_navigation_landmark(self):
        self.browser.command('POST', '/window/rect', {'width': 1024, 'height': 900})
        self.browser.command(
            'POST',
            '/url',
            {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{self.current.name}'},
        )
        time.sleep(1)
        state = self.browser.command(
            'POST',
            '/execute/sync',
            {
                'script': '''
                    const root = document.documentElement;
                    const navigation = document.querySelector('#app-header > .navbar-nocollapse');
                    return {
                        theme: root.getAttribute('theme'),
                        colorMode: root.getAttribute('data-bs-theme'),
                        direction: root.getAttribute('dir'),
                        rtlSupport: root.getAttribute('data-mautic-rtl'),
                        landmark: navigation && navigation.tagName,
                        landmarkClasses: navigation && navigation.className,
                    };
                ''',
                'args': [],
            },
        )
        self.assertIsNotNone(state['theme'])
        self.assertIsNone(state['colorMode'])
        self.assertIsNone(state['direction'])
        self.assertIsNone(state['rtlSupport'])
        self.assertEqual('DIV', state['landmark'])
        self.assertEqual('navbar-nocollapse', state['landmarkClasses'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
