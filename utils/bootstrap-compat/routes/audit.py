#!/usr/bin/env python3
"""Capture and compare authenticated Mautic routes against frozen CSS."""

import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image, ImageChops


HERE = Path(__file__).resolve().parent
COMPAT = HERE.parent
ROOT = COMPAT.parents[1]
RUNTIME = HERE / 'runtime'
MANIFEST = HERE / 'manifest.json'
FROZEN_STYLESHEET = '/utils/bootstrap-compat/frozen/assets/build/css/app-SyEHBgY.css'
DEFAULT_VIEWPORTS = [
    {'id': 'desktop', 'width': 1440, 'height': 1200},
    {'id': 'tablet', 'width': 1024, 'height': 900},
    {'id': 'mobile', 'width': 390, 'height': 844},
]
sys.path.insert(0, str(COMPAT))

from detector import APP, Browser  # noqa: E402


def validate_manifest(entries):
    if not isinstance(entries, list) or not entries:
        raise ValueError('route manifest must be a non-empty list')

    seen = set()
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get('id'), str) or not entry['id']:
            raise ValueError('each route requires a non-empty string id')
        if entry['id'] in seen:
            raise ValueError(f"duplicate route id: {entry['id']}")
        seen.add(entry['id'])
        route = entry.get('route')
        if not isinstance(route, str) or not route.startswith('/'):
            raise ValueError(f"route {entry['id']} must use an absolute application path")
    return entries


def validate_viewports(viewports):
    if not isinstance(viewports, list) or not viewports:
        raise ValueError('viewports must be a non-empty list')

    seen = set()
    for viewport in viewports:
        viewport_id = viewport.get('id') if isinstance(viewport, dict) else None
        if not isinstance(viewport_id, str) or not viewport_id:
            raise ValueError('each viewport requires a non-empty string id')
        if viewport_id in seen:
            raise ValueError(f'duplicate viewport id: {viewport_id}')
        seen.add(viewport_id)
        if not all(isinstance(viewport.get(dimension), int) and viewport[dimension] > 0 for dimension in ('width', 'height')):
            raise ValueError(f'viewport {viewport_id} requires positive integer dimensions')
    return viewports


def replace_app_stylesheet(html):
    result, count = re.subn(
        r'/\./assets/build/css/app-[^"?]+\.css',
        FROZEN_STYLESHEET,
        html,
        count=1,
    )
    if 1 != count:
        raise ValueError('expected exactly one compiled app stylesheet')
    return result


