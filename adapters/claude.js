'use strict';

const { buildClaudeArgs } = require('../bridge-utils');

function buildClaudeSpawn(request, config) {
  const {
    messages = [],
    effort,
    model,
    cwd,
    includeDirectories = []
  } = request;

  const { args } = buildClaudeArgs(messages, {
    effort,
    permissionMode: config.claudePermissionMode,
    model,
    includeDirectories
  });

  return {
    command: config.claudePath,
    args,
    cwd
  };
}

function parseClaudeLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (obj.type === 'assistant' && obj.message && Array.isArray(obj.message.content)) {
    const text = obj.message.content
      .filter((entry) => entry.type === 'text')
      .map((entry) => entry.text || '')
      .join('');

    if (text) {
      return {
        type: 'delta',
        text,
        id: obj.uuid || null
      };
    }
  }

  if (obj.type === 'result' && obj.subtype === 'error') {
    return {
      type: 'error',
      message: obj.result || 'Claude request failed'
    };
  }

  return null;
}

module.exports = {
  buildClaudeSpawn,
  parseClaudeLine
};
