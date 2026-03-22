# OpenClaw Local Model Bridge

Local OpenAI-compatible bridge for OpenClaw that reuses locally logged-in official CLIs instead of direct API keys.

Current bridge lines:

- `gpt-5.1-codex-max` via Codex CLI login
- `gpt-5.4` via Codex CLI login
- `claude-sonnet-4-5` via Claude Code login
- `claude-opus-4-6` via Claude Code login
- `gemini-2.5-pro` via Gemini CLI login
- `gemini-2.5-flash` via Gemini CLI login

This repository is the service-first base. It also includes an OpenClaw skill wrapper under [`openclaw-local-model-bridge/`](./openclaw-local-model-bridge) so the project can later be packaged as a community mod.

## Why this exists

The goal is to make bridge-based model access look like a reusable OpenClaw mod:

- install one project
- expose a dynamic model catalog
- let dashboards discover login status and available bridge models
- avoid hand-editing JSON for every machine

## Quick Start

Install dependencies:

```bash
npm install
```

Start the bridge:

```bash
npm start
```

Check the dynamic bridge catalog:

```bash
npm run status
```

Run tests:

```bash
npm test
```

## Service Surface

The local service exposes:

- `GET /health`
- `GET /v1/models`
- `POST /v1/chat/completions`

The service listens on `127.0.0.1:3099` by default.

## Model Catalog For Dashboards

Dashboards should not hardcode model cards. They should read the bridge catalog:

```bash
node bridge-status.js
```

That JSON includes:

- mod metadata
- provider install / auth state
- bridge model list
- family / variant / preset catalog for dashboards
- suggested login / status actions per provider

## Auth Expectations

- Codex: uses local `codex login`
- Claude Code: uses local `claude auth login`
- Gemini: uses local `gemini` CLI sign-in flow

This project detects Codex and Claude auth non-interactively today. Gemini install can be detected; auth may still require manual confirmation through the CLI.

## Selection Model

The bridge is moving toward a three-level selection structure for dashboards:

- family
- variant
- preset

Today that already includes:

- Codex family with a validated `gpt-5.1-codex-max` variant
- a legacy local `gpt-5.4` preset kept for compatibility during migration
- Claude family with `sonnet` and `opus` variants
- Claude Opus effort presets (`low`, `medium`, `high`, `max`)
- Gemini family with `pro` and `flash` variants

Codex Mini remains marked as not yet validated on this machine, so the catalog exposes it as a disabled preset for now rather than pretending it already works.

## OpenClaw Integration

The repository includes:

- skill wrapper: [`openclaw-local-model-bridge/`](./openclaw-local-model-bridge)
- provider snippet: [`openclaw-local-model-bridge/references/openclaw-provider-snippet.json`](./openclaw-local-model-bridge/references/openclaw-provider-snippet.json)

## Current Gaps

- Codex streaming is currently end-loaded rather than true token streaming
- Gemini auth state is still best-effort because the official CLI does not expose a clean auth status command
- Community plugin packaging is not finished yet; this repo is the standard base that plugin/skill packaging will sit on top of
