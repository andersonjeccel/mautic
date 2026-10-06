#!/usr/bin/env python3
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'utils/bootstrap-compat/adapter/baseline/bootstrap-sass/bootstrap.js'
TARGET = ROOT / 'app/bundles/CoreBundle/Assets/js/1.bootstrap-compatibility.js'
EXPECTED_SHA256 = 'dbd2a35e72edc7d6bde483481a912f1c38aa57fab2747d9b071d317339ee03a2'
PLUGINS = (
    'alert',
    'button',
    'carousel',
    'collapse',
    'dropdown',
    'modal',
    'popover',
    'scrollspy',
    'tab',
    'tooltip',
    'affix',
)

source = SOURCE.read_bytes()
actual_sha256 = hashlib.sha256(source).hexdigest()
if actual_sha256 != EXPECTED_SHA256:
    raise SystemExit(f'Unexpected Bootstrap 3.4.1 source: {actual_sha256}')

plugin_properties = ','.join(f'{plugin}:jQuery.fn.{plugin}' for plugin in PLUGINS)
postlude = f'''\n;(function($) {{
  'use strict'

  var legacyPlugins = {{{plugin_properties}}}

  function restoreLegacyPlugins() {{
    $.extend($.fn, legacyPlugins)
  }}

  if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', function() {{
      restoreLegacyPlugins()
    }}, {{ once: true }})
  }} else {{
    restoreLegacyPlugins()
  }}

  var compatibility = Object.freeze({{
    ready: Promise.resolve(),
    version: '3.4.1',
    sourceSha256: '{EXPECTED_SHA256}',
    plugins: Object.freeze(Object.keys(legacyPlugins))
  }})
  window.Bootstrap3Compat = compatibility
  window.MauticBootstrapCompatibility = compatibility
}})(jQuery)\n'''

TARGET.write_bytes(source.rstrip() + b'\n' + postlude.encode())
print(f'{TARGET.relative_to(ROOT)} generated from Bootstrap 3.4.1 ({actual_sha256})')
