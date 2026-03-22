# OpenClaw Local Bridge MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the current local Claude bridge into an OpenClaw-first bridge that supports both Claude CLI and Gemini CLI through an OpenAI-compatible chat API.

**Architecture:** Split the current single-file server into a small HTTP layer plus provider adapters. Normalize provider stream output into shared events so the API layer can stay provider-agnostic. Keep configuration simple through environment variables and request-level optional overrides for local project context.

**Tech Stack:** Node.js, Express, child_process, node:test

---

## Chunk 1: Core Refactor

### Task 1: Extract config and provider routing

**Files:**
- Create: `config.js`
- Create: `providers.js`
- Modify: `server.js`
- Test: `providers.test.js`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run `node --test providers.test.js` and verify it fails**
- [ ] **Step 3: Implement config loading and model-to-provider routing**
- [ ] **Step 4: Run `node --test providers.test.js` and verify it passes**

### Task 2: Extract Claude adapter utilities

**Files:**
- Create: `adapters/claude.js`
- Modify: `bridge-utils.js`
- Modify: `bridge-utils.test.js`

- [ ] **Step 1: Write failing tests for Claude request/args building**
- [ ] **Step 2: Run targeted tests and verify they fail**
- [ ] **Step 3: Implement the adapter helpers with explicit model and directory support**
- [ ] **Step 4: Run targeted tests and verify they pass**

## Chunk 2: Gemini Support

### Task 3: Add Gemini adapter

**Files:**
- Create: `adapters/gemini.js`
- Create: `adapters/gemini.test.js`

- [ ] **Step 1: Write failing tests for Gemini arg building and stream parsing**
- [ ] **Step 2: Run `node --test adapters/gemini.test.js` and verify it fails**
- [ ] **Step 3: Implement Gemini adapter helpers**
- [ ] **Step 4: Run `node --test adapters/gemini.test.js` and verify it passes**

## Chunk 3: HTTP Integration

### Task 4: Route chat requests to the right adapter

**Files:**
- Modify: `server.js`
- Create: `app.js`
- Create: `app.test.js`

- [ ] **Step 1: Write failing HTTP contract tests for `/health`, `/v1/models`, and `/v1/chat/completions`**
- [ ] **Step 2: Run `node --test app.test.js` and verify it fails**
- [ ] **Step 3: Implement adapter-based request handling for streaming and non-streaming**
- [ ] **Step 4: Run `node --test app.test.js` and verify it passes**

### Task 5: Run full verification

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add a reliable `npm test` command**
- [ ] **Step 2: Run `npm test`**
- [ ] **Step 3: Run one live Claude smoke test**
- [ ] **Step 4: Run one live Gemini smoke test**
