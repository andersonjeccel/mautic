#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'utils/bootstrap-compat/adapter/adapter.js'
TARGET = ROOT / 'app/bundles/CoreBundle/Assets/js/1.bootstrap-compatibility.js'

sources = json.loads(SOURCE.with_name('production-sources.json').read_text())
source = b'\n'.join(SOURCE.with_name(name).read_bytes() for name in sources)
TARGET.write_bytes(source)
print(
    f'{TARGET.relative_to(ROOT)} generated from {SOURCE.relative_to(ROOT)} '
    f'({hashlib.sha256(source).hexdigest()})'
)
