'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { listModels, resolveProviderModel } = require('./providers');

test('resolveProviderModel routes codex models to the codex provider', () => {
  const result = resolveProviderModel('gpt-5.1-codex-max', 'claude-sonnet-4-5');

  assert.deepEqual(result, {
    provider: 'codex',
    model: 'gpt-5.1-codex-max'
  });
});

test('resolveProviderModel normalizes legacy prefixed Codex ids', () => {
  const result = resolveProviderModel('codex-cli/gpt-5.4', 'claude-sonnet-4-5');

  assert.deepEqual(result, {
    provider: 'codex',
    model: 'gpt-5.4'
  });
});

test('resolveProviderModel normalizes local bridge Claude ids', () => {
  const result = resolveProviderModel('local-cli-bridge/claude-sonnet-4-5', 'claude-sonnet-4-5');

  assert.deepEqual(result, {
    provider: 'claude',
    model: 'claude-sonnet-4-5'
  });
});

test('resolveProviderModel normalizes old codex-bridge ids', () => {
  const result = resolveProviderModel('codex-bridge/codex-pro', 'claude-sonnet-4-5');

  assert.deepEqual(result, {
    provider: 'codex',
    model: 'gpt-5.4'
  });
});

test('resolveProviderModel routes claude models to the claude provider', () => {
  const result = resolveProviderModel('claude-sonnet-4-5', 'claude-sonnet-4-5');

  assert.deepEqual(result, {
    provider: 'claude',
    model: 'claude-sonnet-4-5'
  });
});

test('resolveProviderModel routes gemini models to the gemini provider', () => {
  const result = resolveProviderModel('gemini-2.5-pro', 'claude-sonnet-4-5');

  assert.deepEqual(result, {
    provider: 'gemini',
    model: 'gemini-2.5-pro'
  });
});

test('resolveProviderModel falls back to the configured default model', () => {
  const result = resolveProviderModel(undefined, 'gemini-2.5-flash');

  assert.deepEqual(result, {
    provider: 'gemini',
    model: 'gemini-2.5-flash'
  });
});

test('listModels returns the built-in Codex, Claude, and Gemini models', () => {
  const models = listModels('claude-sonnet-4-5');
  const ids = models.map((model) => model.id);

  assert.ok(ids.includes('gpt-5.1-codex-max'));
  assert.ok(ids.includes('gpt-5.4'));
  assert.ok(ids.includes('claude-sonnet-4-5'));
  assert.ok(ids.includes('claude-opus-4-6'));
  assert.ok(ids.includes('gemini-2.5-pro'));
  assert.ok(ids.includes('gemini-2.5-flash'));
});
