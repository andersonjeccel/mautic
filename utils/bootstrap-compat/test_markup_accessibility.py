import re
import subprocess
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


class LegacyMarkupCompatibilityTest(unittest.TestCase):
    def read(self, relative_path: str) -> str:
        return (ROOT / relative_path).read_text()

    def test_migration_does_not_require_twig_changes(self):
        result = subprocess.run(
            ['git', 'diff', '--name-only', 'upstream/7.x', '--', '*.twig'],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )
        self.assertEqual('', result.stdout.strip())

    def test_login_keeps_bootstrap_3_input_group_markup(self):
        login = self.read('app/bundles/UserBundle/Resources/views/Security/login.html.twig')
        self.assertEqual(2, len(re.findall(r'class="input-group mb-md"', login)))
        self.assertEqual(2, len(re.findall(r'class="input-group-addon"', login)))
        self.assertEqual(2, len(re.findall(r'class="form-control input-lg"', login)))
        self.assertNotIn('input-group-text', login)

    def test_close_controls_keep_legacy_classes_and_data_attributes(self):
        templates = (
            'app/bundles/CampaignBundle/Resources/views/Campaign/_builder.html.twig',
            'app/bundles/CoreBundle/Resources/views/Helper/modal.html.twig',
            'app/bundles/CoreBundle/Resources/views/Helper/theme_select.html.twig',
        )
        for template in templates:
            with self.subTest(template=template):
                source = self.read(template)
                self.assertRegex(source, r'class="[^"]*\bclose\b[^"]*"')
                self.assertIn('data-dismiss=', source)
                self.assertNotIn('btn-close', source)

    def test_progress_javascript_updates_the_legacy_progressbar_owner(self):
        email_template = self.read('app/bundles/EmailBundle/Resources/views/Send/progress.html.twig')
        lead_template = self.read('app/bundles/LeadBundle/Resources/views/Import/progress.html.twig')
        email_js = self.read('app/bundles/EmailBundle/Assets/js/email.js')
        lead_js = self.read('app/bundles/LeadBundle/Assets/js/lead.js')

        self.assertRegex(email_template, r'class="progress-bar-send[^>]*role="progressbar"')
        self.assertRegex(lead_template, r'class="progress-bar-import[^>]*role="progressbar"')
        self.assertIn("mQuery('.progress-bar-send').attr('aria-valuenow'", email_js)
        self.assertIn("mQuery('.progress-bar-import').attr('aria-valuenow'", lead_js)


if __name__ == '__main__':
    unittest.main(verbosity=2)
