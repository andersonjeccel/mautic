import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRIDGE = ROOT / 'app/bundles/CoreBundle/Assets/js/1.bootstrap-compatibility.js'
OLD_ADAPTER = ROOT / 'app/bundles/CoreBundle/Assets/js/0.bootstrap-3-jquery-adapter.js'


class MinimalJavascriptCompatibilityTest(unittest.TestCase):
    def test_compatibility_is_a_single_small_bridge(self):
        self.assertFalse(OLD_ADAPTER.exists())
        self.assertLessEqual(len(BRIDGE.read_text().splitlines()), 325)

    def test_bridge_does_not_calculate_or_assign_css_or_geometry(self):
        source = BRIDGE.read_text()
        forbidden = (
            'getComputedStyle',
            'styleSheets',
            '.style',
            '.css(',
            "attr('class'",
            'setAttribute(\'style\'',
            'insertRule',
            'cssText',
            'colgroup',
            'offsetWidth',
            'offsetHeight',
            'clientWidth',
            'clientHeight',
            'scrollWidth',
            'scrollHeight',
            'getBoundingClientRect',
        )
        for token in forbidden:
            with self.subTest(token=token):
                self.assertNotIn(token, source)

    def test_bridge_scope_is_attribute_translation_and_plugin_redirection(self):
        source = BRIDGE.read_text()
        self.assertIn("'data-' + name", source)
        self.assertIn("'data-bs-' + name", source)
        self.assertIn('getOrCreateInstance', source)
        self.assertIn("destroy: 'dispose'", source)
        self.assertIn("fixTitle: '_fixTitle'", source)
        self.assertIn('MutationObserver', source)
        self.assertIn('normalizeLegacyStateClasses', source)
        self.assertIn("'shown.bs.tab'", source)
        self.assertIn("'shown.bs.collapse'", source)


if __name__ == '__main__':
    unittest.main(verbosity=2)
