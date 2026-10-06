#!/usr/bin/env python3
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'utils/bootstrap-compat/adapter/adapter.js'
TARGET = ROOT / 'app/bundles/CoreBundle/Assets/js/1.bootstrap-compatibility.js'

source = SOURCE.read_bytes()
TARGET.write_bytes(source)
print(
    f'{TARGET.relative_to(ROOT)} generated from {SOURCE.relative_to(ROOT)} '
    f'({hashlib.sha256(source).hexdigest()})'
)
