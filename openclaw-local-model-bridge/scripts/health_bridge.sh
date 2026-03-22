#!/usr/bin/env bash
set -euo pipefail

curl --noproxy '*' -fsS http://127.0.0.1:3099/health
