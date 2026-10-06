import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = Path(__file__).with_name('legacy-classes.json')
ASSET_MANIFEST = ROOT / 'assets/build/manifest.json'
CLASS_PATTERN = re.compile(r'(?<!\\)\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)')


class LegacyBootstrapClassCoverageTest(unittest.TestCase):
    def test_compiled_bundle_contains_every_removed_bootstrap_3_class(self):
        legacy = json.loads(MANIFEST.read_text())
        self.assertEqual('3.4.1', legacy['bootstrap3Version'])
        self.assertEqual(417, len(legacy['bootstrap3RemovedClasses']))
        self.assertNotIn('bootstrap4OnlyRemovedClasses', legacy)
        assets = json.loads(ASSET_MANIFEST.read_text())
        css_path = ROOT / assets['css/app.scss'].lstrip('/')
        css = css_path.read_text()
        selectors = []

        for prelude in re.findall(r'([^{}]+)\{', css):
            prelude = prelude.strip()
            if prelude.startswith('@'):
                continue
            selectors.append(prelude)

        compiled_classes = set(CLASS_PATTERN.findall('\n'.join(selectors)))
        expected = set(legacy['bootstrap3RemovedClasses'])
        missing = sorted(expected - compiled_classes)

        self.assertEqual([], missing)


if __name__ == '__main__':
    unittest.main(verbosity=2)
