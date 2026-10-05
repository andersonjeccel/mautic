import re
import subprocess
import sys
import time
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
COMPAT = HERE.parent
ROOT = COMPAT.parents[1]
sys.path.insert(0, str(COMPAT))

from detector import APP, Browser  # noqa: E402


class AuthenticatedRouteGeometryTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.runtime = HERE / 'runtime'
        cls.runtime.mkdir(exist_ok=True)
        cls.current = cls.runtime / 'reports-geometry-current.html'
        cls.baseline = cls.runtime / 'reports-geometry-baseline.html'

        cls.mobile_current = cls.runtime / 'mobile-title-geometry-current.html'
        cls.mobile_baseline = cls.runtime / 'mobile-title-geometry-baseline.html'
        cls.dashboard_current = cls.runtime / 'dashboard-geometry-current.html'
        cls.dashboard_baseline = cls.runtime / 'dashboard-geometry-baseline.html'
        cls.users_current = cls.runtime / 'users-geometry-current.html'
        cls.users_baseline = cls.runtime / 'users-geometry-baseline.html'
        cls.forms_current = cls.runtime / 'forms-geometry-current.html'
        cls.forms_baseline = cls.runtime / 'forms-geometry-baseline.html'

        cls.points_current = cls.runtime / 'points-geometry-current.html'
        cls.points_baseline = cls.runtime / 'points-geometry-baseline.html'
        cls.plugins_current = cls.runtime / 'plugins-geometry-current.html'
        cls.plugins_baseline = cls.runtime / 'plugins-geometry-baseline.html'

        def capture(route, current, baseline):
            result = subprocess.run(
                [
                    'ddev',
                    'exec',
                    'php',
                    '/var/www/html/utils/bootstrap-compat/routes/capture.php',
                    route,
                    f'/var/www/html/utils/bootstrap-compat/routes/runtime/{current.name}',
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                timeout=180,
            )
            if result.returncode:
                raise RuntimeError(result.stdout + result.stderr)

            html = current.read_text()
            baseline_html, count = re.subn(
                r'/\./assets/build/css/app-[^"?]+\.css',
                '/utils/bootstrap-compat/frozen/assets/build/css/app-SyEHBgY.css',
                html,
                count=1,
            )
            if 1 != count:
                raise RuntimeError('Could not replace the current app stylesheet with the frozen baseline.')
            baseline.write_text(baseline_html)

        capture('/s/reports/1', cls.current, cls.baseline)

        capture('/s/dwc/1', cls.mobile_current, cls.mobile_baseline)
        capture('/s/dashboard', cls.dashboard_current, cls.dashboard_baseline)
        capture('/s/users', cls.users_current, cls.users_baseline)
        capture('/s/forms/1', cls.forms_current, cls.forms_baseline)

        capture('/s/points/1', cls.points_current, cls.points_baseline)
        capture('/s/plugins', cls.plugins_current, cls.plugins_baseline)

    @classmethod
    def tearDownClass(cls):
        cls.current.unlink(missing_ok=True)
        cls.baseline.unlink(missing_ok=True)

        cls.mobile_current.unlink(missing_ok=True)
        cls.mobile_baseline.unlink(missing_ok=True)
        cls.dashboard_current.unlink(missing_ok=True)
        cls.dashboard_baseline.unlink(missing_ok=True)
        cls.users_current.unlink(missing_ok=True)
        cls.users_baseline.unlink(missing_ok=True)
        cls.forms_current.unlink(missing_ok=True)
        cls.forms_baseline.unlink(missing_ok=True)

        cls.points_current.unlink(missing_ok=True)
        cls.points_baseline.unlink(missing_ok=True)
        cls.plugins_current.unlink(missing_ok=True)
        cls.plugins_baseline.unlink(missing_ok=True)

    @staticmethod
    def _geometry(browser, filename):
        browser.command('POST', '/window/rect', {'width': 1440, 'height': 1200})
        browser.command('POST', '/url', {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'})
        time.sleep(2)
        return browser.command(
            'POST',
            '/execute/sync',
            {
                'script': '''
                    const tables = [...document.querySelectorAll('table')]
                        .filter(element => element.getBoundingClientRect().height > 0)
                        .sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height);
                    const table = tables[0];
                    const row = table.querySelector('tbody tr');
                    const group = row.querySelector('.input-group');
                    const addon = row.querySelector('.input-group-addon');
                    const action = row.querySelector('.ml-xs');
                    const pagination = document.querySelector('.pagination');
                    const cell = row.querySelector('td');
                    const headerCell = table.querySelector('thead th');
                    const visualStyle = element => {
                        const style = getComputedStyle(element);
                        const visibleBorder = side => {
                            const width = style[`border${side}Width`];
                            return '0px' === width ? 'none' : `${width} ${style[`border${side}Style`]} ${style[`border${side}Color`]}`;
                        };
                        return {
                            color: style.color,
                            borderTop: visibleBorder('Top'),
                            borderBottom: visibleBorder('Bottom'),
                            boxShadow: style.boxShadow,
                        };
                    };
                    const rect = element => {
                        const box = element.getBoundingClientRect();
                        return {x: box.x, y: box.y, width: box.width, height: box.height};
                    };
                    return {
                        row: rect(row),
                        tableMarginBottom: getComputedStyle(table).marginBottom,
                        group: rect(group),
                        addon: rect(addon),
                        action: rect(action),
                        pagination: rect(pagination),
                        cellStyle: visualStyle(cell),
                        headerCellStyle: visualStyle(headerCell),
                    };
                ''',
                'args': [],
            },
        )

    def test_current_geometry_matches_the_frozen_visual_contract(self):
        with Browser() as browser:
            baseline = self._geometry(browser, self.baseline.name)
            current = self._geometry(browser, self.current.name)

        # Assert only visible geometry. Wrapper widths are deliberately omitted:
        # Bootstrap 5 may use flexbox instead of preserving Bootstrap 3's table
        # layout as long as the rendered controls keep their visual contract.
        dimensions = {
            'row': {'height': 0.5},
            'addon': {'height': 0.5},
            'action': {'x': 0.5, 'y': 0.5, 'height': 0.5},
            # A small flow shift is not a visual contract worth preserving;
            # dimensions and horizontal placement still have to match.
            'pagination': {'x': 0.5, 'y': 3.5, 'width': 0.5, 'height': 0.5},
        }
        for component, component_dimensions in dimensions.items():
            for dimension, tolerance in component_dimensions.items():
                self.assertAlmostEqual(
                    baseline[component][dimension],
                    current[component][dimension],
                    delta=tolerance,
                    msg=f'{component}.{dimension}: baseline={baseline[component]} current={current[component]}',
                )

        self.assertEqual(baseline['cellStyle'], current['cellStyle'])
        self.assertEqual(baseline['headerCellStyle'], current['headerCellStyle'])
        self.assertEqual(baseline['tableMarginBottom'], current['tableMarginBottom'])

    @staticmethod
    def _mobile_title_geometry(browser, filename):
        browser.command('POST', '/window/rect', {'width': 390, 'height': 844})
        browser.command('POST', '/url', {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'})
        time.sleep(2)
        return browser.command(
            'POST',
            '/execute/sync',
            {
                'script': '''
                    const title = document.querySelector('.page-header-title');
                    const box = title.getBoundingClientRect();
                    const style = getComputedStyle(title);
                    return {
                        fontSize: style.fontSize,
                        lineHeight: style.lineHeight,
                        height: box.height,
                    };
                ''',
                'args': [],
            },
        )

    def test_mobile_page_title_keeps_the_fixed_bootstrap_3_scale(self):
        with Browser() as browser:
            baseline = self._mobile_title_geometry(browser, self.mobile_baseline.name)
            current = self._mobile_title_geometry(browser, self.mobile_current.name)

        self.assertEqual(baseline, current)

    @staticmethod
    def _mobile_report_table_geometry(browser, filename):
        browser.command('POST', '/window/rect', {'width': 390, 'height': 844})
        browser.command('POST', '/url', {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'})
        time.sleep(2)
        return browser.command(
            'POST',
            '/execute/sync',
            {
                'script': '''
                    const table = document.querySelector('#reportTable');
                    const responsive = table.closest('.table-responsive');
                    const row = table.querySelector('tbody tr');
                    const cell = row.querySelector('td');
                    const pagination = [...document.querySelectorAll('.pagination')]
                        .find(element => element.getBoundingClientRect().height > 0);
                    const rect = element => {
                        const box = element.getBoundingClientRect();
                        return {width: box.width, height: box.height};
                    };
                    return {
                        table: rect(table),
                        row: rect(row),
                        cellWhiteSpace: getComputedStyle(cell).whiteSpace,
                        overflowY: getComputedStyle(responsive).overflowY,
                        responsiveBorder: getComputedStyle(responsive).borderTopWidth,
                        responsiveMarginBottom: getComputedStyle(responsive).marginBottom,
                        tableMarginBottom: getComputedStyle(table).marginBottom,
                        pagination: rect(pagination),
                    };
                ''',
                'args': [],
            },
        )

    def test_mobile_responsive_table_preserves_rows_and_horizontal_scrolling(self):
        with Browser() as browser:
            baseline = self._mobile_report_table_geometry(browser, self.baseline.name)
            current = self._mobile_report_table_geometry(browser, self.current.name)

        self.assertEqual(baseline['cellWhiteSpace'], current['cellWhiteSpace'])
        self.assertEqual(baseline['overflowY'], current['overflowY'])
        self.assertEqual(baseline['responsiveBorder'], current['responsiveBorder'])
        self.assertEqual(baseline['responsiveMarginBottom'], current['responsiveMarginBottom'])
        self.assertEqual(baseline['tableMarginBottom'], current['tableMarginBottom'])
        for component in ('table', 'row'):
            for dimension in ('width', 'height'):
                self.assertAlmostEqual(
                    baseline[component][dimension],
                    current[component][dimension],
                    delta=0.5,
                    msg=f'{component}.{dimension}: baseline={baseline[component]} current={current[component]}',
                )

        for dimension in ('width', 'height'):
            self.assertAlmostEqual(
                baseline['pagination'][dimension],
                current['pagination'][dimension],
                delta=0.5,
                msg=f'pagination.{dimension}: baseline={baseline["pagination"]} current={current["pagination"]}',
            )

    @staticmethod
    def _mobile_dashboard_filter_geometry(browser, filename):
        browser.command('POST', '/window/rect', {'width': 390, 'height': 844})
        browser.command('POST', '/url', {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'})
        time.sleep(2)
        return browser.command(
            'POST',
            '/execute/sync',
            {
                'script': '''
                    const group = document.querySelector('.form-filter .input-group');
                    const save = group.querySelector('.input-group-btn');
                    const widgets = document.querySelector('.dashboard-widgets');
                    const rect = element => {
                        const box = element.getBoundingClientRect();
                        return {x: box.x, y: box.y, width: box.width, height: box.height};
                    };
                    return {
                        group: rect(group),
                        save: rect(save),
                        widgets: rect(widgets),
                    };
                ''',
                'args': [],
            },
        )

    def test_mobile_dashboard_date_filter_remains_on_one_line(self):
        with Browser() as browser:
            baseline = self._mobile_dashboard_filter_geometry(browser, self.dashboard_baseline.name)
            current = self._mobile_dashboard_filter_geometry(browser, self.dashboard_current.name)

        for component in ('group', 'save', 'widgets'):
            for dimension in ('x', 'y', 'width', 'height'):
                self.assertAlmostEqual(
                    baseline[component][dimension],
                    current[component][dimension],
                    delta=0.5,
                    msg=f'{component}.{dimension}: baseline={baseline[component]} current={current[component]}',
                )

    def test_tablet_dashboard_date_filter_keeps_available_width(self):
        with Browser() as browser:
            browser.command('POST', '/window/rect', {'width': 1024, 'height': 900})
            widths = {}
            for variant, filename in (
                ('baseline', self.dashboard_baseline.name),
                ('current', self.dashboard_current.name),
            ):
                browser.command(
                    'POST',
                    '/url',
                    {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'},
                )
                time.sleep(2)
                widths[variant] = browser.command(
                    'POST',
                    '/execute/sync',
                    {
                        'script': '''
                            const box = document.querySelector('.form-filter .input-group')
                                .getBoundingClientRect();
                            return {width: box.width, height: box.height};
                        ''',
                        'args': [],
                    },
                )

        self.assertEqual(widths['baseline'], widths['current'])

    @staticmethod
    def _user_row_action_geometry(browser, filename, width, height):
        browser.command('POST', '/window/rect', {'width': width, 'height': height})
        browser.command('POST', '/url', {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'})
        time.sleep(2)
        return browser.command(
            'POST',
            '/execute/sync',
            {
                'script': '''
                    const table = [...document.querySelectorAll('table')]
                        .filter(element => element.getBoundingClientRect().height > 0)
                        .sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
                    const row = table.querySelector('tbody tr');
                    const group = row.querySelector('.input-group-sm');
                    const box = element => {
                        const rect = element.getBoundingClientRect();
                        return {width: rect.width, height: rect.height};
                    };
                    return {row: box(row), group: box(group)};
                ''',
                'args': [],
            },
        )

    def test_user_row_actions_do_not_wrap_at_mobile_or_tablet_widths(self):
        with Browser() as browser:
            for width, height in ((390, 844), (1024, 900)):
                baseline = self._user_row_action_geometry(
                    browser, self.users_baseline.name, width, height
                )
                current = self._user_row_action_geometry(
                    browser, self.users_current.name, width, height
                )
                self.assertAlmostEqual(baseline['group']['height'], current['group']['height'], delta=0.5)
                self.assertAlmostEqual(baseline['row']['height'], current['row']['height'], delta=0.5)

    @staticmethod
    def _mobile_protip_position(browser, filename):
        browser.command('POST', '/window/rect', {'width': 390, 'height': 844})
        browser.command('POST', '/url', {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'})
        time.sleep(2)
        return browser.command(
            'POST',
            '/execute/sync',
            {
                'script': '''
                    const tip = [...document.querySelectorAll('.col-xs-12')]
                        .find(element => element.textContent.includes('ProTip'));
                    const box = tip.getBoundingClientRect();
                    return {
                        x: box.x,
                        y: box.y,
                        width: box.width,
                        height: box.height,
                        color: getComputedStyle(tip.firstElementChild).color,
                    };
                ''',
                'args': [],
            },
        )

    def test_mobile_protip_preserves_spacing_after_list_panel(self):
        with Browser() as browser:
            baseline = self._mobile_protip_position(browser, self.forms_baseline.name)
            current = self._mobile_protip_position(browser, self.forms_current.name)

        self.assertEqual(baseline, current)

    def test_mobile_footer_preserves_right_aligned_version(self):
        with Browser() as browser:
            browser.command('POST', '/window/rect', {'width': 390, 'height': 844})
            positions = {}
            for variant, filename in (
                ('baseline', self.forms_baseline.name),
                ('current', self.forms_current.name),
            ):
                browser.command(
                    'POST',
                    '/url',
                    {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'},
                )
                time.sleep(2)
                positions[variant] = browser.command(
                    'POST',
                    '/execute/sync',
                    {
                        'script': '''
                            const element = document.querySelector('footer .text-right');
                            const range = document.createRange();
                            range.selectNodeContents(element);
                            const text = range.getBoundingClientRect();
                            return {
                                textAlign: getComputedStyle(element).textAlign,
                                textX: text.x,
                            };
                        ''',
                        'args': [],
                    },
                )

        self.assertEqual(positions['baseline'], positions['current'])

    def test_mobile_header_nav_items_preserve_bootstrap_3_geometry(self):
        with Browser() as browser:
            browser.command('POST', '/window/rect', {'width': 390, 'height': 844})
            geometry = {}
            for variant, filename in (
                ('baseline', self.dashboard_baseline.name),
                ('current', self.dashboard_current.name),
            ):
                browser.command(
                    'POST',
                    '/url',
                    {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'},
                )
                time.sleep(2)
                geometry[variant] = browser.command(
                    'POST',
                    '/execute/sync',
                    {
                        'script': '''
                            const items = [...document.querySelectorAll('#app-header .navbar-right > li')];
                            return items.map(item => {
                                const box = item.getBoundingClientRect();
                                return {
                                    display: getComputedStyle(item).display,
                                    x: box.x,
                                    width: box.width,
                                    height: box.height,
                                };
                            });
                        ''',
                        'args': [],
                    },
                )

        self.assertEqual(geometry['baseline'], geometry['current'])

    def test_mobile_header_preserves_bootstrap_3_height(self):
        with Browser() as browser:
            browser.command('POST', '/window/rect', {'width': 390, 'height': 844})
            geometry = {}
            for variant, filename in (
                ('baseline', self.dashboard_baseline.name),
                ('current', self.dashboard_current.name),
            ):
                browser.command(
                    'POST',
                    '/url',
                    {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'},
                )
                time.sleep(2)
                geometry[variant] = browser.command(
                    'POST',
                    '/execute/sync',
                    {
                        'script': '''
                            const header = document.querySelector('#app-header');
                            const navbar = header.querySelector('.navbar-nocollapse');
                            return {
                                headerHeight: header.getBoundingClientRect().height,
                                navbarHeight: navbar.getBoundingClientRect().height,
                            };
                        ''',
                        'args': [],
                    },
                )

        self.assertEqual(geometry['baseline'], geometry['current'])

    def test_dashboard_widget_header_preserves_content_width(self):
        with Browser() as browser:
            browser.command('POST', '/window/rect', {'width': 390, 'height': 844})
            geometry = {}
            for variant, filename in (
                ('baseline', self.dashboard_baseline.name),
                ('current', self.dashboard_current.name),
            ):
                browser.command(
                    'POST',
                    '/url',
                    {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'},
                )
                time.sleep(2)
                geometry[variant] = browser.command(
                    'POST',
                    '/execute/sync',
                    {
                        'script': '''
                            const heading = [...document.querySelectorAll('.dashboard-widgets h4')]
                                .find(element => element.textContent.includes('Contacts Created'));
                            const header = heading.closest('.card-header');
                            const action = header.querySelector('.dropdown');
                            const rect = element => {
                                const box = element.getBoundingClientRect();
                                return {x: box.x, width: box.width};
                            };
                            return {
                                headerPaddingLeft: getComputedStyle(header).paddingLeft,
                                headerPaddingRight: getComputedStyle(header).paddingRight,
                                heading: rect(heading),
                                action: rect(action),
                            };
                        ''',
                        'args': [],
                    },
                )

        self.assertEqual(geometry['baseline'], geometry['current'])

    def test_dashboard_widget_separator_preserves_legacy_collapsed_geometry(self):
        with Browser() as browser:
            browser.command('POST', '/window/rect', {'width': 390, 'height': 844})
            geometry = {}
            for variant, filename in (
                ('baseline', self.dashboard_baseline.name),
                ('current', self.dashboard_current.name),
            ):
                browser.command(
                    'POST',
                    '/url',
                    {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'},
                )
                time.sleep(2)
                geometry[variant] = browser.command(
                    'POST',
                    '/execute/sync',
                    {
                        'script': '''
                            const rule = document.querySelector('.dashboard-widgets .tile > hr.bdr-b');
                            const box = rule.getBoundingClientRect();
                            const style = getComputedStyle(rule);
                            return {
                                x: box.x,
                                width: box.width,
                                marginTop: style.marginTop,
                                marginBottom: style.marginBottom,
                            };
                        ''',
                        'args': [],
                    },
                )

        self.assertEqual(geometry['baseline'], geometry['current'])

    def test_legacy_list_search_and_dashboard_dates_do_not_overlap_previous_controls(self):
        with Browser() as browser:
            browser.command('POST', '/window/rect', {'width': 1440, 'height': 1200})
            geometry = {}
            for variant, reports, dashboard in (
                ('baseline', self.baseline.name, self.dashboard_baseline.name),
                ('current', self.current.name, self.dashboard_current.name),
            ):
                browser.command(
                    'POST',
                    '/url',
                    {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{reports}'},
                )
                time.sleep(2)
                search = browser.command(
                    'POST',
                    '/execute/sync',
                    {
                        'script': '''
                            const input = document.querySelector('#list-search');
                            const box = input.getBoundingClientRect();
                            return {
                                x: box.x,
                                width: box.width,
                                marginLeft: getComputedStyle(input).marginLeft,
                            };
                        ''',
                        'args': [],
                    },
                )
                browser.command(
                    'POST',
                    '/url',
                    {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{dashboard}'},
                )
                time.sleep(2)
                dates = browser.command(
                    'POST',
                    '/execute/sync',
                    {
                        'script': '''
                            return ['#daterange_date_from', '#daterange_date_to'].map(selector => {
                                const input = document.querySelector(selector);
                                const box = input.getBoundingClientRect();
                                return {
                                    x: box.x,
                                    width: box.width,
                                    marginLeft: getComputedStyle(input).marginLeft,
                                };
                            });
                        ''',
                        'args': [],
                    },
                )
                geometry[variant] = {'search': search, 'dates': dates}

        self.assertEqual(geometry['baseline'], geometry['current'])

    def test_plugin_filter_select_preserves_native_caret(self):
        with Browser() as browser:
            browser.command('POST', '/window/rect', {'width': 1440, 'height': 1200})
            appearance = {}
            for variant, filename in (
                ('baseline', self.plugins_baseline.name),
                ('current', self.plugins_current.name),
            ):
                browser.command(
                    'POST',
                    '/url',
                    {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'},
                )
                time.sleep(2)
                appearance[variant] = browser.command(
                    'POST',
                    '/execute/sync',
                    {
                        'script': '''
                            const style = getComputedStyle(document.querySelector('#integrationFilter'));
                            return {
                                appearance: style.appearance,
                                webkitAppearance: style.webkitAppearance,
                                backgroundImage: style.backgroundImage,
                            };
                        ''',
                        'args': [],
                    },
                )

        self.assertEqual(appearance['baseline'], appearance['current'])

    def test_empty_state_sections_preserve_horizontal_rule_spacing(self):
        with Browser() as browser:
            browser.command('POST', '/window/rect', {'width': 1440, 'height': 1200})
            geometry = {}
            for variant, filename in (
                ('baseline', self.points_baseline.name),
                ('current', self.points_current.name),
            ):
                browser.command(
                    'POST',
                    '/url',
                    {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'},
                )
                time.sleep(2)
                geometry[variant] = browser.command(
                    'POST',
                    '/execute/sync',
                    {
                        'script': '''
                            return [...document.querySelectorAll('.mb-160 hr')].map(rule => {
                                const box = rule.getBoundingClientRect();
                                return {
                                    y: box.y,
                                    marginBottom: getComputedStyle(rule).marginBottom,
                                };
                            });
                        ''',
                        'args': [],
                    },
                )

        self.assertEqual(geometry['baseline'], geometry['current'])

    def test_gapped_legacy_columns_shrink_to_fit_the_row(self):
        with Browser() as browser:
            browser.command('POST', '/window/rect', {'width': 1440, 'height': 1200})
            geometry = {}
            for variant, filename in (
                ('baseline', self.dashboard_baseline.name),
                ('current', self.dashboard_current.name),
            ):
                browser.command(
                    'POST',
                    '/url',
                    {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{filename}'},
                )
                time.sleep(2)
                geometry[variant] = browser.command(
                    'POST',
                    '/execute/sync',
                    {
                        'script': '''
                            const row = document.querySelector('.page-header .row-no-gutters');
                            return [...row.children].map(column => {
                                const box = column.getBoundingClientRect();
                                const style = getComputedStyle(column);
                                return {
                                    width: box.width,
                                    flex: style.flex,
                                    maxWidth: style.maxWidth,
                                };
                            });
                        ''',
                        'args': [],
                    },
                )

        self.assertEqual(geometry['baseline'], geometry['current'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
