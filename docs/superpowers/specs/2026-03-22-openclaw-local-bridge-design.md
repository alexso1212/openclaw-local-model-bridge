# OpenClaw Local Bridge Design

**Status:** Approved in chat, written for immediate implementation

## Goal

Turn the current Claude-only local bridge into a small OpenClaw-first local service that can route OpenAI-compatible chat requests to either `Claude Code` or `Gemini CLI`, using the user's existing local login instead of API keys.

## Non-Goals

- No web session scraping or cookie reuse
- No shared multi-user gateway
- No image/audio support in v1
- No attempt to fully emulate provider APIs beyond the minimal OpenAI-compatible chat surface

## Primary Users

OpenClaw users running agents on their own machines.

## Product Shape

The project remains a local bridge service. It is not a skill by itself, although a skill can later be added as a thin wrapper around this service.

## API Surface

The service keeps an OpenAI-compatible surface for the first version:

- `GET /health`
- `GET /v1/models`
- `POST /v1/chat/completions`

The chat endpoint supports:

- non-streaming responses
- SSE streaming responses
- `model`-based provider routing
- bridge-specific optional fields:
  - `cwd`
  - `include_directories`

## Provider Routing

Model names determine which local CLI is used:

- `claude-*` -> Claude adapter
- `gemini-*` -> Gemini adapter

If no model is provided, the bridge uses a configured default model.

## Provider Adapters

### Claude adapter

Use `claude --print` with:

- explicit `--model`
- `--output-format stream-json`
- optional `--system-prompt`
- optional working directory and extra directories

The bridge must stop hardcoding the Claude binary path and permission mode.

### Gemini adapter

Use `gemini --prompt` with:

- explicit `--model`
- `--output-format stream-json`
- `--yolo`
- optional working directory and extra directories

The adapter ignores non-JSON log lines and only consumes structured stream events.

## Response Mapping

Both adapters are normalized into one internal event stream:

- text delta
- final text
- process error

The HTTP layer converts this into OpenAI-compatible JSON or SSE chunks.

## Configuration

Environment variables are enough for v1:

- `PORT`
- `HOST`
- `CLAUDE_PATH`
- `GEMINI_PATH`
- `DEFAULT_MODEL`
- `CLAUDE_PERMISSION_MODE`

## Reliability

V1 reliability requirements:

- request validation
- timeout handling
- child-process cleanup on client disconnect
- clear provider-specific error messages
- lightweight health endpoint that reports detected CLIs

## Testing

The bridge should be refactored so tests can inject a fake process spawner. This allows TDD for:

- model-to-provider routing
- Claude argument building
- Gemini argument building
- JSON line parsing
- HTTP contract for chat completions

## Packaging

The repository should add a README later, but implementation priority is:

1. provider abstraction
2. Gemini support
3. OpenAI-compatible routing
4. tests
