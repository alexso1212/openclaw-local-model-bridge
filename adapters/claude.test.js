'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildClaudeSpawn, parseClaudeLine } = require('./claude');

test('buildClaudeSpawn includes model, permission mode, cwd, and extra directories', () => {
  const result = buildClaudeSpawn({
    messages: [{ role: 'user', content: 'Reply with only OK.' }],
    model: 'claude-sonnet-4-5',
    cwd: '/tmp/project',
    includeDirectories: ['/tmp/shared', '/tmp/docs']
  }, {
    claudePath: '/custom/claude',
    claudePermissionMode: 'acceptEdits'
  });

  assert.equal(result.command, '/custom/claude');
  assert.equal(result.cwd, '/tmp/project');
  assert.deepEqual(result.args.slice(0, 9), [
    '--print',
    '--output-format', 'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--permission-mode', 'acceptEdits',
    '--model', 'claude-sonnet-4-5'
  ]);
  assert.deepEqual(result.args.slice(9, 12), [
    '--add-dir',
    '/tmp/shared',
    '/tmp/docs'
  ]);
  assert.equal(result.args.at(-1), 'Reply with only OK.');
});

test('parseClaudeLine extracts assistant text from Claude stream-json output', () => {
  const text = parseClaudeLine(JSON.stringify({
    type: 'assistant',
    uuid: 'msg-1',
    message: {
      content: [{ type: 'text', text: 'OK' }]
    }
  }));

  assert.deepEqual(text, { type: 'delta', text: 'OK', id: 'msg-1' });
});
