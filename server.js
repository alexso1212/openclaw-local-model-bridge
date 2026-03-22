'use strict';

const { createApp } = require('./app');
const { loadConfig } = require('./config');

const config = loadConfig();
const app = createApp({ config });

app.listen(config.port, config.host, () => {
  console.log(`[openclaw-local-model-bridge] Listening on http://${config.host}:${config.port}`);
});
