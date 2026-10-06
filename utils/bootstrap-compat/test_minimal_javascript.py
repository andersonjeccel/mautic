import hashlib
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRIDGE = ROOT / 'app/bundles/CoreBundle/Assets/js/1.bootstrap-compatibility.js'
BASELINE = ROOT / 'utils/bootstrap-compat/adapter/baseline/bootstrap-sass/bootstrap.js'
OLD_ADAPTER = ROOT / 'app/bundles/CoreBundle/Assets/js/0.bootstrap-3-jquery-adapter.js'
EXPECTED_SHA256 = 'dbd2a35e72edc7d6bde483481a912f1c38aa57fab2747d9b071d317339ee03a2'
PLUGINS = (
    'alert',
    'button',
    'carousel',
    'collapse',
    'dropdown',
    'modal',
    'popover',
    'scrollspy',
    'tab',
    'tooltip',
    'affix',
)


class JavascriptCompatibilityBoundaryTest(unittest.TestCase):
    def test_compatibility_has_one_generated_production_bridge(self):
        self.assertFalse(OLD_ADAPTER.exists())
        baseline = BASELINE.read_bytes()
        bridge = BRIDGE.read_bytes()
        self.assertEqual(EXPECTED_SHA256, hashlib.sha256(baseline).hexdigest())
        self.assertTrue(bridge.startswith(baseline.rstrip() + b'\n'))

    def test_custom_postlude_does_not_implement_component_behavior_or_geometry(self):
        baseline = BASELINE.read_text().rstrip()
        source = BRIDGE.read_text()
        postlude = source[len(baseline):]
        forbidden = (
            'getComputedStyle',
            '.style',
            '.css(',
            'offsetWidth',
            'offsetHeight',
            'clientWidth',
            'clientHeight',
            'scrollWidth',
            'scrollHeight',
            'getBoundingClientRect',
            'classList',
            'setAttribute',
            'removeAttribute',
            '.on(',
        )
        for token in forbidden:
            with self.subTest(token=token):
                self.assertNotIn(token, postlude)

    def test_bridge_exposes_the_complete_bootstrap_3_plugin_surface(self):
        source = BRIDGE.read_text()
        for plugin in PLUGINS:
            with self.subTest(plugin=plugin):
                self.assertIn(f'{plugin}:jQuery.fn.{plugin}', source)
        self.assertIn("version: '3.4.1'", source)
        self.assertIn(f"sourceSha256: '{EXPECTED_SHA256}'", source)
        self.assertIn('window.MauticBootstrapCompatibility = compatibility', source)


if __name__ == '__main__':
    unittest.main(verbosity=2)
