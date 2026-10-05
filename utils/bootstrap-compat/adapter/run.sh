#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd -- "$(dirname -- "$0")" && pwd)"
cd -- "$HERE"
mkdir -p logs
# The test harness acquires flock once. Do NOT wrap this command in flock.
python3 inventory.py > logs/inventory.log
python3 -u test_adapter.py "$@" 2>&1 | tee logs/final-tests.log
python3 report.py
