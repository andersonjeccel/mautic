import re
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


class MarkupAccessibilityContractsTest(unittest.TestCase):
    def read(self, relative_path: str) -> str:
        return (ROOT / relative_path).read_text()

    def test_close_controls_have_translated_names_and_hidden_glyphs(self):
        twig_roots = [ROOT / 'app' / 'bundles', ROOT / 'plugins']
        control_pattern = re.compile(r'<(?P<tag>button|a)\b(?P<attrs>[^>]*)>(?P<body>.*?)</(?P=tag)>', re.DOTALL)
        class_pattern = re.compile(r'class="([^"]*)"')
        close_controls = []

        for twig_root in twig_roots:
            for template in twig_root.rglob('*.html.twig'):
                for match in control_pattern.finditer(template.read_text()):
                    class_match = class_pattern.search(match.group('attrs'))
                    if class_match and 'close' in class_match.group(1).split():
                        close_controls.append((template, match))

        self.assertTrue(close_controls)
        for template, control in close_controls:
            with self.subTest(template=template.relative_to(ROOT)):
                attrs = control.group('attrs')
                body = control.group('body')
                self.assertNotIn('btn-close', attrs)
                self.assertRegex(attrs, r'aria-label="[^"]*\|\s*trans[^"]*"')
                self.assertRegex(body, r'<(?:span|i)\b[^>]*aria-hidden="true"[^>]*>')

        heatmap = self.read('app/bundles/EmailBundle/Assets/js/heatmap.js')
        self.assertIn("class: 'modal-heatmap-close close'", heatmap)
        self.assertIn("'aria-label': Mautic.translate('mautic.core.close')", heatmap)
        self.assertIn(".append('<span aria-hidden=\"true\">×</span>')", heatmap)
        self.assertNotIn('btn-close', heatmap)

    def test_login_input_groups_keep_legacy_and_bootstrap_compatibility_classes(self):
        login = self.read('app/bundles/UserBundle/Resources/views/Security/login.html.twig')
        self.assertEqual(2, len(re.findall(r'class="input-group input-group-lg mb-md"', login)))
        self.assertEqual(2, len(re.findall(r'class="input-group-addon input-group-text"', login)))

    def test_email_validation_exposes_invalid_feedback_relationship(self):
        template = self.read('app/bundles/CoreBundle/Resources/views/Theme/email-validation.html.twig')
        self.assertIn("{% set feedbackId = form.emailAddress.vars.id ~ '_feedback' %}", template)
        self.assertIn('class="input-group has-validation', template)
        self.assertIn("'aria-invalid': form.emailAddress.vars.valid ? 'false' : 'true'", template)
        self.assertIn("'aria-describedby':", template)
        self.assertIn('id="{{ feedbackId }}"', template)

    def test_central_form_theme_associates_help_and_error_state(self):
        template = self.read('app/bundles/CoreBundle/Resources/views/FormTheme/mautic_form_layout.html.twig')
        widget_attributes = template.split('{% block widget_attributes %}', 1)[1].split('{% endblock %}', 1)[0]
        self.assertIn("attr['aria-describedby']|default('')", widget_attributes)
        self.assertIn("id ~ '_help'", widget_attributes)
        self.assertIn("form.vars.errors|length > 0", widget_attributes)
        self.assertIn("'aria-invalid': 'true'", widget_attributes)
        self.assertIn("'aria-describedby': describedBy", widget_attributes)
        self.assertIn('<p id="{{ id }}_help"', template)

    def test_progress_owners_hold_semantics_and_javascript_updates_them(self):
        email_template = self.read('app/bundles/EmailBundle/Resources/views/Send/progress.html.twig')
        lead_template = self.read('app/bundles/LeadBundle/Resources/views/Import/progress.html.twig')
        email_js = self.read('app/bundles/EmailBundle/Assets/js/email.js')
        lead_js = self.read('app/bundles/LeadBundle/Assets/js/lead.js')
        campaign = self.read('app/bundles/CampaignBundle/Resources/views/Campaign/_events.html.twig')

        self.assertRegex(email_template, r'<div class="progress mt-md"[^>]*role="progressbar"[^>]*aria-valuenow=')
        self.assertNotRegex(email_template, r'class="progress-bar-send[^>]*\n\s*role="progressbar"')
        self.assertRegex(lead_template, r'<div class="progress mt-lg"[^>]*role="progressbar"[^>]*aria-valuenow=')
        self.assertNotRegex(lead_template, r'class="progress-bar-import[^>]*\n\s*role="progressbar"')

        self.assertIn("var progress = progressBar.closest('.progress')", email_js)
        self.assertIn("progress.attr('aria-valuenow', response.progress[0])", email_js)
        self.assertIn("var progress = progressBar.closest('.progress')", lead_js)
        self.assertIn("progress.attr('aria-valuenow', response.progress[0])", lead_js)
        self.assertEqual(2, len(re.findall(r'class="progress-bar[^\"]*"[^>]*aria-hidden="true"', campaign)))


if __name__ == '__main__':
    unittest.main(verbosity=2)
