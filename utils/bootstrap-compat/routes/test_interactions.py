#!/usr/bin/env python3
"""Authenticated real-route interaction smoke tests via W3C WebDriver."""

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

ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf'
ROUTES = {
    'dashboard': {'id': 'interaction-dashboard', 'route': '/s/dashboard', 'title': 'Dashboard | Mautic'},
    'contacts': {'id': 'interaction-contacts', 'route': '/s/contacts/1', 'title': 'Contacts | Mautic'},
    'categories': {'id': 'interaction-categories', 'route': '/s/categories/global/1', 'title': 'Categories | Mautic'},
    'config': {'id': 'interaction-config', 'route': '/s/config/edit', 'title': 'Configuration | Mautic'},
}
INTERACTION_RUNTIME = 'current'
VARIANTS = (INTERACTION_RUNTIME,)


def capture_interaction_html(entry):
    """Capture the current migrated DOM and JavaScript runtime for interaction tests."""
    return route_audit.capture_current_html(entry)


class AuthenticatedRouteInteractions(unittest.TestCase):
    """Exercise the real route DOM without browser credentials or synthetic DOM events."""

    @classmethod
    def setUpClass(cls):
        cls.pages = {}
        for route_id, entry in ROUTES.items():
            cls.pages[route_id] = {INTERACTION_RUNTIME: capture_interaction_html(entry)}
        cls.browser = Browser()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()

    def load(self, route_id, variant, width=1440, height=1200):
        """Reload one captured route and verify its route-specific sentinel."""
        path = self.pages[route_id][variant]
        self.browser.command('POST', '/window/rect', {'width': width, 'height': height})
        self.browser.command(
            'POST',
            '/url',
            {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{path.name}'},
        )
        expected = ROUTES[route_id]['title']
        state = self.poll(
            'return document.readyState === "complete" && document.title === arguments[0] '
            '? {title: document.title, url: location.pathname} : null;',
            [expected],
            message=f'{route_id}/{variant} route sentinel',
        )
        self.assertEqual(expected, state['title'])
        self.assertEqual(f'/utils/bootstrap-compat/routes/runtime/{path.name}', state['url'])

    def execute(self, script, args=None):
        return self.browser.command('POST', '/execute/sync', {'script': script, 'args': args or []})

    def poll(self, script, args=None, timeout=5.0, message='condition'):
        deadline = time.monotonic() + timeout
        last = None
        while time.monotonic() < deadline:
            last = self.execute(script, args)
            if last:
                return last
            time.sleep(0.05)
        self.fail(f'timed out waiting for {message}; last result: {last!r}')

    def element(self, selector):
        result = self.browser.command('POST', '/element', {'using': 'css selector', 'value': selector})
        self.assertIn(ELEMENT_KEY, result, f'element not found: {selector}')
        return result[ELEMENT_KEY]

    def trusted_click(self, selector):
        self.execute(
            'window.__routeInteractionTrusted = null; '
            'document.querySelector(arguments[0]).addEventListener('
            '"click", event => window.__routeInteractionTrusted = event.isTrusted, {once: true});',
            [selector],
        )
        element = self.element(selector)
        self.browser.command('POST', f'/element/{element}/click', {})
        self.assertTrue(
            self.poll(
                'return window.__routeInteractionTrusted === true;',
                message=f'trusted click on {selector}',
            )
        )

    def trusted_hover(self, selector):
        self.browser.command(
            'POST',
            '/actions',
            {
                'actions': [
                    {
                        'type': 'pointer',
                        'id': 'mouse',
                        'parameters': {'pointerType': 'mouse'},
                        'actions': [
                            {'type': 'pointerMove', 'duration': 50, 'origin': 'viewport', 'x': 5, 'y': 800}
                        ],
                    }
                ]
            },
        )
        self.execute(
            'window.__routeInteractionTrusted = null; '
            'document.querySelector(arguments[0]).addEventListener('
            '"mouseover", event => window.__routeInteractionTrusted = event.isTrusted, {once: true});',
            [selector],
        )
        element = self.element(selector)
        self.browser.command(
            'POST',
            '/actions',
            {
                'actions': [
                    {
                        'type': 'pointer',
                        'id': 'mouse',
                        'parameters': {'pointerType': 'mouse'},
                        'actions': [
                            {'type': 'pointerMove', 'duration': 100, 'origin': {ELEMENT_KEY: element}, 'x': 0, 'y': 0}
                        ],
                    }
                ]
            },
        )
        self.assertTrue(
            self.poll(
                'return window.__routeInteractionTrusted === true;',
                message=f'trusted hover on {selector}',
            )
        )

    def press_escape(self):
        self.execute(
            'window.__routeInteractionTrusted = null; '
            'document.addEventListener("keydown", event => {'
            'if (event.key === "Escape") window.__routeInteractionTrusted = event.isTrusted;'
            '}, {once: true});'
        )
        self.browser.command(
            'POST',
            '/actions',
            {
                'actions': [
                    {
                        'type': 'key',
                        'id': 'keyboard',
                        'actions': [
                            {'type': 'keyDown', 'value': '\ue00c'},
                            {'type': 'keyUp', 'value': '\ue00c'},
                        ],
                    }
                ]
            },
        )
        self.assertTrue(
            self.poll('return window.__routeInteractionTrusted === true;', message='trusted Escape key')
        )

    def assert_visible(self, selector):
        return self.poll(
            'const element = document.querySelector(arguments[0]); '
            'if (!element) return null; const rect = element.getBoundingClientRect(); '
            'const style = getComputedStyle(element); '
            'return rect.width > 0 && rect.height > 0 && style.display !== "none" '
            '&& style.visibility !== "hidden" && Number(style.opacity) > 0 '
            '? {classes: element.className, text: element.textContent.trim()} : null;',
            [selector],
            message=f'visible {selector}',
        )

    def assert_hidden(self, selector):
        return self.poll(
            'const element = document.querySelector(arguments[0]); if (!element) return true; '
            'const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); '
            'return rect.width === 0 || rect.height === 0 || style.display === "none" '
            '|| style.visibility === "hidden" || Number(style.opacity) === 0;',
            [selector],
            message=f'hidden {selector}',
        )

    def test_shared_admin_dropdown_opens(self):
        for variant in VARIANTS:
            with self.subTest(variant=variant):
                self.load('dashboard', variant)
                self.trusted_click('#admin-menu')
                state = self.poll(
                    'const toggle = document.querySelector("#admin-menu"); '
                    'const menu = toggle.parentElement.querySelector(".dropdown-menu"); '
                    'if (!menu) return null; const rect = menu.getBoundingClientRect(); '
                    'return rect.width > 0 && rect.height > 0 '
                    '? {expanded: toggle.getAttribute("aria-expanded"), menu: menu.className} : null;',
                    message='shared admin dropdown',
                )
                self.assertEqual('true', state['expanded'])

    def test_local_list_dropdown_opens(self):
        for variant in VARIANTS:
            with self.subTest(variant=variant):
                self.load('contacts', variant)
                self.trusted_click('#page-list-actions')
                state = self.poll(
                    'const toggle = document.querySelector("#page-list-actions"); '
                    'const host = toggle.closest(".btn-group, .dropdown"); '
                    'const menu = host && host.querySelector(".dropdown-menu"); '
                    'if (!menu) return null; const rect = menu.getBoundingClientRect(); '
                    'return rect.width > 0 && rect.height > 0 '
                    '? {expanded: toggle.getAttribute("aria-expanded")} : null;',
                    message='local list dropdown',
                )
                self.assertEqual('true', state['expanded'])

    def test_global_search_modal_opens_and_closes(self):
        for variant in VARIANTS:
            with self.subTest(variant=variant):
                self.load('dashboard', variant)
                self.trusted_click('#core-search-everything')
                opened = self.assert_visible('#gsearchModal')
                self.assertRegex(opened['classes'], r'\b(in|show)\b')
                self.poll(
                    'return document.querySelector("#gsearchModal").contains(document.activeElement);',
                    message='global search modal focus',
                )
                self.press_escape()
                self.assert_hidden('#gsearchModal')
                self.assertFalse(self.execute('return document.body.classList.contains("modal-open");'))

    def test_tooltip_appears_on_real_hover(self):
        for variant in VARIANTS:
            with self.subTest(variant=variant):
                self.load('dashboard', variant)
                self.poll(
                    'const element = document.querySelector(arguments[0]); '
                    'return Boolean(element && window.bootstrap '
                    '&& window.bootstrap.Tooltip.getInstance(element));',
                    ['#core-search-everything [data-toggle="tooltip"]'],
                    message='tooltip initialization',
                )
                self.trusted_hover('#core-search-everything [data-toggle="tooltip"]')
                tooltip = self.poll(
                    'const tip = [...document.querySelectorAll("[role=tooltip]")].find(element => {'
                    'const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); '
                    'return rect.width > 0 && rect.height > 0 && Number(style.opacity) > 0;'
                    '}); return tip ? {text: tip.textContent.trim(), classes: tip.className} : null;',
                    message='tooltip after hover',
                )
                self.assertEqual('Search everything', tooltip['text'])

    def test_category_quick_filter_popover_opens(self):
        for variant in VARIANTS:
            with self.subTest(variant=variant):
                self.load('categories', variant)
                self.trusted_click('#core-quick-filters')
                popover = self.poll(
                    'const popover = document.querySelector(".popover"); if (!popover) return null; '
                    'const rect = popover.getBoundingClientRect(); const style = getComputedStyle(popover); '
                    'return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" '
                    '? {text: popover.textContent.replace(/\\s+/g, " ").trim(), classes: popover.className} : null;',
                    message='category quick-filter popover',
                )
                self.assertRegex(popover['classes'], r'\b(in|show)\b')
                self.assertIn('Statuses', popover['text'])

    def test_config_tabs_switch_active_panel(self):
        for variant in VARIANTS:
            with self.subTest(variant=variant):
                self.load('config', variant)
                self.trusted_click('[data-toggle="tab"][href="#coreconfig"]')
                state = self.poll(
                    'const trigger = document.querySelector(arguments[0]); '
                    'const panel = document.querySelector("#coreconfig"); '
                    'const rect = panel.getBoundingClientRect(); '
                    'const activePanels = panel.parentElement.querySelectorAll(":scope > .tab-pane.active"); '
                    'return panel.classList.contains("active") && activePanels.length === 1 '
                    '&& rect.width > 0 && rect.height > 0 '
                    '? {trigger: trigger.className, selected: trigger.getAttribute("aria-selected"), panel: panel.className} : null;',
                    ['[data-toggle="tab"][href="#coreconfig"]'],
                    message='System Settings tab activation',
                )
                self.assertRegex(state['trigger'], r'\bactive\b')
                self.assertEqual('true', state['selected'])
                self.assertRegex(state['panel'], r'\bactive\b')

    def test_config_collapse_opens_and_closes(self):
        for variant in VARIANTS:
            with self.subTest(variant=variant):
                self.load('config', variant)
                self.trusted_click('[data-toggle="tab"][href="#coreconfig"]')
                self.poll(
                    'return document.querySelector("#coreconfig").classList.contains("active");',
                    message='System Settings tab before collapse',
                )
                selector = '#headingcore_config_technical_paths'
                self.trusted_click(selector)
                opened = self.poll(
                    'const trigger = document.querySelector(arguments[0]); '
                    'const panel = document.querySelector("#collapsecore_config_technical_paths"); '
                    'const rect = panel.getBoundingClientRect(); '
                    'return rect.height > 0 && !panel.classList.contains("collapsing") '
                    '&& (panel.classList.contains("in") || panel.classList.contains("show")) '
                    '? {expanded: trigger.getAttribute("aria-expanded"), panel: panel.className} : null;',
                    [selector],
                    message='configuration collapse open',
                )
                self.assertEqual('true', opened['expanded'])
                self.trusted_click(selector)
                self.poll(
                    'const trigger = document.querySelector(arguments[0]); '
                    'const panel = document.querySelector("#collapsecore_config_technical_paths"); '
                    'return trigger.getAttribute("aria-expanded") === "false" '
                    '&& !panel.classList.contains("in") && !panel.classList.contains("show");',
                    [selector],
                    message='configuration collapse closed',
                )

    def test_mobile_sidebar_opens_and_closes(self):
        for variant in VARIANTS:
            with self.subTest(variant=variant):
                self.load('dashboard', variant, width=390, height=844)
                initial = self.execute(
                    'const rect = document.querySelector(".app-sidebar").getBoundingClientRect(); '
                    'return {left: rect.left, right: rect.right};'
                )
                self.assertLessEqual(initial['right'], 0)
                selector = '[data-toggle="sidebar"][data-direction="ltr"]'
                self.trusted_click(selector)
                opened = self.poll(
                    'const rect = document.querySelector(".app-sidebar").getBoundingClientRect(); '
                    'return rect.left >= -1 && rect.right > 0 ? {left: rect.left, right: rect.right} : null;',
                    message='mobile sidebar open',
                )
                self.assertGreater(opened['right'], 0)
                self.trusted_click(selector)
                self.poll(
                    'const rect = document.querySelector(".app-sidebar").getBoundingClientRect(); '
                    'return rect.right <= 0;',
                    message='mobile sidebar closed',
                )


if __name__ == '__main__':
    unittest.main(verbosity=2)
