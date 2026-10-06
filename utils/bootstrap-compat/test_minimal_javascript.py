import re
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRIDGE = ROOT / 'app/bundles/CoreBundle/Assets/js/1.bootstrap-compatibility.js'
SOURCE = ROOT / 'utils/bootstrap-compat/adapter/adapter.js'
OLD_ADAPTER = ROOT / 'app/bundles/CoreBundle/Assets/js/0.bootstrap-3-jquery-adapter.js'


class JavascriptCompatibilityBoundaryTest(unittest.TestCase):
    def test_production_bridge_is_the_canonical_router(self):
        self.assertFalse(OLD_ADAPTER.exists())
        sources = json.loads(SOURCE.with_name('production-sources.json').read_text())
        self.assertEqual(b'\n'.join(SOURCE.with_name(name).read_bytes() for name in sources), BRIDGE.read_bytes())

    def test_router_never_manipulates_classes_styles_or_geometry(self):
        source = SOURCE.read_text()
        forbidden = (
            'classList',
            '.addClass(',
            '.removeClass(',
            '.toggleClass(',
            '.style',
            '.css(',
            'getComputedStyle',
            'offsetWidth',
            'offsetHeight',
            'clientWidth',
            'clientHeight',
            'scrollWidth',
            'scrollHeight',
            'getBoundingClientRect',
            'insertRule',
            'cssText',
        )
        for token in forbidden:
            with self.subTest(token=token):
                self.assertNotIn(token, source)

    def test_dom_writes_are_limited_to_bootstrap_5_data_attributes(self):
        source = SOURCE.read_text()
        set_attribute_calls = re.findall(r"\.setAttribute\(([^,]+),", source)
        self.assertEqual(['bootstrapName', "'data-bs-template'", "'data-bs-title'"], set_attribute_calls)
        self.assertEqual(['bootstrapName'], re.findall(r"\.removeAttribute\(([^)]+)\)", source))

    def test_router_translates_attributes_options_methods_and_jquery_plugins(self):
        source = BRIDGE.read_text()
        self.assertIn("'data-' + name, 'data-bs-' + name", source)
        self.assertIn("return 'destroy' === method ? 'dispose' : method", source)
        self.assertIn('normalized.boundary = normalized.viewport', source)
        self.assertIn('BootstrapConstructor.jQueryInterface', source)
        self.assertIn('BootstrapConstructor.getInstance', source)
        self.assertIn("jQuery.fn[pluginName] = createJQueryRouter", source)
        self.assertIn("version: '5.3.8-router'", source)
        for plugin in (
            'alert', 'button', 'carousel', 'collapse', 'dropdown', 'modal',
            'popover', 'scrollspy', 'tab', 'tooltip',
        ):
            with self.subTest(plugin=plugin):
                self.assertRegex(source, rf"\b{plugin}: '[A-Za-z]+'")


if __name__ == '__main__':
    unittest.main(verbosity=2)
