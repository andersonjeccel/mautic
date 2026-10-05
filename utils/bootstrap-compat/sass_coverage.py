#!/usr/bin/env python3
"""Validate the Bootstrap 3/4 Sass compatibility surface used by Mautic."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = Path(__file__).with_name('sass-coverage-report.json')
SCAN_ROOTS = [ROOT / 'app', ROOT / 'plugins', ROOT / 'themes']

DIRECT_ALIASES = {
    'border-radius-base': 'border-radius',
    'border-radius-large': 'border-radius-lg',
    'border-radius-small': 'border-radius-sm',
    'brand-danger': 'danger',
    'brand-info': 'info',
    'brand-success': 'success',
    'brand-warning': 'warning',
    'btn-border-radius-base': 'btn-border-radius',
    'container-lg': 'container-large-desktop',
    'container-md': 'container-desktop',
    'container-sm': 'container-tablet',
    'dropdown-border': 'dropdown-border-color',
    'gray-dark': 'gray-800',
    'input-bg-disabled': 'input-disabled-bg',
    'label-default-bg': 'gray-light',
    'line-height-large': 'line-height-lg',
    'line-height-small': 'line-height-sm',
    'list-group-link-color': 'list-group-action-color',
    'list-group-link-hover-color': 'list-group-action-hover-color',
    'nav-pills-active-link-hover-bg': 'nav-pills-link-active-bg',
    'nav-tabs-active-link-hover-color': 'nav-tabs-link-active-color',
    'panel-default-border': 'panel-inner-border',
    'screen-lg-min': 'screen-lg',
    'screen-md-min': 'screen-md',
    'screen-sm-min': 'screen-sm',
    'text-color': 'body-color',
    'zindex-navbar': 'zindex-sticky',
}

SEMANTIC_TOKENS = {
    'container-desktop', 'cursor-disabled', 'dropdown-fallback-border',
    'font-size-large', 'font-size-small', 'input-height-base',
    'input-height-large', 'input-height-small', 'line-height-computed',
    'list-group-link-heading-color', 'nav-link-hover-bg', 'nav-link-padding',
    'navbar-height', 'padding-base-horizontal', 'padding-base-vertical',
    'padding-large-horizontal', 'padding-large-vertical',
    'padding-small-horizontal', 'padding-small-vertical', 'screen-xs-max',
    'state-danger-text', 'state-success-text', 'state-warning-text',
}

LEGACY_MIXINS = {
    'border-left-radius', 'border-right-radius', 'container-fixed',
    'gradient-vertical', 'label-variant', 'make-grid', 'opacity',
    'perspective', 'placeholder', 'progress-bar-variant', 'scale', 'size',
    'square', 'tab-focus', 'text-overflow', 'translate3d', 'user-select',
}


def scss_files() -> list[Path]:
    result = []
    for base in SCAN_ROOTS:
        for path in base.rglob('*.scss'):
            if any(part in {'node_modules', 'vendor'} for part in path.parts):
                continue
            try:
                path.read_text()
            except UnicodeDecodeError:
                continue
            result.append(path)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--no-compile', action='store_true')
    args = parser.parse_args()

    files = scss_files()
    declarations: dict[str, list[str]] = {}
    usages: dict[str, list[str]] = {}
    mixin_definitions: dict[str, list[str]] = {}
    mixin_usages: dict[str, list[str]] = {}

    for path in files:
        relative = str(path.relative_to(ROOT))
        text = path.read_text()
        for name in re.findall(r'^\s*\$([\w-]+)\s*:', text, re.MULTILINE):
            declarations.setdefault(name, []).append(relative)
        for name in set(re.findall(r'\$([\w-]+)', text)):
            usages.setdefault(name, []).append(relative)
        for name in re.findall(r'@mixin\s+([\w-]+)', text):
            mixin_definitions.setdefault(name, []).append(relative)
        for name in re.findall(r'@include\s+([\w-]+)', text):
            mixin_usages.setdefault(name, []).append(relative)

    variables = sorted(set(DIRECT_ALIASES) | SEMANTIC_TOKENS)
    missing_variables = [name for name in variables if name in usages and name not in declarations]
    missing_alias_targets = [target for target in DIRECT_ALIASES.values() if target not in declarations]
    missing_mixins = [name for name in LEGACY_MIXINS if name in mixin_usages and name not in mixin_definitions]

    compile_result = {'status': 'skipped', 'deprecationWarnings': 0, 'output': ''}
    if not args.no_compile:
        process = subprocess.run(
            ['ddev', 'exec', 'php', 'bin/console', 'sass:build', '-vvv'],
            cwd=ROOT,
            text=True,
            capture_output=True,
            timeout=300,
        )
        output = process.stdout + process.stderr
        compile_result = {
            'status': 'ok' if process.returncode == 0 else 'failed',
            'deprecationWarnings': output.count('DEPRECATION WARNING'),
            'output': output[-12000:],
        }

    report = {
        'schemaVersion': 1,
        'scssFiles': len(files),
        'variables': {
            name: {
                'strategy': 'direct-alias' if name in DIRECT_ALIASES else 'mautic-semantic-token',
                'replacement': DIRECT_ALIASES.get(name),
                'definitions': sorted(set(declarations.get(name, []))),
                'consumers': sorted(set(usages.get(name, []))),
            }
            for name in variables
        },
        'legacyMixins': {
            name: {
                'definitions': sorted(set(mixin_definitions.get(name, []))),
                'consumers': sorted(set(mixin_usages.get(name, []))),
            }
            for name in sorted(LEGACY_MIXINS)
        },
        'missingVariables': missing_variables,
        'missingAliasTargets': sorted(set(missing_alias_targets)),
        'missingMixins': missing_mixins,
        'compile': compile_result,
    }
    REPORT.write_text(json.dumps(report, indent=2, sort_keys=True) + '\n')
    summary = {
        'scssFiles': len(files),
        'missingVariables': len(missing_variables),
        'missingAliasTargets': len(set(missing_alias_targets)),
        'missingMixins': len(missing_mixins),
        'deprecationWarnings': compile_result['deprecationWarnings'],
        'compileStatus': compile_result['status'],
    }
    print(json.dumps(summary, sort_keys=True))

    return 1 if (
        missing_variables
        or missing_alias_targets
        or missing_mixins
        or compile_result['status'] == 'failed'
        or compile_result['deprecationWarnings']
    ) else 0


if __name__ == '__main__':
    raise SystemExit(main())
