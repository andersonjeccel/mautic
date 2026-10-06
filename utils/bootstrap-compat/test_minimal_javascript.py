import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRIDGE = ROOT / 'app/bundles/CoreBundle/Assets/js/1.bootstrap-compatibility.js'
OLD_ADAPTER = ROOT / 'app/bundles/CoreBundle/Assets/js/0.bootstrap-3-jquery-adapter.js'


class JavascriptCompatibilityBoundaryTest(unittest.TestCase):
    def test_compatibility_has_one_production_bridge(self):
        self.assertFalse(OLD_ADAPTER.exists())

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

    def test_bridge_covers_attributes_state_and_legacy_jquery_lifecycle(self):
        source = BRIDGE.read_text()
        self.assertIn("'data-' + name", source)
        self.assertIn("'data-bs-' + name", source)
        self.assertIn('getOrCreateInstance', source)
        self.assertIn("$(el).data('bs.modal',record)", source)
        self.assertIn("option==='fixTitle'", source)
        self.assertIn("option==='destroy'", source)
        self.assertIn('Bootstrap3Compat.install', source)
        self.assertIn('MutationObserver', source)
        self.assertIn('normalizeLegacyStateClasses', source)
        self.assertIn("'shown.bs.tab'", source)
        self.assertIn("'shown.bs.collapse'", source)


if __name__ == '__main__':
    unittest.main(verbosity=2)
