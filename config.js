'use strict';

const { spawnSync } = require('node:child_process');

function loadConfig(env = process.env) {
  return {
    host: env.HOST || '127.0.0.1',
    port: Number.parseInt(env.PORT || '3099', 10),
    defaultModel: env.DEFAULT_MODEL || 'claude-sonnet-4-5',
    codexPath: env.CODEX_PATH || 'codex',
    claudePath: env.CLAUDE_PATH || 'claude',
    geminiPath: env.GEMINI_PATH || 'gemini',
    claudePermissionMode: env.CLAUDE_PERMISSION_MODE || 'bypassPermissions',
    requestTimeoutMs: Number.parseInt(env.REQUEST_TIMEOUT_MS || '300000', 10)
  };
}

function detectCommand(command) {
  const result = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    timeout: 1500
  });

  return {
    available: result.status === 0,
    command,
    version: result.status === 0 ? (result.stdout || result.stderr || '').trim() : null
  };
}

function detectCodexAuth(config) {
  const result = spawnSync(config.codexPath, ['login', 'status'], {
    encoding: 'utf8',
    timeout: 2000
  });
  const text = `${result.stdout || ''}${result.stderr || ''}`.trim();

  if (result.status === 0 && /logged in/i.test(text)) {
    return {
      status: 'authenticated',
      detail: text
    };
  }

  return {
    status: result.error ? 'unknown' : 'unauthenticated',
    detail: text || result.error?.message || 'Codex login status unavailable'
  };
}

function detectClaudeAuth(config) {
  const result = spawnSync(config.claudePath, ['auth', 'status'], {
    encoding: 'utf8',
    timeout: 2000
  });
  const text = `${result.stdout || ''}${result.stderr || ''}`.trim();

  try {
    const payload = JSON.parse(text);
    return {
      status: payload.loggedIn ? 'authenticated' : 'unauthenticated',
      method: payload.authMethod || null,
      provider: payload.apiProvider || null
    };
  } catch {
    return {
      status: result.error ? 'unknown' : 'unauthenticated',
      detail: text || result.error?.message || 'Claude auth status unavailable'
    };
  }
}

function detectGeminiAuth(config) {
  const command = detectCommand(config.geminiPath);
  if (!command.available) {
    return {
      status: 'missing',
      detail: 'Gemini CLI not found'
    };
  }

  return {
    status: 'unknown',
    detail: 'Gemini CLI does not expose a non-interactive auth status command; launch `gemini` to sign in if needed.'
  };
}

function detectProviders(config) {
  const codex = detectCommand(config.codexPath);
  const claude = detectCommand(config.claudePath);
  const gemini = detectCommand(config.geminiPath);

  return {
    codex: {
      ...codex,
      auth: codex.available ? detectCodexAuth(config) : { status: 'missing' }
    },
    claude: {
      ...claude,
      auth: claude.available ? detectClaudeAuth(config) : { status: 'missing' }
    },
    gemini: {
      ...gemini,
      auth: detectGeminiAuth(config)
    }
  };
}

module.exports = {
  detectProviders,
  loadConfig
};
