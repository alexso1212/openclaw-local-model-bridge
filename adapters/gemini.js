'use strict';

const { buildPromptParts } = require('../bridge-utils');

function buildGeminiPrompt(messages) {
  const { systemPrompt, userPrompt } = buildPromptParts(messages);

  if (!systemPrompt) return userPrompt;
  return `${systemPrompt}\n\n[User]\n${userPrompt}`;
}

function buildGeminiSpawn(request, config) {
  const {
    messages = [],
    model,
    cwd,
    includeDirectories = []
  } = request;

  const args = [
    '--prompt', buildGeminiPrompt(messages),
    '--output-format', 'stream-json',
    '--yolo'
  ];

  if (model) {
    args.push('--model', model);
  }

  for (const dir of includeDirectories) {
    args.push('--include-directories', dir);
  }

  return {
    command: config.geminiPath,
    args,
    cwd
  };
}

function parseGeminiLine(line) {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith('{')) return null;

  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (obj.type === 'message' && obj.role === 'assistant' && typeof obj.content === 'string') {
    return {
      type: 'delta',
      text: obj.content,
      id: null
    };
  }

  if (obj.type === 'result' && obj.status === 'error') {
    return {
      type: 'error',
      message: obj.error || 'Gemini request failed'
    };
  }

  return null;
}

module.exports = {
  buildGeminiSpawn,
  parseGeminiLine
};
