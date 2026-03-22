'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGeminiSpawn, parseGeminiLine } = require('./gemini');

test('buildGeminiSpawn includes model, cwd, and include directories', () => {
  const result = buildGeminiSpawn({
    messages: [{ role: 'user', content: 'Reply with only OK.' }],
    model: 'gemini-2.5-flash',
    cwd: '/tmp/project',
    includeDirectories: ['/tmp/shared', '/tmp/docs']
  }, {
    geminiPath: '/custom/gemini'
  });

  assert.equal(result.command, '/custom/gemini');
  assert.equal(result.cwd, '/tmp/project');
  assert.deepEqual(result.args, [
    '--prompt', 'Reply with only OK.',
    '--output-format', 'stream-json',
    '--yolo',
    '--model', 'gemini-2.5-flash',
    '--include-directories', '/tmp/shared',
    '--include-directories', '/tmp/docs'
  ]);
});

test('parseGeminiLine ignores non-json log lines', () => {
  assert.equal(parseGeminiLine('Loaded cached credentials.'), null);
});

test('parseGeminiLine extracts assistant deltas from stream-json output', () => {
  const event = parseGeminiLine(JSON.stringify({
    type: 'message',
    role: 'assistant',
    content: 'OK',
    delta: true
  }));

  assert.deepEqual(event, {
    type: 'delta',
    text: 'OK',
    id: null
  });
});
