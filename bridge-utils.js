'use strict';

function flattenContentPart(part) {
  if (part == null) return '';
  if (typeof part === 'string') return part;
  if (typeof part === 'object') {
    if (typeof part.text === 'string') return part.text;
    if (part.type && typeof part.type === 'string') return `[${part.type}]`;
    return JSON.stringify(part);
  }
  return String(part);
}

function contentToText(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(flattenContentPart).filter(Boolean).join('\n');
  }
  if (typeof content === 'object') {
    if (typeof content.text === 'string') return content.text;
    return JSON.stringify(content);
  }
  return String(content);
}

function buildPromptParts(messages) {
  let systemPrompt = null;
  const nonSystem = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt = contentToText(msg.content);
    } else {
      nonSystem.push(msg);
    }
  }

  let userPrompt = '';
  if (nonSystem.length === 0) {
    userPrompt = 'Hello';
  } else if (nonSystem.length === 1) {
    userPrompt = contentToText(nonSystem[0].content);
  } else {
    const historyLines = nonSystem.slice(0, -1)
      .map((message) => `${message.role}: ${contentToText(message.content)}`)
      .join('\n');
    const historyBlock = `\n\n[Conversation History]\n${historyLines}`;
    systemPrompt = systemPrompt
      ? systemPrompt + historyBlock
      : `You are a helpful assistant.${historyBlock}`;
    userPrompt = contentToText(nonSystem[nonSystem.length - 1].content);
  }

  return { userPrompt, systemPrompt };
}

function buildClaudeArgs(messages, options = {}) {
  const {
    extraArgs = [],
    effort,
    permissionMode = 'bypassPermissions',
    model,
    includeDirectories = []
  } = options;
  const { userPrompt, systemPrompt } = buildPromptParts(messages);

  const args = [
    '--print',
    '--output-format', 'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--permission-mode', permissionMode
  ];
  if (model) {
    args.push('--model', model);
  }
  if (effort) {
    args.push('--effort', effort);
  }
  if (includeDirectories.length > 0) {
    args.push('--add-dir', ...includeDirectories);
  }
  args.push(...extraArgs);
  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt);
  }
  args.push(userPrompt);

  return { args, userPrompt, systemPrompt };
}

module.exports = {
  buildClaudeArgs,
  buildPromptParts,
  contentToText
};
