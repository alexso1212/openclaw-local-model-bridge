'use strict';

const express = require('express');
const defaultSpawn = require('node:child_process').spawn;
const { randomUUID } = require('node:crypto');

const { buildCodexSpawn, parseCodexLine, readCodexResult } = require('./adapters/codex');
const { buildClaudeSpawn, parseClaudeLine } = require('./adapters/claude');
const { buildGeminiSpawn, parseGeminiLine } = require('./adapters/gemini');
const { detectProviders, loadConfig } = require('./config');
const { listModels, resolveProviderModel } = require('./providers');

const ADAPTERS = {
  codex: {
    buildSpawn: buildCodexSpawn,
    parseLine: parseCodexLine,
    readFinal: readCodexResult
  },
  claude: {
    buildSpawn: buildClaudeSpawn,
    parseLine: parseClaudeLine
  },
  gemini: {
    buildSpawn: buildGeminiSpawn,
    parseLine: parseGeminiLine
  }
};

function normalizeIncludeDirectories(body) {
  if (Array.isArray(body.include_directories)) return body.include_directories;
  if (Array.isArray(body.includeDirectories)) return body.includeDirectories;
  return [];
}

function createDeltaTracker() {
  const seenById = new Map();

  return function nextText(event) {
    if (!event || event.type !== 'delta' || !event.text) return '';
    if (!event.id) return event.text;

    const previous = seenById.get(event.id) || '';
    if (event.text === previous) return '';

    if (event.text.startsWith(previous)) {
      seenById.set(event.id, event.text);
      return event.text.slice(previous.length);
    }

    seenById.set(event.id, event.text);
    return event.text;
  };
}

function createApp(options = {}) {
  const config = options.config || loadConfig();
  const spawn = options.spawn || defaultSpawn;
  const detect = options.detectProviders || (() => detectProviders(config));

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      default_model: config.defaultModel,
      providers: detect()
    });
  });

  app.get('/v1/models', (req, res) => {
    res.json({
      object: 'list',
      data: listModels(config.defaultModel)
    });
  });

  app.post('/v1/chat/completions', (req, res) => {
    const { messages = [], stream = false } = req.body;
    let clientClosed = false;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: { message: 'messages array is required', type: 'invalid_request_error' }
      });
    }

    let resolved;
    try {
      resolved = resolveProviderModel(req.body.model, config.defaultModel);
    } catch (error) {
      return res.status(400).json({
        error: { message: error.message, type: 'invalid_request_error' }
      });
    }

    const adapter = ADAPTERS[resolved.provider];
    const requestModel = {
      messages,
      model: resolved.model,
      effort: req.body.reasoning?.effort || req.body.effort,
      cwd: req.body.cwd,
      includeDirectories: normalizeIncludeDirectories(req.body)
    };
    const invocation = adapter.buildSpawn(requestModel, config);
    const requestId = `chatcmpl-${randomUUID()}`;
    const created = Math.floor(Date.now() / 1000);

    let proc;
    try {
      proc = spawn(invocation.command, invocation.args, {
        cwd: invocation.cwd,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: config.requestTimeoutMs
      });
      proc.stdin.end();
    } catch (error) {
      return res.status(500).json({
        error: { message: error.message, type: 'server_error' }
      });
    }

    const nextText = createDeltaTracker();
    let lineBuffer = '';
    let fullText = '';
    let stderrText = '';

    function handleLine(line) {
      const event = adapter.parseLine ? adapter.parseLine(line) : null;
      const text = nextText(event);
      if (!text) return '';
      fullText += text;
      return text;
    }

    function flushBuffer() {
      const trimmed = lineBuffer.trim();
      if (!trimmed) return '';
      lineBuffer = '';
      return handleLine(trimmed);
    }

    function killProcess() {
      if (proc && !proc.killed) proc.kill();
    }

    function canRespond() {
      return !clientClosed && !req.aborted && !res.destroyed && !res.writableEnded;
    }

    req.on('aborted', () => {
      clientClosed = true;
      killProcess();
    });
    res.on('close', () => {
      if (!res.writableEnded) killProcess();
      clientClosed = true;
    });

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
    }

    proc.stdout.on('data', (chunk) => {
      lineBuffer += chunk.toString();
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop();

      for (const line of lines) {
        const text = handleLine(line);
        if (!stream || !text || !canRespond()) continue;

        const payload = {
          id: requestId,
          object: 'chat.completion.chunk',
          created,
          model: resolved.model,
          choices: [{ index: 0, delta: { content: text }, finish_reason: null }]
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    });

    proc.stderr.on('data', (chunk) => {
      stderrText += chunk.toString();
    });

    proc.on('close', (code) => {
      if (!canRespond()) return;

      const trailingText = flushBuffer();
      const finalText = adapter.readFinal ? adapter.readFinal(invocation) : '';

      if (finalText) {
        fullText = fullText ? `${fullText}${finalText}` : finalText;
      }

      if (stream && trailingText && canRespond()) {
        const payload = {
          id: requestId,
          object: 'chat.completion.chunk',
          created,
          model: resolved.model,
          choices: [{ index: 0, delta: { content: trailingText }, finish_reason: null }]
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }

      if (stream && finalText && canRespond()) {
        const payload = {
          id: requestId,
          object: 'chat.completion.chunk',
          created,
          model: resolved.model,
          choices: [{ index: 0, delta: { content: finalText }, finish_reason: null }]
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }

      if (stream) {
        if (!canRespond()) return;
        const donePayload = {
          id: requestId,
          object: 'chat.completion.chunk',
          created,
          model: resolved.model,
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
        };
        res.write(`data: ${JSON.stringify(donePayload)}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }

      if (code !== 0 && !fullText) {
        return res.status(500).json({
          error: {
            message: `${resolved.provider} exited ${code}: ${stderrText}`.trim(),
            type: 'server_error',
            code
          }
        });
      }

      return res.json({
        id: requestId,
        object: 'chat.completion',
        created,
        model: resolved.model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: fullText },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: -1, completion_tokens: -1, total_tokens: -1 }
      });
    });

    proc.on('error', (error) => {
      if (!canRespond()) return;

      if (stream) {
        try {
          res.write('data: [DONE]\n\n');
          res.end();
        } catch {}
        return;
      }

      if (!res.headersSent) {
        res.status(500).json({
          error: { message: error.message, type: 'server_error' }
        });
      }
    });
  });

  return app;
}

module.exports = {
  createApp
};
