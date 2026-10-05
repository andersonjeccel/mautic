import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('route_audit', HERE / 'audit.py')
assert SPEC is not None and SPEC.loader is not None
route_audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(route_audit)

INTERACTIONS_SPEC = importlib.util.spec_from_file_location('route_interactions', HERE / 'test_interactions.py')
assert INTERACTIONS_SPEC is not None and INTERACTIONS_SPEC.loader is not None
route_interactions = importlib.util.module_from_spec(INTERACTIONS_SPEC)
INTERACTIONS_SPEC.loader.exec_module(route_interactions)


class RouteAuditUnitTest(unittest.TestCase):
    def test_authenticated_interactions_capture_only_the_current_migrated_runtime(self):
        entry = {'id': 'dashboard', 'route': '/s/dashboard'}
        current = Path('dashboard-current.html')

        with patch.object(route_interactions.route_audit, 'capture_current_html', return_value=current) as capture:
            self.assertEqual(current, route_interactions.capture_interaction_html(entry))

        capture.assert_called_once_with(entry)
        self.assertEqual('current', route_interactions.INTERACTION_RUNTIME)
        self.assertEqual(('current',), route_interactions.VARIANTS)

    def test_report_identifies_css_only_comparison_with_current_dom_and_javascript(self):
        class EmptyBrowser:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

        expected = {
            'type': 'css-only',
            'baseline': {
                'css': route_audit.FROZEN_STYLESHEET,
                'dom': 'current-captured',
                'javascript': 'current-migrated-runtime',
            },
            'current': {
                'css': 'current-captured',
                'dom': 'current-captured',
                'javascript': 'current-migrated-runtime',
            },
            'bootstrap_3_runtime_javascript': False,
        }

        with tempfile.TemporaryDirectory() as directory:
            with (
                patch.object(route_audit, 'RUNTIME', Path(directory)),
                patch.object(route_audit, 'capture_html', side_effect=RuntimeError('capture unavailable')),
                patch.object(route_audit, 'Browser', EmptyBrowser),
            ):
                report = route_audit.audit(
                    [{'id': 'dashboard', 'route': '/s/dashboard'}],
                    [{'id': 'desktop', 'width': 1440, 'height': 1200}],
                )

        self.assertEqual(expected, report['comparison'])

    def test_manifest_requires_unique_ids_and_absolute_routes(self):
        entries = [
            {'id': 'contacts', 'route': '/s/contacts/1'},
            {'id': 'reports', 'route': '/s/reports/1'},
        ]
        self.assertEqual(entries, route_audit.validate_manifest(entries))

        with self.assertRaisesRegex(ValueError, 'duplicate route id'):
            route_audit.validate_manifest(entries + [{'id': 'contacts', 'route': '/s/companies/1'}])

        with self.assertRaisesRegex(ValueError, 'absolute application path'):
            route_audit.validate_manifest([{'id': 'bad', 'route': 's/contacts/1'}])

    def test_baseline_replacement_changes_exactly_one_app_stylesheet(self):
        html = '<link rel="stylesheet" href="/./assets/build/css/app-abc_123.css"><main>Test</main>'
        result = route_audit.replace_app_stylesheet(html)
        self.assertIn('/utils/bootstrap-compat/frozen/assets/build/css/app-SyEHBgY.css', result)
        self.assertNotIn('app-abc_123.css', result)

        with self.assertRaisesRegex(ValueError, 'exactly one'):
            route_audit.replace_app_stylesheet('<main>No stylesheet</main>')

    def test_viewports_require_unique_ids_and_positive_dimensions(self):
        viewports = [
            {'id': 'desktop', 'width': 1440, 'height': 1200},
            {'id': 'mobile', 'width': 390, 'height': 844},
        ]
        self.assertEqual(viewports, route_audit.validate_viewports(viewports))

        with self.assertRaisesRegex(ValueError, 'duplicate viewport id'):
            route_audit.validate_viewports(viewports + [{'id': 'mobile', 'width': 430, 'height': 932}])

        with self.assertRaisesRegex(ValueError, 'positive integer dimensions'):
            route_audit.validate_viewports([{'id': 'bad', 'width': 0, 'height': 844}])


if __name__ == '__main__':
    unittest.main(verbosity=2)