def capture_current_html(entry):
    current = RUNTIME / f"{entry['id']}-current.html"
    result = subprocess.run(
        [
            'ddev',
            'exec',
            'php',
            '/var/www/html/utils/bootstrap-compat/routes/capture.php',
            entry['route'],
            f'/var/www/html/utils/bootstrap-compat/routes/runtime/{current.name}',
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=180,
    )
    if result.returncode:
        raise RuntimeError((result.stdout + result.stderr).strip())
    return current


def capture_html(entry):
    current = capture_current_html(entry)
    baseline = RUNTIME / f"{entry['id']}-baseline.html"
    baseline.write_text(replace_app_stylesheet(current.read_text()))
    return current, baseline


def comparison_metadata():
    """Describe the CSS-only comparison without implying a legacy runtime."""
    return {
        'type': 'css-only',
        'baseline': {
            'css': FROZEN_STYLESHEET,
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


def changed_pixels(before, after):
    width = min(before.width, after.width)
    height = min(before.height, after.height)
    difference = ImageChops.difference(
        before.crop((0, 0, width, height)).convert('RGB'),
        after.crop((0, 0, width, height)).convert('RGB'),
    )
    mask = difference.convert('L').point(lambda value: 255 if value else 0)
    changed = sum(mask.histogram()[1:])
    return changed, width * height, difference


def audit(entries, viewports=None):
    viewports = validate_viewports(viewports or DEFAULT_VIEWPORTS)
    RUNTIME.mkdir(exist_ok=True)
    report = {
        'schema_version': 3,
        'complete_app_coverage': False,
        'comparison': comparison_metadata(),
        'viewports': viewports,
        'routes': [],
    }
    captured = []
    for entry in entries:
        record = {'id': entry['id'], 'route': entry['route']}
        try:
            current, baseline = capture_html(entry)
            record['capture'] = 'ok'
            captured.append((entry, record, current, baseline))
        except Exception as error:
            record['capture'] = 'failed'
            record['error'] = str(error)
        report['routes'].append(record)

    with Browser() as browser:
        for entry, record, current, baseline in captured:
            record['viewports'] = {}
            for viewport in viewports:
                viewport_record = {}
                images = {}
                try:
                    browser.command('POST', '/window/rect', {'width': viewport['width'], 'height': viewport['height']})
                    stem = entry['id'] if 'desktop' == viewport['id'] else f"{entry['id']}-{viewport['id']}"
                    for variant, path in (('baseline', baseline), ('current', current)):
                        browser.command(
                            'POST',
                            '/url',
                            {'url': f'{APP}/utils/bootstrap-compat/routes/runtime/{path.name}'},
                        )
                        time.sleep(1.2)
                        browser_logs = browser.command('POST', '/se/log', {'type': 'browser'})
                        if 'current' == variant and 'desktop' == viewport['id']:
                            runtime_contracts = browser.command(
                                'POST',
                                '/execute/sync',
                                {
                                    'script': '''
                                        const pluginNames = ['button', 'collapse', 'dropdown', 'modal', 'popover', 'tab', 'tooltip'];
                                        const controls = {};
                                        const missingOwners = [];
                                        document.querySelectorAll('[data-toggle]').forEach(element => {
                                            const toggle = element.getAttribute('data-toggle');
                                            const plugin = toggle === 'buttons' ? 'button' : toggle;
                                            if (!pluginNames.includes(plugin)) return;
                                            controls[plugin] = (controls[plugin] || 0) + 1;
                                            if (!window.mQuery || typeof window.mQuery.fn[plugin] !== 'function') {
                                                missingOwners.push(plugin);
                                            }
                                        });
                                        return {
                                            bridge: Boolean(window.MauticBootstrapCompatibility),
                                            controls,
                                            facades: Object.fromEntries(pluginNames.map(name => [name, typeof window.mQuery?.fn[name]])),
                                            missingOwners: [...new Set(missingOwners)].sort(),
                                        };
                                    ''',
                                    'args': [],
                                },
                            )
                            severe_logs = [
                                log for log in browser_logs
                                if 'SEVERE' == log.get('level')
                                and 'favicon.ico' not in log.get('message', '')
                                and not (
                                    '/s/login - Failed to load resource: net::ERR_CONNECTION_REFUSED'
                                    in log.get('message', '')
                                )
                            ]
                            record['javascript'] = {
                                **runtime_contracts,
                                'severeConsoleErrors': severe_logs,
                            }
                            if not runtime_contracts['bridge'] or runtime_contracts['missingOwners'] or severe_logs:
                                raise RuntimeError(f'JavaScript contract failure: {record["javascript"]}')
                        image_path = RUNTIME / f'{stem}-{variant}.png'
                        browser.screenshot(image_path)
                        images[variant] = Image.open(image_path)
                    changed, total, difference = changed_pixels(images['baseline'], images['current'])
                    difference.save(RUNTIME / f'{stem}-diff.png')
                    viewport_record.update(
                        render='ok',
                        changed_pixels=changed,
                        compared_pixels=total,
                        changed_percent=round(changed * 100 / total, 3),
                    )
                    if 'desktop' == viewport['id']:
                        record.update(viewport_record)
                except Exception as error:
                    viewport_record['render'] = 'failed'
                    viewport_record['error'] = str(error)
                record['viewports'][viewport['id']] = viewport_record
            record['render'] = 'ok' if all(result.get('render') == 'ok' for result in record['viewports'].values()) else 'failed'

    report['summary'] = {
        'declared_routes': len(entries),
        'captured_routes': sum(route.get('capture') == 'ok' for route in report['routes']),
        'rendered_routes': sum(route.get('render') == 'ok' for route in report['routes']),
        'failed_routes': sum(route.get('capture') == 'failed' or route.get('render') == 'failed' for route in report['routes']),
        'declared_comparisons': len(entries) * len(viewports),
        'rendered_comparisons': sum(
            result.get('render') == 'ok'
            for route in report['routes']
            for result in route.get('viewports', {}).values()
        ),
        'failed_comparisons': sum(
            result.get('render') == 'failed'
            for route in report['routes']
            for result in route.get('viewports', {}).values()
        ),
    }
    (RUNTIME / 'audit-report.json').write_text(json.dumps(report, indent=2, sort_keys=True) + '\n')
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ids', nargs='*', help='Audit only these manifest ids')
    args = parser.parse_args()
    entries = validate_manifest(json.loads(MANIFEST.read_text()))
    if args.ids:
        wanted = set(args.ids)
        entries = [entry for entry in entries if entry['id'] in wanted]
        missing = wanted - {entry['id'] for entry in entries}
        if missing:
            raise SystemExit('Unknown route ids: ' + ', '.join(sorted(missing)))
    report = audit(entries)
    print(json.dumps(report['summary'], sort_keys=True))
    return 1 if report['summary']['failed_routes'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
