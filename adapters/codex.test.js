'use strict';

const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const { buildCodexSpawn, readCodexResult } = require('./codex');

test('buildCodexSpawn includes model, cwd, add-dir, and output file', () => {
  const result = buildCodexSpawn({
    messages: [{ role: 'user', content: 'Reply with only OK.' }],
    model: 'gpt-5.4',
    cwd: '/tmp/project',
    includeDirectories: ['/tmp/extra']
  }, {
    codexPath: '/custom/codex'
  });

  assert.equal(result.command, '/custom/codex');
  assert.equal(result.cwd, '/tmp/project');
  assert.match(result.outputFile, /openclaw-local-model-bridge-codex/);
  assert.deepEqual(result.args.slice(0, 7), [
    'exec',
    '--skip-git-repo-check',
    '--full-auto',
    '-o', result.outputFile,
    '--model',
    'gpt-5.4'
  ]);
  assert.ok(result.args.includes('--add-dir'));
  assert.ok(result.args.includes('/tmp/extra'));
});

test('readCodexResult returns the final message and cleans up the temp file', () => {
  const outputFile = `/tmp/openclaw-local-model-bridge-test-${Date.now()}.txt`;
  fs.writeFileSync(outputFile, 'OK from Codex\n', 'utf8');

  const result = readCodexResult({ outputFile });

  assert.equal(result, 'OK from Codex');
  assert.equal(fs.existsSync(outputFile), false);
});
