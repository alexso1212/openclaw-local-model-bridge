'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildClaudeArgs } = require('./bridge-utils');

test('buildClaudeArgs flattens structured single-turn content into plain text', () => {
  const { args } = buildClaudeArgs([
    {
      role: 'user',
      content: [{ type: 'text', text: '我們沒有香港九號牌照的' }]
    }
  ]);

  assert.equal(args.at(-1), '我們沒有香港九號牌照的');
});

test('buildClaudeArgs does not stringify structured history as object placeholders', () => {
  const { args } = buildClaudeArgs([
    {
      role: 'user',
      content: [{ type: 'text', text: '哈喽' }]
    },
    {
      role: 'assistant',
      content: [{ type: 'text', text: 'HEARTBEAT_OK' }]
    },
    {
      role: 'user',
      content: [{ type: 'text', text: '我們沒有香港九號牌照的' }]
    }
  ]);

  const systemPromptIndex = args.indexOf('--system-prompt');
  assert.notEqual(systemPromptIndex, -1);
  const systemPrompt = args[systemPromptIndex + 1];
  assert.match(systemPrompt, /user: 哈喽/);
  assert.match(systemPrompt, /assistant: HEARTBEAT_OK/);
  assert.doesNotMatch(systemPrompt, /\[object Object\]/);
  assert.equal(args.at(-1), '我們沒有香港九號牌照的');
});

test('buildClaudeArgs includes effort when provided', () => {
  const { args } = buildClaudeArgs([
    {
      role: 'user',
      content: 'Reply with only OK.'
    }
  ], {
    model: 'claude-opus-4-6',
    effort: 'max'
  });

  const effortIndex = args.indexOf('--effort');
  assert.notEqual(effortIndex, -1);
  assert.equal(args[effortIndex + 1], 'max');
});
