import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REPORT = HERE / 'migration-coverage-report.json'

SPEC = importlib.util.spec_from_file_location('migration_coverage', HERE / 'migration_coverage.py')
assert SPEC is not None
MIGRATION_COVERAGE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MIGRATION_COVERAGE)


class JavascriptPluginCallExtractionTest(unittest.TestCase):
    def extract(self, source):
        return MIGRATION_COVERAGE.extract_jquery_plugin_calls(source, 'fixture.js')

    def test_chained_receiver_literal_method_is_inventoried(self):
        self.assertEqual(
            [
                {
                    'plugin': 'tooltip',
                    'method': 'destroy',
                    'options': [],
                    'dynamic': False,
                    'sourceFile': 'fixture.js',
                },
            ],
            self.extract("mQuery(node).tooltip('destroy');"),
        )

    def test_computed_plugin_access_after_a_chain_is_inventoried(self):
        self.assertEqual(
            [
                {
                    'plugin': 'tooltip',
                    'method': 'show',
                    'options': [],
                    'dynamic': False,
                    'sourceFile': 'fixture.js',
                },
            ],
            self.extract("mQuery(node).find('[title]')['tooltip'](\"show\");"),
        )

    def test_jquery_only_inventory_keeps_chains_and_rejects_unrelated_same_named_methods(self):
        calls = MIGRATION_COVERAGE.extract_jquery_plugin_calls(
            "mQuery(node).find('[title]')['tooltip']('show'); "
            "window.alert(message); range.collapse(true);",
            'fixture.js',
            jquery_only=True,
        )
        self.assertEqual([('tooltip', 'show')], [(call['plugin'], call['method']) for call in calls])

    def test_jquery_receiver_assignment_and_static_option_binding_are_resolved(self):
        calls = MIGRATION_COVERAGE.extract_jquery_plugin_calls(
            "this.modal = mQuery('#modal'); const options = {show: false, keyboard: true}; "
            "this.modal.modal(options);",
            'fixture.js',
            jquery_only=True,
        )
        self.assertEqual(['keyboard', 'show'], calls[0]['options'])
        self.assertFalse(calls[0]['dynamic'])

    def test_empty_and_literal_method_calls_are_distinct_contracts(self):
        self.assertEqual(
            ['init', 'fixTitle'],
            [call['method'] for call in self.extract("target.tooltip(); target.tooltip('fixTitle');")],
        )

    def test_object_literal_option_keys_are_inventoried(self):
        self.assertEqual(
            [
                {
                    'plugin': 'tooltip',
                    'method': 'init',
                    'options': ['animation', 'container', 'data-key', 'title'],
                    'dynamic': False,
                    'sourceFile': 'fixture.js',
                },
            ],
            self.extract(
                "mQuery(node).tooltip({animation: false, container: 'body', "
                "title: function () { return 'x'; }, 'data-key': value});"
            ),
        )

    def test_dynamic_argument_is_not_silently_classified(self):
        calls = self.extract('mQuery(node).tooltip(command);')
        self.assertEqual('tooltip', calls[0]['plugin'])
        self.assertIsNone(calls[0]['method'])
        self.assertEqual([], calls[0]['options'])
        self.assertTrue(calls[0]['dynamic'])
        self.assertEqual('command', calls[0]['argument'])

    def test_computed_or_spread_option_keys_are_dynamic(self):
        calls = self.extract('mQuery(node).tooltip({[key]: value, ...defaults});')
        self.assertTrue(calls[0]['dynamic'])
        self.assertEqual([], calls[0]['options'])


class AnalyzedInputDigestTest(unittest.TestCase):
    def test_changing_an_analyzed_input_changes_the_aggregate_digest(self):
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'consumer.js'
            css = root / 'app.css'
            source.write_text("mQuery('#tip').tooltip();\n")
            css.write_text('.tooltip {}\n')

            before = MIGRATION_COVERAGE.analyzed_input_digest(root, [source], css)
            source.write_text("mQuery('#tip').tooltip('show');\n")
            after = MIGRATION_COVERAGE.analyzed_input_digest(root, [source], css)

        self.assertEqual(2, before['fileCount'])
        self.assertRegex(before['sha256'], r'^[0-9a-f]{64}$')
        self.assertNotEqual(before['sha256'], after['sha256'])


