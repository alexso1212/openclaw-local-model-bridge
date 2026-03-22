'use strict';

const pkg = require('./package.json');
const { detectProviders, loadConfig } = require('./config');
const { listModels, resolveProviderModel } = require('./providers');

const MODEL_LABELS = {
  'gpt-5.1-codex-max': 'Codex Max / GPT-5.1-Codex-Max',
  'gpt-5.4': 'Codex Pro / GPT-5.4',
  'claude-sonnet-4-5': 'Claude Code / Sonnet 4.5',
  'claude-opus-4-6': 'Claude Code / Opus 4.6',
  'gemini-2.5-pro': 'Gemini / 2.5 Pro',
  'gemini-2.5-flash': 'Gemini / 2.5 Flash'
};

function actionsForProvider(provider) {
  if (provider === 'codex') {
    return {
      login: 'codex login',
      status: 'codex login status'
    };
  }

  if (provider === 'claude') {
    return {
      login: 'claude auth login',
      status: 'claude auth status'
    };
  }

  if (provider === 'gemini') {
    return {
      login: 'gemini',
      status: 'gemini --version'
    };
  }

  return {};
}

function buildModelEntry(modelId, providerInfo, config) {
  const { provider } = resolveProviderModel(modelId, config.defaultModel);
  const auth = providerInfo?.auth || { status: 'missing' };

  return {
    id: modelId,
    label: MODEL_LABELS[modelId] || modelId,
    provider,
    installed: Boolean(providerInfo?.available),
    auth,
    runtime: {
      health: providerInfo?.available ? 'unknown' : 'missing',
      enableable: Boolean(providerInfo?.available)
    },
    actions: actionsForProvider(provider)
  };
}

function buildCatalog(providers) {
  return {
    families: [
      {
        id: 'codex',
        label: 'Codex',
        provider: 'codex',
        installed: Boolean(providers.codex?.available),
        variants: [
          {
            id: 'gpt-5.1-codex-max',
            label: 'GPT-5.1 Codex Max',
            model: 'gpt-5.1-codex-max',
            selectable: true,
            presets: [
              {
                id: 'default',
                label: 'Max',
                selectable: true,
                request: { model: 'gpt-5.1-codex-max' }
              },
              {
                id: 'mini',
                label: 'Mini',
                selectable: false,
                note: 'Codex Mini has not passed validation on this machine yet, so it stays disabled for now.'
              }
            ]
          },
          {
            id: 'gpt-5.4',
            label: 'GPT-5.4 (Legacy Local Preset)',
            model: 'gpt-5.4',
            selectable: true,
            presets: [
              {
                id: 'legacy',
                label: 'Legacy',
                selectable: true,
                request: { model: 'gpt-5.4' }
              }
            ]
          }
        ]
      },
      {
        id: 'claude',
        label: 'Claude',
        provider: 'claude',
        installed: Boolean(providers.claude?.available),
        variants: [
          {
            id: 'claude-sonnet-4-5',
            label: 'Sonnet 4.5',
            model: 'claude-sonnet-4-5',
            selectable: true,
            presets: [
              {
                id: 'default',
                label: 'Default',
                selectable: true,
                request: { model: 'claude-sonnet-4-5' }
              }
            ]
          },
          {
            id: 'claude-opus-4-6',
            label: 'Opus 4.6',
            model: 'claude-opus-4-6',
            selectable: true,
            presets: [
              {
                id: 'low',
                label: 'Low Effort',
                selectable: true,
                request: { model: 'claude-opus-4-6', reasoning: { effort: 'low' } }
              },
              {
                id: 'medium',
                label: 'Medium Effort',
                selectable: true,
                request: { model: 'claude-opus-4-6', reasoning: { effort: 'medium' } }
              },
              {
                id: 'high',
                label: 'High Effort',
                selectable: true,
                request: { model: 'claude-opus-4-6', reasoning: { effort: 'high' } }
              },
              {
                id: 'max',
                label: 'Max Effort',
                selectable: true,
                request: { model: 'claude-opus-4-6', reasoning: { effort: 'max' } }
              }
            ]
          }
        ]
      },
      {
        id: 'gemini',
        label: 'Gemini',
        provider: 'gemini',
        installed: Boolean(providers.gemini?.available),
        variants: [
          {
            id: 'gemini-2.5-pro',
            label: '2.5 Pro',
            model: 'gemini-2.5-pro',
            selectable: true,
            presets: [
              {
                id: 'default',
                label: 'Default',
                selectable: true,
                request: { model: 'gemini-2.5-pro' }
              }
            ]
          },
          {
            id: 'gemini-2.5-flash',
            label: '2.5 Flash',
            model: 'gemini-2.5-flash',
            selectable: true,
            presets: [
              {
                id: 'default',
                label: 'Default',
                selectable: true,
                request: { model: 'gemini-2.5-flash' }
              }
            ]
          }
        ]
      }
    ]
  };
}

function main() {
  const config = loadConfig();
  const providers = detectProviders(config);
  const models = listModels(config.defaultModel).map((model) => {
    const provider = resolveProviderModel(model.id, config.defaultModel).provider;
    return buildModelEntry(model.id, providers[provider], config);
  });

  const payload = {
    mod: {
      id: 'openclaw-local-model-bridge',
      name: 'OpenClaw Local Model Bridge',
      version: pkg.version,
      kind: 'bridge-mod'
    },
    service: {
      host: config.host,
      port: config.port,
      healthUrl: `http://${config.host}:${config.port}/health`
    },
    catalog: buildCatalog(providers),
    providers,
    models
  };

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main();
