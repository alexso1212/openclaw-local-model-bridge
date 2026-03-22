# Claude Dashboard Bridge Adapter Brief

## Scope

Your side only needs to make the monitoring console adapt cleanly to bridge-style model mods.

This repository will own the actual bridge behavior and packaging. The dashboard should treat it as a data-driven bridge mod, not as four hardcoded model cards.

## What The Dashboard Should Read

The dashboard should read bridge metadata from:

- `mod.manifest.json`
- `bridge-status.js` output

The bridge status JSON is the source of truth for:

- which bridge models exist
- which families / variants / presets exist
- which providers are installed
- which providers are logged in
- which model entries can be enabled
- what login / status actions should be shown

## Dashboard Rules

- do not hardcode bridge models in frontend constants
- render model cards from the bridge status payload
- support the `family -> variant -> preset` hierarchy from the bridge catalog
- treat `openclaw-local-model-bridge` as one mod with multiple model entries
- each model entry needs its own auth state, runtime state, and enable toggle
- each provider should expose login / status actions near the model card

## Expected Model Entries Right Now

- `gpt-5.1-codex-max`
- `gpt-5.4`
- `claude-sonnet-4-5`
- `claude-opus-4-6`
- `gemini-2.5-pro`
- `gemini-2.5-flash`

## Expected Choice Depth

- Codex -> Codex Max / legacy GPT-5.4 -> preset slot
- Claude -> Sonnet / Opus -> effort preset
- Gemini -> Pro / Flash -> default preset

## Expected UX

1. User installs the bridge project
2. User enables the bridge mod in the dashboard
3. Dashboard reads the bridge catalog dynamically
4. Bridge page shows the real model entries from the mod
5. Each model card shows:
   - name
   - provider
   - family / variant / preset when relevant
   - auth state
   - runtime state
   - login / renew action
   - enable / disable toggle

## Important Boundary

- the dashboard is responsible for adapting to bridge mods
- this repository is responsible for making the bridge complete and packageable