class JavascriptSupportManifestTest(unittest.TestCase):
    def test_adapter_manifest_matches_the_production_adapter_contract(self):
        self.assertEqual(
            {
                'modal': {
                    'methods': ['dispose', 'handleUpdate', 'hide', 'init', 'show', 'toggle'],
                    'options': ['backdrop', 'keyboard', 'show'],
                },
                'popover': {
                    'methods': ['destroy', 'dispose', 'hide', 'init', 'show', 'toggle'],
                    'options': [
                        'animation', 'container', 'content', 'delay', 'html', 'placement',
                        'sanitize', 'title', 'trigger',
                    ],
                },
                'tooltip': {
                    'methods': ['destroy', 'dispose', 'fixTitle', 'hide', 'init', 'show', 'toggle'],
                    'options': [
                        'animation', 'container', 'delay', 'html', 'placement', 'title', 'trigger',
                    ],
                },
            },
            {
                plugin: {
                    'methods': details['methods'],
                    'options': details['options'],
                }
                for plugin, details in MIGRATION_COVERAGE.JS_SUPPORT_MANIFEST.items()
                if details['mode'] == 'adapter'
            },
        )

    def test_review_required_plugins_are_blocking(self):
        summary = {
            'uncoveredCssContracts': 0,
            'reviewRequiredJavascriptPlugins': 1,
            'uncoveredJavascriptPlugins': 0,
            'unsupportedJavascriptContracts': 0,
            'dynamicJavascriptCalls': 0,
            'uncoveredDataAttributes': 0,
            'pendingSemanticContracts': 0,
        }
        self.assertEqual(1, MIGRATION_COVERAGE.blocking_failures(summary, strict_semantic=False))

    def test_unsupported_literal_method_and_option_are_reported(self):
        result = MIGRATION_COVERAGE.javascript_plugin_result(
            'tooltip',
            [
                {
                    'plugin': 'tooltip', 'method': 'madeUp', 'options': [],
                    'dynamic': False, 'sourceFile': 'method.js',
                },
                {
                    'plugin': 'tooltip', 'method': 'init', 'options': ['viewport'],
                    'dynamic': False, 'sourceFile': 'option.js',
                },
            ],
            {'mode': 'adapter', 'methods': ['init'], 'options': [], 'evidence': ['test.js']},
        )
        self.assertEqual(['madeUp'], result['unsupportedMethods'])
        self.assertEqual(['viewport'], result['unsupportedOptions'])
        self.assertEqual('uncovered', result['status'])

    def test_dynamic_call_is_uncovered_even_when_plugin_is_review_required(self):
        result = MIGRATION_COVERAGE.javascript_plugin_result(
            'carousel',
            [
                {
                    'plugin': 'carousel', 'method': None, 'options': [], 'dynamic': True,
                    'sourceFile': 'dynamic.js', 'argument': 'command',
                },
            ],
            {'mode': 'native-or-review-required', 'methods': [], 'options': [], 'evidence': []},
        )
        self.assertEqual('review-required', result['status'])
        self.assertEqual([], result['unsupportedMethods'])
        self.assertEqual(1, len(result['dynamicCalls']))

    def test_literal_native_plugin_call_remains_review_required_not_unsupported(self):
        result = MIGRATION_COVERAGE.javascript_plugin_result(
            'carousel',
            [
                {
                    'plugin': 'carousel', 'method': 'next', 'options': [],
                    'dynamic': False, 'sourceFile': 'native.js',
                },
            ],
            {'mode': 'native-or-review-required', 'methods': [], 'options': [], 'evidence': []},
        )
        self.assertEqual('review-required', result['status'])
        self.assertEqual([], result['unsupportedMethods'])


class MigrationCoverageTest(unittest.TestCase):
    def test_scanner_creates_generated_report_when_it_is_absent(self):
        REPORT.unlink(missing_ok=True)
        result = subprocess.run(
            [sys.executable, str(HERE / 'migration_coverage.py')],
            cwd=ROOT,
            text=True,
            capture_output=True,
            timeout=180,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertTrue(REPORT.exists())

    def test_official_migration_contracts_have_no_static_coverage_gap(self):
        result = subprocess.run(
            [sys.executable, str(HERE / 'migration_coverage.py')],
            cwd=ROOT,
            text=True,
            capture_output=True,
            timeout=180,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        report = json.loads(REPORT.read_text())
        self.assertEqual(0, report['summary']['uncoveredCssContracts'])
        self.assertEqual(0, report['summary']['uncoveredJavascriptPlugins'])
        self.assertEqual(0, report['summary']['unsupportedJavascriptContracts'])
        self.assertEqual(0, report['summary']['dynamicJavascriptCalls'])
        self.assertEqual(0, report['summary']['uncoveredDataAttributes'])

        self.assertEqual(2, report['schemaVersion'])
        self.assertEqual(report['summary']['sourceFiles'] + 1, report['analyzedInputs']['fileCount'])
        self.assertRegex(report['analyzedInputs']['sha256'], r'^[0-9a-f]{64}$')
        self.assertIn('compiledCss', report['analyzedInputs'])
        for plugin in report['javascriptPlugins']:
            with self.subTest(plugin=plugin['plugin']):
                self.assertIn('observedMethods', plugin)
                self.assertIn('observedOptions', plugin)
                self.assertIn('dynamicCalls', plugin)
                self.assertIn('support', plugin)
                self.assertIn('evidence', plugin['support'])
                for evidence in plugin['support']['evidence']:
                    self.assertTrue((ROOT / evidence).exists(), evidence)

        plugins = {plugin['plugin']: plugin for plugin in report['javascriptPlugins']}
        tooltip_methods = {row['method']: row['sourceFiles'] for row in plugins['tooltip']['observedMethods']}
        self.assertIn('app/bundles/CampaignBundle/Assets/js/campaign.js', tooltip_methods['destroy'])
        modal_options = {row['option']: row['sourceFiles'] for row in plugins['modal']['observedOptions']}
        self.assertIn('app/bundles/CampaignBundle/Assets/js/campaign-event-delete-modal.js', modal_options['show'])

    def test_contract_sources_and_semantic_backlog_are_explicit(self):
        subprocess.run(
            [sys.executable, str(HERE / 'migration_coverage.py')],
            cwd=ROOT,
            check=False,
            text=True,
            capture_output=True,
            timeout=180,
        )
        report = json.loads(REPORT.read_text())
        self.assertEqual(
            {
                'bootstrap-4.6': 'https://getbootstrap.com/docs/4.6/migration/',
                'bootstrap-5.3': 'https://getbootstrap.com/docs/5.3/migration/',
            },
            report['officialDocs'],
        )
        self.assertEqual(0, report['summary']['pendingSemanticContracts'])
        for contract, details in report['semanticContracts'].items():
            with self.subTest(contract=contract):
                self.assertIn(details['status'], {'covered', 'accepted', 'unused'})
                self.assertTrue(details['evidence'], contract)
                for evidence in details['evidence']:
                    self.assertTrue((ROOT / evidence).exists(), evidence)


if __name__ == '__main__':
    unittest.main(verbosity=2)
