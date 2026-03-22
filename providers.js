'use strict';

const BUILTIN_MODELS = [
  { id: 'gpt-5.1-codex-max', provider: 'codex' },
  { id: 'gpt-5.4', provider: 'codex' },
  { id: 'claude-sonnet-4-5', provider: 'claude' },
  { id: 'claude-opus-4-6', provider: 'claude' },
  { id: 'gemini-2.5-pro', provider: 'gemini' },
  { id: 'gemini-2.5-flash', provider: 'gemini' }
];

function normalizeModelName(model, defaultModel) {
  const name = typeof model === 'string' && model.trim()
    ? model.trim()
    : defaultModel;

  if (!name) {
    throw new Error('No model provided and no default model configured');
  }

  return name;
}

function providerFromModel(model) {
  if (model.startsWith('gpt-') || model.startsWith('codex-')) return 'codex';
  if (model.startsWith('claude-')) return 'claude';
  if (model.startsWith('gemini-')) return 'gemini';
  throw new Error(`Unsupported model: ${model}`);
}

function resolveProviderModel(model, defaultModel) {
  const resolvedModel = normalizeModelName(model, defaultModel);
  return {
    provider: providerFromModel(resolvedModel),
    model: resolvedModel
  };
}

function listModels(defaultModel) {
  const models = new Map(BUILTIN_MODELS.map((model) => [model.id, {
    id: model.id,
    object: 'model',
    created: 1700000000,
    owned_by: 'openclaw-local-model-bridge'
  }]));

  if (defaultModel && !models.has(defaultModel)) {
    models.set(defaultModel, {
      id: defaultModel,
      object: 'model',
      created: 1700000000,
      owned_by: 'openclaw-local-model-bridge'
    });
  }

  return [...models.values()];
}

module.exports = {
  listModels,
  resolveProviderModel
};
