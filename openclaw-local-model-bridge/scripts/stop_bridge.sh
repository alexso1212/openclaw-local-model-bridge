#!/usr/bin/env bash
set -euo pipefail

PID_FILE="${HOME}/.openclaw/run/openclaw-local-model-bridge/bridge.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "bridge not running"
  exit 0
fi

PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -n "${PID}" ]] && kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
fi
rm -f "$PID_FILE"
echo "bridge stopped"
