'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const { buildPromptParts } = require('../bridge-utils');

function buildCodexPrompt(messages) {
  const { systemPrompt, userPrompt } = buildPromptParts(messages);

  if (!systemPrompt) return userPrompt;
  return `${systemPrompt}\n\n[User]\n${userPrompt}`;
}

function buildCodexSpawn(request, config) {
  const {
    messages = [],
    model,
    cwd,
    includeDirectories = []
  } = request;

  const outputFile = path.join(
    os.tmpdir(),
    `openclaw-local-model-bridge-codex-${randomUUID()}.txt`
  );

  const args = [
    'exec',
    '--skip-git-repo-check',
    '--full-auto',
    '-o', outputFile
  ];

  if (model) {
    args.push('--model', model);
  }

  for (const dir of includeDirectories) {
    args.push('--add-dir', dir);
  }

  args.push(buildCodexPrompt(messages));

  return {
    command: config.codexPath,
    args,
    cwd,
    outputFile
  };
}

function parseCodexLine() {
  return null;
}

function readCodexResult(invocation) {
  if (!invocation || !invocation.outputFile) return '';

  try {
    return fs.readFileSync(invocation.outputFile, 'utf8').trim();
  } catch {
    return '';
  } finally {
    try {
      fs.rmSync(invocation.outputFile, { force: true });
    } catch {}
  }
}

module.exports = {
  buildCodexPrompt,
  buildCodexSpawn,
  parseCodexLine,
  readCodexResult
};
