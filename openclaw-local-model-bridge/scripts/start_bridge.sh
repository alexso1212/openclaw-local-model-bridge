#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
RUNTIME_DIR="${HOME}/.openclaw/run/openclaw-local-model-bridge"
PID_FILE="${RUNTIME_DIR}/bridge.pid"
LOG_FILE="${RUNTIME_DIR}/bridge.log"
ROOT_HINT_FILE="${SKILL_DIR}/bridge-root.local.txt"

resolve_repo_dir() {
  local candidate=""

  if [[ -n "${OPENCLAW_LOCAL_MODEL_BRIDGE_REPO:-}" ]]; then
    candidate="${OPENCLAW_LOCAL_MODEL_BRIDGE_REPO}"
  elif [[ -f "$ROOT_HINT_FILE" ]]; then
    candidate="$(tr -d '\r\n' < "$ROOT_HINT_FILE")"
  else
    candidate="$(cd "$SKILL_DIR/.." && pwd -P)"
  fi

  if [[ -f "${candidate}/package.json" && -f "${candidate}/server.js" ]]; then
    printf '%s\n' "$candidate"
    return 0
  fi

  echo "cannot resolve bridge repo; set OPENCLAW_LOCAL_MODEL_BRIDGE_REPO or write $ROOT_HINT_FILE" >&2
  return 1
}

REPO_DIR="$(resolve_repo_dir)"

mkdir -p "$RUNTIME_DIR"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${PID}" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "bridge already running pid=${PID}"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

cd "$REPO_DIR"
PID="$(
  REPO_DIR="$REPO_DIR" LOG_FILE="$LOG_FILE" python3 - <<'PY'
import os
import subprocess

repo_dir = os.environ["REPO_DIR"]
log_file = os.environ["LOG_FILE"]
with open(log_file, "a", encoding="utf-8") as handle:
    proc = subprocess.Popen(
        ["node", "server.js"],
        cwd=repo_dir,
        stdin=subprocess.DEVNULL,
        stdout=handle,
        stderr=handle,
        start_new_session=True,
    )
    print(proc.pid)
PY
)"
echo "$PID" >"$PID_FILE"

for _ in $(seq 1 20); do
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "bridge failed to start; see $LOG_FILE"
    exit 1
  fi
  if curl --noproxy '*' -fsS http://127.0.0.1:3099/health >/dev/null 2>&1; then
    echo "bridge started pid=${PID}"
    echo "log=${LOG_FILE}"
    exit 0
  fi
  sleep 1
done

echo "bridge did not become healthy in time; see $LOG_FILE"
exit 1
