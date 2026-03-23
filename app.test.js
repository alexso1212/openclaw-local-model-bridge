'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');

const { createApp } = require('./app');

function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function request(server, { method, path, body }) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const req = http.request({
      host: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: data
      }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function createSpawnStub(linesByCommand) {
  const calls = [];

  function spawn(command, args, options) {
    calls.push({ command, args, options });
    const proc = new EventEmitter();
    proc.stdout = new PassThrough();
    proc.stderr = new PassThrough();
    proc.stdin = new PassThrough();
    proc.killed = false;
    proc.kill = () => {
      proc.killed = true;
      proc.emit('close', 130);
    };

    process.nextTick(() => {
      const lines = linesByCommand[command] || [];
      for (const line of lines) {
        proc.stdout.write(`${line}\n`);
      }
      proc.stdout.end();
      proc.emit('close', 0);
    });

    return proc;
  }

  return { spawn, calls };
}

test('GET /health reports provider availability', async () => {
  const app = createApp({
    config: {
      defaultModel: 'claude-sonnet-4-5',
      codexPath: '/bin/codex',
      claudePath: '/bin/claude',
      geminiPath: '/bin/gemini'
    },
    detectProviders: () => ({
      codex: { available: true, command: '/bin/codex' },
      claude: { available: true, command: '/bin/claude' },
      gemini: { available: false, command: '/bin/gemini' }
    }),
    spawn: () => {
      throw new Error('spawn should not be called');
    }
  });
  const server = await startServer(app);

  try {
    const response = await request(server, { method: 'GET', path: '/health' });
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(payload.providers.codex.available, true);
    assert.equal(payload.providers.claude.available, true);
    assert.equal(payload.providers.gemini.available, false);
  } finally {
    server.close();
  }
});

test('POST /v1/chat/completions routes non-streaming Codex requests', async () => {
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push({ command, args, options });
    const proc = new EventEmitter();
    proc.stdout = new PassThrough();
    proc.stderr = new PassThrough();
    proc.stdin = new PassThrough();
    proc.killed = false;
    proc.kill = () => {
      proc.killed = true;
      proc.emit('close', 130);
    };

    const outputFile = args[args.indexOf('-o') + 1];
    process.nextTick(() => {
      require('node:fs').writeFileSync(outputFile, 'OK from Codex', 'utf8');
      proc.stdout.end();
      proc.emit('close', 0);
    });

    return proc;
  };
  const app = createApp({
    config: {
      defaultModel: 'gpt-5.4',
      codexPath: '/bin/codex',
      claudePath: '/bin/claude',
      claudePermissionMode: 'acceptEdits',
      geminiPath: '/bin/gemini'
    },
    detectProviders: () => ({}),
    spawn
  });
  const server = await startServer(app);

  try {
    const response = await request(server, {
      method: 'POST',
      path: '/v1/chat/completions',
      body: {
        model: 'gpt-5.4',
        messages: [{ role: 'user', content: 'Reply with only OK.' }],
        cwd: '/tmp/project'
      }
    });
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(payload.choices[0].message.content, 'OK from Codex');
    assert.equal(calls[0].command, '/bin/codex');
    assert.equal(calls[0].options.cwd, '/tmp/project');
  } finally {
    server.close();
  }
});

test('POST /v1/chat/completions routes non-streaming Claude requests', async () => {
  const spawnStub = createSpawnStub({
    '/bin/claude': [
      JSON.stringify({
        type: 'assistant',
        uuid: 'claude-1',
        message: { content: [{ type: 'text', text: 'OK from Claude' }] }
      })
    ]
  });
  const app = createApp({
    config: {
      defaultModel: 'claude-sonnet-4-5',
      claudePath: '/bin/claude',
      claudePermissionMode: 'acceptEdits',
      geminiPath: '/bin/gemini'
    },
    detectProviders: () => ({}),
    spawn: spawnStub.spawn
  });
  const server = await startServer(app);

  try {
    const response = await request(server, {
      method: 'POST',
      path: '/v1/chat/completions',
      body: {
        model: 'claude-sonnet-4-5',
        reasoning: { effort: 'high' },
        messages: [{ role: 'user', content: 'Reply with only OK.' }],
        cwd: '/tmp/project'
      }
    });
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(payload.choices[0].message.content, 'OK from Claude');
    assert.equal(spawnStub.calls[0].command, '/bin/claude');
    assert.equal(spawnStub.calls[0].options.cwd, '/tmp/project');
    assert.ok(spawnStub.calls[0].args.includes('--effort'));
    assert.ok(spawnStub.calls[0].args.includes('high'));
  } finally {
    server.close();
  }
});

test('POST /v1/chat/completions streams Gemini responses as SSE', async () => {
  const spawnStub = createSpawnStub({
    '/bin/gemini': [
      'Loaded cached credentials.',
      JSON.stringify({
        type: 'message',
        role: 'assistant',
        content: 'OK from Gemini',
        delta: true
      })
    ]
  });
  const app = createApp({
    config: {
      defaultModel: 'claude-sonnet-4-5',
      claudePath: '/bin/claude',
      claudePermissionMode: 'acceptEdits',
      geminiPath: '/bin/gemini'
    },
    detectProviders: () => ({}),
    spawn: spawnStub.spawn
  });
  const server = await startServer(app);

  try {
    const response = await request(server, {
      method: 'POST',
      path: '/v1/chat/completions',
      body: {
        model: 'gemini-2.5-flash',
        stream: true,
        messages: [{ role: 'user', content: 'Reply with only OK.' }]
      }
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers['content-type'], /text\/event-stream/);
    assert.match(response.body, /OK from Gemini/);
    assert.match(response.body, /\[DONE\]/);
  } finally {
    server.close();
  }
});

test('POST /v1/chat/completions does not crash if client aborts before the child exits', async () => {
  const spawn = () => {
    const proc = new EventEmitter();
    proc.stdout = new PassThrough();
    proc.stderr = new PassThrough();
    proc.stdin = new PassThrough();
    proc.killed = false;
    proc.kill = () => {
      proc.killed = true;
      proc.emit('close', 130);
    };

    setTimeout(() => {
      proc.stdout.end();
      proc.emit('close', 130);
    }, 30);

    return proc;
  };

  const app = createApp({
    config: {
      defaultModel: 'claude-sonnet-4-5',
      claudePath: '/bin/claude',
      claudePermissionMode: 'acceptEdits',
      geminiPath: '/bin/gemini'
    },
    detectProviders: () => ({}),
    spawn
  });
  const server = await startServer(app);

  try {
    await new Promise((resolve, reject) => {
      const address = server.address();
      const req = http.request({
        host: '127.0.0.1',
        port: address.port,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      req.on('error', () => resolve());
      req.write(JSON.stringify({
        model: 'claude-sonnet-4-5',
        messages: [{ role: 'user', content: 'Reply with only OK.' }]
      }));
      req.end();
      setTimeout(() => {
        req.destroy();
        resolve();
      }, 5);
    });

    await new Promise((resolve) => setTimeout(resolve, 80));
    const response = await request(server, { method: 'GET', path: '/health' });

    assert.equal(response.statusCode, 200);
  } finally {
    server.close();
  }
});
