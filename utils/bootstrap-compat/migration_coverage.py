#!/usr/bin/env python3
"""Audit Bootstrap 3→4→5 migration contracts against Mautic consumers.

The contract list comes from Bootstrap's official 4.6 and 5.3 migration
documentation. This is a static safety net for UI states/routes not yet visited by
browser coverage; it complements, rather than replaces, visual and interaction
tests.
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = Path(__file__).with_name('migration-coverage-report.json')
SOURCE_ROOTS = [ROOT / 'app', ROOT / 'plugins', ROOT / 'themes']
CONSUMER_SUFFIXES = {'.php', '.twig', '.js', '.html'}

DOCS = {
    'bootstrap-4.6': 'https://getbootstrap.com/docs/4.6/migration/',
    'bootstrap-5.3': 'https://getbootstrap.com/docs/5.3/migration/',
}

# Group related removals/renames so one failure points to one migration decision.
CSS_CONTRACTS = {
    'bs3-grid-xs-and-offsets': ['col-xs-*', 'col-xs-offset-*', 'col-*-offset-*', 'col-*-push-*', 'col-*-pull-*'],
    'bs3-responsive-visibility': [
        'hidden-xs', 'hidden-sm', 'hidden-md', 'hidden-lg',
        'visible-xs', 'visible-sm', 'visible-md', 'visible-lg',
        'visible-xs-block', 'visible-xs-inline', 'visible-xs-inline-block',
        'visible-sm-block', 'visible-sm-inline', 'visible-sm-inline-block',
        'visible-md-block', 'visible-md-inline', 'visible-md-inline-block',
        'visible-lg-block', 'visible-lg-inline', 'visible-lg-inline-block',
    ],
    'bs3-image-utilities': ['img-responsive', 'img-rounded', 'img-circle'],
    'bs3-form-layout': ['control-label', 'help-block', 'form-horizontal', 'form-control-static', 'radio-inline', 'checkbox-inline'],
    'bs3-form-validation': ['has-error', 'has-warning', 'has-success'],
    'bs3-form-sizing': ['input-sm', 'input-lg'],
    'bs3-buttons': ['btn-default', 'btn-xs', 'btn-group-xs', 'btn-group-justified'],
    'bs3-floats-and-centering': ['pull-left', 'pull-right', 'center-block'],
    'bs3-panels': [
        'panel', 'panel-default', 'panel-primary', 'panel-success', 'panel-info',
        'panel-warning', 'panel-danger', 'panel-heading', 'panel-title',
        'panel-body', 'panel-footer', 'panel-group',
    ],
    'bs3-wells-thumbnails': ['well', 'well-*', 'thumbnail'],
    'bs3-tables': ['table-condensed'],
    'bs3-dropdown-markup': ['divider', 'caret', 'dropdown-menu-right'],
    'bs3-pagination': ['pager'],
    'bs3-progress-context': ['progress-bar-success', 'progress-bar-info', 'progress-bar-warning', 'progress-bar-danger'],
    'bs4-grid-gutters': ['no-gutters'],
    'bs4-media-object': ['media', 'media-body'],
    'bs4-table-head': ['thead-light', 'thead-dark'],
    'bs4-custom-forms': ['custom-control', 'custom-checkbox', 'custom-radio', 'custom-switch', 'custom-select', 'custom-file', 'custom-range'],
    'bs4-input-group-wrappers': ['input-group-append', 'input-group-prepend'],
    'bs4-form-layout': ['form-row', 'form-inline'],
    'bs4-button-block': ['btn-block'],
    'bs4-badges': ['badge-pill', 'badge-primary', 'badge-secondary', 'badge-success', 'badge-danger', 'badge-warning', 'badge-info', 'badge-light', 'badge-dark'],
    'bs4-card-layout': ['card-deck', 'card-columns'],
    'bs4-jumbotron': ['jumbotron', 'jumbotron-fluid'],
    'bs4-close-button': ['close'],
    'bs4-screen-reader': ['sr-only', 'sr-only-focusable'],
    'bs4-directional-utilities': ['float-left', 'float-right', 'text-left', 'text-right', 'border-left', 'border-right', 'rounded-left', 'rounded-right'],
    'bs4-spacing-utilities': ['ml-*', 'mr-*', 'pl-*', 'pr-*'],
    'bs4-typography-utilities': ['font-weight-*', 'font-italic', 'text-monospace', 'text-justify'],
    'bs4-responsive-embeds': ['embed-responsive', 'embed-responsive-*', 'embed-responsive-item'],
    'bs4-rounded-sizes': ['rounded-sm', 'rounded-lg'],
    'bs4-dropdown-alignment': ['dropdown-menu-left', 'dropdown-menu-right'],
    'bs4-carousel-direction': ['carousel-item-left', 'carousel-item-right', 'carousel-item-next', 'carousel-item-prev'],
}

BRIDGE = 'app/bundles/CoreBundle/Assets/js/1.bootstrap-compatibility.js'
ROUTER_SOURCE = 'utils/bootstrap-compat/adapter/adapter.js'
BRIDGE_TESTS = 'utils/bootstrap-compat/test_minimal_javascript.py'
DIFFERENTIAL_TESTS = 'utils/bootstrap-compat/adapter/test_adapter.py'
INTERACTION_TESTS = 'utils/bootstrap-compat/routes/test_interactions.py'

JS_DIFFERENTIAL_CONTRACTS = {
    'collapse': {
        'methods': {
            'hide': 'test_collapse_dropdown_tab_and_button_use_native_instances',
            'show': 'test_collapse_dropdown_tab_and_button_use_native_instances',
        },
        'options': {},
    },
    'modal': {
        'methods': {
            'hide': 'test_modal_options_and_methods_are_routed_without_legacy_class_logic',
            'init': 'test_modal_options_and_methods_are_routed_without_legacy_class_logic',
            'show': 'test_modal_options_and_methods_are_routed_without_legacy_class_logic',
        },
        'options': {
            'backdrop': 'test_modal_options_and_methods_are_routed_without_legacy_class_logic',
            'keyboard': 'test_modal_options_and_methods_are_routed_without_legacy_class_logic',
            'show': 'test_modal_default_show_is_routed_to_bootstrap_5',
        },
    },
    'popover': {
        'methods': {
            'hide': 'test_popover_content_is_consumed_by_bootstrap_5',
            'init': 'test_popover_content_is_consumed_by_bootstrap_5',
        },
        'options': {
            'content': 'test_popover_content_is_consumed_by_bootstrap_5',
            'sanitize': 'test_popover_content_is_consumed_by_bootstrap_5',
        },
    },
    'tab': {
        'methods': {'show': 'test_collapse_dropdown_tab_and_button_use_native_instances'},
        'options': {},
    },
    'tooltip': {
        'methods': {
            'destroy': 'test_tooltip_options_and_destroy_are_routed',
            'fixTitle': 'test_fix_title_is_routed_through_bootstrap_5_data',
            'hide': 'test_tooltip_options_and_destroy_are_routed',
            'init': 'test_tooltip_options_and_destroy_are_routed',
            'show': 'test_tooltip_options_and_destroy_are_routed',
        },
        'options': {
            'container': 'test_tooltip_options_and_destroy_are_routed',
            'html': 'test_tooltip_options_and_destroy_are_routed',
            'placement': 'test_tooltip_options_and_destroy_are_routed',
        },
    },
}

DATA_TOGGLE_DIFFERENTIAL_CONTRACTS = {
    'button': 'test_collapse_dropdown_tab_and_button_use_native_instances',
    'buttons': 'test_collapse_dropdown_tab_and_button_use_native_instances',
    'collapse': 'test_collapse_dropdown_tab_and_button_use_native_instances',
    'dropdown': 'test_collapse_dropdown_tab_and_button_use_native_instances',
    'modal': 'test_legacy_data_attributes_are_mirrored_to_bootstrap_5',
    'popover': 'test_popover_content_is_consumed_by_bootstrap_5',
    'tab': 'test_collapse_dropdown_tab_and_button_use_native_instances',
    'tooltip': 'test_tooltip_options_and_destroy_are_routed',
}

# This is a reviewed contract allow-list, not an owner-file substring check. A
# new consumed method or option must be classified here and backed by evidence.
JS_SUPPORT_MANIFEST = {
    'alert': {'mode': 'native-or-review-required', 'methods': [], 'options': [], 'evidence': []},
    'button': {
        'mode': 'bridge', 'owner': BRIDGE, 'methods': ['init', 'toggle'], 'options': [],
        'evidence': [BRIDGE, BRIDGE_TESTS],
    },
    'carousel': {'mode': 'native-or-review-required', 'methods': [], 'options': [], 'evidence': []},
    'collapse': {
        'mode': 'bridge', 'owner': BRIDGE, 'methods': ['hide', 'init', 'show', 'toggle'],
        'options': ['parent', 'toggle'], 'evidence': [BRIDGE, BRIDGE_TESTS, INTERACTION_TESTS],
    },
    'dropdown': {
        'mode': 'bridge', 'owner': BRIDGE,
        'methods': ['dispose', 'hide', 'init', 'show', 'toggle', 'update'],
        'options': ['autoClose', 'boundary', 'display', 'offset', 'popperConfig', 'reference'],
        'evidence': [BRIDGE, BRIDGE_TESTS, INTERACTION_TESTS],
    },
    'modal': {
        'mode': 'bridge', 'owner': BRIDGE,
        'methods': ['dispose', 'handleUpdate', 'hide', 'init', 'show', 'toggle'],
        'options': ['backdrop', 'keyboard', 'show'],
        'evidence': [BRIDGE, BRIDGE_TESTS, INTERACTION_TESTS],
    },
    'popover': {
        'mode': 'bridge', 'owner': BRIDGE,
        'methods': ['destroy', 'dispose', 'hide', 'init', 'show', 'toggle'],
        'options': [
            'animation', 'container', 'content', 'delay', 'html', 'placement', 'sanitize',
            'title', 'trigger',
        ],
        'evidence': [BRIDGE, BRIDGE_TESTS, INTERACTION_TESTS],
    },
    'scrollspy': {'mode': 'native-or-review-required', 'methods': [], 'options': [], 'evidence': []},
    'tab': {
        'mode': 'bridge', 'owner': BRIDGE, 'methods': ['dispose', 'init', 'show'], 'options': [],
        'evidence': [BRIDGE, BRIDGE_TESTS, INTERACTION_TESTS],
    },
    'toast': {'mode': 'native-or-review-required', 'methods': [], 'options': [], 'evidence': []},
    'tooltip': {
        'mode': 'bridge', 'owner': BRIDGE,
        'methods': ['destroy', 'dispose', 'fixTitle', 'hide', 'init', 'show', 'toggle'],
        'options': [
            'animation', 'container', 'delay', 'html', 'placement', 'title', 'trigger',
        ],
        'evidence': [BRIDGE, BRIDGE_TESTS, INTERACTION_TESTS],
    },
}

DATA_ATTRIBUTES = [
    'data-toggle', 'data-dismiss', 'data-target', 'data-parent', 'data-backdrop',
    'data-keyboard', 'data-placement', 'data-container', 'data-trigger',
    'data-spy', 'data-ride', 'data-slide', 'data-slide-to',
]

SEMANTIC_CONTRACTS = {
    'global-box-sizing-border-box': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/test_detector.py']},
    'grid-flexbox-gutters-breakpoints': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/routes/test_geometry.py']},
    'rfs-responsive-font-sizing': {'status': 'covered', 'evidence': ['app/bundles/CoreBundle/Assets/css/app.scss']},
    'form-control-layout-validation': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/routes/manifest.json']},
    'custom-form-control-consolidation': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/migration_coverage.py', 'utils/bootstrap-compat/test_migration_coverage.py']},
    'jquery-plugin-lifecycle-and-events': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/adapter/test_adapter.py']},
    'tooltip-popover-popper2-config': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/adapter/test_adapter.py']},
    'legacy-data-attribute-namespace': {'status': 'covered', 'evidence': ['app/bundles/CoreBundle/Assets/js/1.bootstrap-compatibility.js']},
    'column-position-relative-removal': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/routes/test_semantics.py']},
    'nested-table-style-inheritance': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/routes/test_semantics.py']},
    'global-link-underline-and-list-padding': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/routes/test_semantics.py']},
    'rtl-logical-directional-behavior': {'status': 'accepted', 'evidence': ['utils/bootstrap-compat/routes/test_semantics.py', 'app/bundles/CoreBundle/Resources/views/Default/base.html.twig']},
    'print-display-semantics': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/routes/test_semantics.py']},
    'close-button-markup-and-accessibility': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/test_markup_accessibility.py']},
    'accordion-markup-and-multi-target-collapse': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/adapter/test_adapter.py']},
    'navbar-container-and-active-link-structure': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/routes/test_semantics.py']},
    'input-group-validation-sizing': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/test_markup_accessibility.py']},
    'form-label-and-help-text-display': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/test_markup_accessibility.py']},
    'progress-role-and-aria-placement': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/test_markup_accessibility.py']},
    'dropdown-event-target-autoclose-and-popper': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/adapter/test_adapter.py']},
    'modal-remote-option-and-loaded-event-removal': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/adapter/test_adapter.py']},
    'reduced-motion-animation-contract': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/routes/test_semantics.py']},
    'color-mode-css-variable-effects': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/routes/test_semantics.py']},
    'sass-variable-map-function-renames': {'status': 'covered', 'evidence': ['utils/bootstrap-compat/sass_coverage.py']},
}


def pattern_regex(pattern: str) -> re.Pattern[str]:
    escaped = re.escape(pattern).replace(r'\*', r'[A-Za-z0-9_-]+')
    return re.compile(r'^' + escaped + r'$')


def consumer_files() -> list[Path]:
    return [
        path
        for base in SOURCE_ROOTS
        for path in base.rglob('*')
        if path.is_file()
        and path.suffix in CONSUMER_SUFFIXES
        and 'node_modules' not in path.parts
        and 'vendor' not in path.parts
        and 'media' not in path.parts
        and 'Demo' not in path.parts
    ]


def extract_class_tokens(text: str) -> set[str]:
    tokens: set[str] = set()
    patterns = [
        r'\bclass(?:Name)?\s*=\s*["\']([^"\']+)["\']',
        r'["\']class["\']\s*=>\s*["\']([^"\']+)["\']',
        r'\.(?:addClass|removeClass|toggleClass|hasClass)\(\s*["\']([^"\']+)["\']',
    ]
    for pattern in patterns:
        for value in re.findall(pattern, text):
            for token in re.split(r'\s+', value.strip()):
                if token and not any(char in token for char in '{}$()'):
                    tokens.add(token)
    return tokens


def javascript_code_positions(text: str) -> list[bool]:
    """Mark positions that are executable code rather than comments/strings."""
    code = [True] * len(text)
    index = 0
    while index < len(text):
        if text.startswith('//', index):
            end = text.find('\n', index + 2)
            end = len(text) if end < 0 else end
            for position in range(index, end):
                code[position] = False
            index = end
            continue
        if text.startswith('/*', index):
            end = text.find('*/', index + 2)
            end = len(text) if end < 0 else end + 2
            for position in range(index, end):
                code[position] = False
            index = end
            continue
        if text[index] in {'\'', '"', '`'}:
            quote = text[index]
            code[index] = False
            index += 1
            while index < len(text):
                code[index] = False
                if text[index] == '\\':
                    index += 1
                    if index < len(text):
                        code[index] = False
                elif text[index] == quote:
                    index += 1
                    break
                index += 1
            continue
        index += 1
    return code


def find_closing_delimiter(text: str, start: int, opening: str, closing: str) -> int | None:
    depth = 0
    index = start
    while index < len(text):
        char = text[index]
        if text.startswith('//', index):
            newline = text.find('\n', index + 2)
            index = len(text) if newline < 0 else newline
            continue
        if text.startswith('/*', index):
            end = text.find('*/', index + 2)
            index = len(text) if end < 0 else end + 2
            continue
        if char in {'\'', '"', '`'}:
            quote = char
            index += 1
            while index < len(text):
                if text[index] == '\\':
                    index += 2
                    continue
                if text[index] == quote:
                    index += 1
                    break
                index += 1
            continue
        if char == opening:
            depth += 1
        elif char == closing:
            depth -= 1
            if depth == 0:
                return index
        index += 1
    return None


def split_top_level(text: str, delimiter: str = ',') -> list[str]:
    parts = []
    start = 0
    stack: list[str] = []
    pairs = {')': '(', ']': '[', '}': '{'}
    index = 0
    while index < len(text):
        char = text[index]
        if char in {'\'', '"', '`'}:
            quote = char
            index += 1
            while index < len(text):
                if text[index] == '\\':
                    index += 2
                    continue
                if text[index] == quote:
                    break
                index += 1
        elif char in '([{':
            stack.append(char)
        elif char in pairs and stack and stack[-1] == pairs[char]:
            stack.pop()
        elif char == delimiter and not stack:
            parts.append(text[start:index].strip())
            start = index + 1
        index += 1
    parts.append(text[start:].strip())
    return parts


def object_option_keys(argument: str) -> tuple[list[str], bool]:
    argument = strip_javascript_comments(argument)
    closing = find_closing_delimiter(argument, 0, '{', '}')
    if closing is None or argument[closing + 1:].strip():
        return [], True
    keys = []
    for entry in split_top_level(argument[1:closing]):
        if not entry:
            continue
        if entry.startswith('...') or entry.startswith('['):
            return [], True
        match = re.match(r"(?:(['\"])(.*?)\1|([A-Za-z_$][\w$-]*))\s*:", entry, re.S)
        if not match:
            return [], True
        keys.append(match.group(2) if match.group(1) else match.group(3))
    return sorted(set(keys)), False


def strip_javascript_comments(text: str) -> str:
    output = list(text)
    index = 0
    while index < len(text):
        if text.startswith('//', index):
            end = text.find('\n', index + 2)
            end = len(text) if end < 0 else end
            for position in range(index, end):
                output[position] = ' '
            index = end
            continue
        if text.startswith('/*', index):
            end = text.find('*/', index + 2)
            end = len(text) if end < 0 else end + 2
            for position in range(index, end):
                output[position] = ' '
            index = end
            continue
        if text[index] in {'\'', '"', '`'}:
            quote = text[index]
            index += 1
            while index < len(text):
                if text[index] == '\\':
                    index += 2
                    continue
                if text[index] == quote:
                    index += 1
                    break
                index += 1
            continue
        index += 1
    return ''.join(output)


def static_object_bindings(text: str) -> dict[str, str]:
    bindings = {}
    pattern = re.compile(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*{')
    code_positions = javascript_code_positions(text)
    for match in pattern.finditer(text):
        if not code_positions[match.start()]:
            continue
        opening = match.end() - 1
        closing = find_closing_delimiter(text, opening, '{', '}')
        if closing is not None:
            bindings[match.group(1)] = text[opening:closing + 1]
    return bindings


def jquery_receivers(text: str) -> set[str]:
    receivers = {'mQuery', 'jQuery', '$'}
    assignment = re.compile(
        r'((?:this\.)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*=\s*(?:mQuery|jQuery|\$)\s*\('
    )
    for match in assignment.finditer(text):
        receivers.add(match.group(1))
    return receivers


def is_jquery_receiver(text: str, access_start: int, receivers: set[str]) -> bool:
    prefix = text[:access_start]
    direct = re.search(r'((?:this\.)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*$', prefix)
    if direct and (direct.group(1) in receivers or direct.group(1).startswith('$')):
        return True
    statement_start = max(prefix.rfind(';'), prefix.rfind('\n'), prefix.rfind('{'), prefix.rfind('}')) + 1
    statement = prefix[statement_start:]
    return bool(
        re.search(r'(?:mQuery|jQuery|\$)\s*\(', statement)
        or any(statement.lstrip().startswith(receiver + '.') for receiver in receivers)
    )


def classify_plugin_argument(argument: str, bindings: dict[str, str] | None = None) -> dict[str, object]:
    argument = argument.strip()
    if not argument:
        return {'method': 'init', 'options': [], 'dynamic': False}
    if bindings and argument in bindings:
        argument = bindings[argument]
    if argument.startswith('{'):
        options, dynamic = object_option_keys(argument)
        result: dict[str, object] = {'method': 'init' if not dynamic else None, 'options': options, 'dynamic': dynamic}
        if dynamic:
            result['argument'] = re.sub(r'\s+', ' ', argument)[:160]
        return result
    try:
        literal = ast.literal_eval(argument)
    except (SyntaxError, ValueError):
        literal = None
    if isinstance(literal, str):
        return {'method': literal, 'options': [], 'dynamic': False}
    return {
        'method': None,
        'options': [],
        'dynamic': True,
        'argument': re.sub(r'\s+', ' ', argument)[:160],
    }


def extract_jquery_plugin_calls(
    text: str,
    source_file: str,
    *,
    jquery_only: bool = False,
) -> list[dict[str, object]]:
    code_positions = javascript_code_positions(text)
    bindings = static_object_bindings(text)
    receivers = jquery_receivers(text)
    calls = []
    for plugin in JS_SUPPORT_MANIFEST:
        access = re.compile(
            r'(?:\.\s*' + re.escape(plugin) + r'|\[\s*(["\'])' + re.escape(plugin) + r'\1\s*\])\s*\('
        )
        for match in access.finditer(text):
            if not code_positions[match.start()]:
                continue
            if jquery_only and not is_jquery_receiver(text, match.start(), receivers):
                continue
            opening = match.end() - 1
            closing = find_closing_delimiter(text, opening, '(', ')')
            if closing is None:
                calls.append({
                    'plugin': plugin,
                    'method': None,
                    'options': [],
                    'dynamic': True,
                    'sourceFile': source_file,
                    'argument': '<unclosed-call>',
                })
                continue
            call = {
                'plugin': plugin,
                **classify_plugin_argument(text[opening + 1:closing], bindings),
                'sourceFile': source_file,
            }
            calls.append(call)
    return sorted(calls, key=lambda call: (str(call['sourceFile']), text.find('.' + str(call['plugin']))))


def compiled_css_path() -> Path:
    manifest = json.loads((ROOT / 'assets/build/manifest.json').read_text())
    return ROOT / manifest['css/app.scss'].lstrip('/')


def compiled_css() -> str:
    return compiled_css_path().read_text(errors='replace')


def analyzed_input_digest(root: Path, source_files: list[Path], css_path: Path) -> dict[str, object]:
    paths = sorted([*source_files, css_path], key=lambda path: str(path.relative_to(root)))
    aggregate = hashlib.sha256()
    for path in paths:
        relative = str(path.relative_to(root)).replace('\\', '/')
        content = path.read_bytes()
        aggregate.update(relative.encode())
        aggregate.update(b'\0')
        aggregate.update(hashlib.sha256(content).digest())
        aggregate.update(b'\0')
    css_content = css_path.read_bytes()
    return {
        'fileCount': len(paths),
        'sha256': aggregate.hexdigest(),
        'compiledCss': {
            'path': str(css_path.relative_to(root)).replace('\\', '/'),
            'sha256': hashlib.sha256(css_content).hexdigest(),
        },
    }


def javascript_plugin_result(
    plugin: str,
    calls: list[dict[str, object]],
    support: dict[str, object],
) -> dict[str, object]:
    uses = sorted({str(call['sourceFile']) for call in calls})
    methods: dict[str, set[str]] = {}
    options: dict[str, set[str]] = {}
    dynamic_calls = []
    for call in calls:
        if call['dynamic']:
            dynamic_calls.append({
                'sourceFile': call['sourceFile'],
                'argument': call.get('argument', '<unclassified>'),
            })
            continue
        method = str(call['method'])
        methods.setdefault(method, set()).add(str(call['sourceFile']))
        for option in list(call['options']):
            options.setdefault(str(option), set()).add(str(call['sourceFile']))

    if support['mode'] == 'native-or-review-required':
        unsupported_methods = []
        unsupported_options = []
    else:
        unsupported_methods = sorted(set(methods) - set(support['methods']))
        unsupported_options = sorted(set(options) - set(support['options']))

    differential = JS_DIFFERENTIAL_CONTRACTS.get(plugin, {'methods': {}, 'options': {}})
    differential_source = (ROOT / DIFFERENTIAL_TESTS).read_text()
    untested_methods = sorted(
        method for method in methods
        if method not in differential['methods']
        or f"def {differential['methods'][method]}(" not in differential_source
    )
    untested_options = sorted(
        option for option in options
        if option not in differential['options']
        or f"def {differential['options'][option]}(" not in differential_source
    )

    if not calls:
        status = 'unused'
    elif support['mode'] == 'native-or-review-required':
        status = 'review-required'
    elif dynamic_calls or unsupported_methods or unsupported_options or untested_methods or untested_options:
        status = 'uncovered'
    else:
        status = 'covered'

    return {
        'plugin': plugin,
        'uses': len(uses),
        'sampleFiles': uses[:10],
        'observedMethods': [
            {'method': method, 'sourceFiles': sorted(source_files)}
            for method, source_files in sorted(methods.items())
        ],
        'observedOptions': [
            {'option': option, 'sourceFiles': sorted(source_files)}
            for option, source_files in sorted(options.items())
        ],
        'dynamicCalls': dynamic_calls,
        'unsupportedMethods': unsupported_methods,
        'unsupportedOptions': unsupported_options,
        'untestedMethods': untested_methods,
        'untestedOptions': untested_options,
        'differentialTests': differential,
        'support': support,
        'status': status,
    }


def css_has_selector(css: str, token: str) -> bool:
    return bool(re.search(r'\.' + re.escape(token) + r'(?![A-Za-z0-9_-])', css))


def blocking_failures(summary: dict[str, int], strict_semantic: bool) -> int:
    failures = (
        summary['uncoveredCssContracts']
        + summary['reviewRequiredJavascriptPlugins']
        + summary['uncoveredJavascriptPlugins']
        + summary['unsupportedJavascriptContracts']
        + summary['dynamicJavascriptCalls']
        + summary['uncoveredDataAttributes']
        + summary.get('uncoveredDataToggleContracts', 0)
        + summary.get('invalidJavascriptRouter', 0)
    )
    if strict_semantic:
        failures += summary['pendingSemanticContracts']
    return failures


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--strict-semantic', action='store_true', help='Fail on pending semantic contracts too.')
    args = parser.parse_args()

    files = consumer_files()
    classes: dict[str, list[str]] = {}
    plugin_calls: dict[str, list[dict[str, object]]] = {name: [] for name in JS_SUPPORT_MANIFEST}
    attributes: dict[str, list[str]] = {name: [] for name in DATA_ATTRIBUTES}
    data_toggles: dict[str, list[str]] = {name: [] for name in DATA_TOGGLE_DIFFERENTIAL_CONTRACTS}

    for path in files:
        relative = str(path.relative_to(ROOT))
        text = path.read_text(errors='replace')
        for token in extract_class_tokens(text):
            classes.setdefault(token, []).append(relative)
        if path.suffix == '.js' and relative != BRIDGE:
            for call in extract_jquery_plugin_calls(text, relative, jquery_only=True):
                plugin_calls[str(call['plugin'])].append(call)
        for attribute in DATA_ATTRIBUTES:
            if re.search(re.escape(attribute) + r'\s*=', text):
                attributes[attribute].append(relative)
        for toggle in re.findall(r'data-toggle\s*=\s*["\']([^"\']+)', text):
            if toggle in data_toggles:
                data_toggles[toggle].append(relative)

    css = compiled_css()
    css_results = []
    for contract, patterns in CSS_CONTRACTS.items():
        matched = sorted({token for token in classes for pattern in patterns if pattern_regex(pattern).match(token)})
        uncovered = [token for token in matched if not css_has_selector(css, token)]
        css_results.append({
            'contract': contract,
            'patterns': patterns,
            'usedClasses': matched,
            'uncoveredClasses': uncovered,
            'sampleFiles': {token: sorted(set(classes[token]))[:5] for token in matched},
            'status': 'uncovered' if uncovered else ('covered' if matched else 'unused'),
        })

    bridge_bytes = (ROOT / BRIDGE).read_bytes()
    router_path = ROOT / ROUTER_SOURCE
    sources = json.loads(router_path.with_name('production-sources.json').read_text())
    router_bytes = b'\n'.join(router_path.with_name(name).read_bytes() for name in sources)
    exact_router = bridge_bytes == router_bytes
    bridge = bridge_bytes.decode()
    js_results = [
        javascript_plugin_result(plugin, plugin_calls[plugin], support)
        for plugin, support in JS_SUPPORT_MANIFEST.items()
    ]

    attr_results = []
    for attribute, paths in attributes.items():
        uses = sorted(set(paths))
        short = attribute.removeprefix('data-')
        mapped_attribute = re.search(r"'" + re.escape(short) + r"'", bridge) is not None
        status = 'unused' if not uses else ('covered' if exact_router and mapped_attribute else 'uncovered')
        attr_results.append({'attribute': attribute, 'uses': len(uses), 'sampleFiles': uses[:10], 'status': status})

    differential_source = (ROOT / DIFFERENTIAL_TESTS).read_text()
    data_toggle_results = []
    for toggle, test_name in DATA_TOGGLE_DIFFERENTIAL_CONTRACTS.items():
        uses = sorted(set(data_toggles[toggle]))
        test_exists = f'def {test_name}(' in differential_source
        data_toggle_results.append({
            'toggle': toggle,
            'uses': len(uses),
            'sampleFiles': uses[:10],
            'differentialTest': test_name,
            'status': 'unused' if not uses else ('covered' if test_exists else 'uncovered'),
        })

    report = {
        'schemaVersion': 2,
        'officialDocs': DOCS,
        'scope': 'Static source consumers plus compiled application CSS. Runtime and visual gates remain required.',
        'analyzedInputs': analyzed_input_digest(ROOT, files, compiled_css_path()),
        'cssContracts': css_results,
        'javascriptPlugins': js_results,
        'legacyDataAttributes': attr_results,
        'legacyDataToggleContracts': data_toggle_results,
        'semanticContracts': SEMANTIC_CONTRACTS,
        'summary': {
            'sourceFiles': len(files),
            'usedLegacyCssContracts': sum(row['status'] != 'unused' for row in css_results),
            'uncoveredCssContracts': sum(row['status'] == 'uncovered' for row in css_results),
            'reviewRequiredJavascriptPlugins': sum(row['status'] == 'review-required' for row in js_results),
            'uncoveredJavascriptPlugins': sum(row['status'] == 'uncovered' for row in js_results),
            'unsupportedJavascriptContracts': sum(
                len(row['unsupportedMethods']) + len(row['unsupportedOptions']) for row in js_results
            ),
            'dynamicJavascriptCalls': sum(len(row['dynamicCalls']) for row in js_results),
            'uncoveredDataAttributes': sum(row['status'] == 'uncovered' for row in attr_results),
            'uncoveredDataToggleContracts': sum(
                row['status'] == 'uncovered' for row in data_toggle_results
            ),
            'invalidJavascriptRouter': 0 if exact_router else 1,
            'pendingSemanticContracts': sum(row['status'] == 'pending' for row in SEMANTIC_CONTRACTS.values()),
        },
    }
    REPORT.write_text(json.dumps(report, indent=2, sort_keys=True) + '\n')
    print(json.dumps(report['summary'], sort_keys=True))

    return 1 if blocking_failures(report['summary'], args.strict_semantic) else 0


if __name__ == '__main__':
    raise SystemExit(main())
