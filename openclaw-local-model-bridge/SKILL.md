---
name: openclaw-local-model-bridge
version: 1.0.0
description: "Use when OpenClaw should use a local OpenAI-compatible bridge backed by Codex, Claude Code, or Gemini CLI subscriptions instead of provider API keys."
homepage: https://github.com/alexso1212/openclaw-local-model-bridge
metadata: {"openclaw":{"emoji":"🌉","category":"models","requires":{"bins":["node","codex","claude","gemini"]}}}
---

# OpenClaw Local Model Bridge

Use this skill when the user wants OpenClaw to use locally logged-in `Codex`, `Claude Code`, or `Gemini CLI` accounts through a local OpenAI-compatible bridge.

## What this skill does

- Starts the local bridge service from this repository
- Checks bridge health
- Stops the bridge
- Verifies local Codex / Claude / Gemini CLI auth before wiring OpenClaw

## Scope

- Single-user local machine only
- No shared gateway use
- No cookie scraping or web session replay

## Quick checks

Before using the bridge, verify the local CLIs can answer:

```bash
codex login status
claude auth status
gemini --version
```

## Start the bridge

```bash
"$HOME/.openclaw/skills/openclaw-local-model-bridge/scripts/start_bridge.sh"
```

## Health check

```bash
"$HOME/.openclaw/skills/openclaw-local-model-bridge/scripts/health_bridge.sh"
```

## Stop the bridge

```bash
"$HOME/.openclaw/skills/openclaw-local-model-bridge/scripts/stop_bridge.sh"
```

## Notes for OpenClaw configuration

If the task is to wire OpenClaw model providers to this bridge, read:

- `references/openclaw-provider-snippet.json`

If the local OpenClaw environment supports safe config rollback, use that guard before changing the main model provider config.
