#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p cycle
if [[ $# -eq 0 || "$1" == tests ]]; then
    if [[ $# -gt 0 ]]; then shift; fi
    python3 -m unittest test_detector -v "$@" 2>&1 | tee cycle/final-tests.log
    python3 -c 'import json; from pathlib import Path; d=json.loads(Path("cycle/tests-latest.json").read_text()); print(json.dumps({"legacy_detector_summary":d["summary"],"browserVersion":d["browser"]["capabilities"]["browserVersion"]},indent=2))'
else
    python3 cycle/run.py "$@"
fi

