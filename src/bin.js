#!/usr/bin/env node
const { getConfiguration, ensureOutput } = require('.');

(async () => {
  const config = await getConfiguration();
  await ensureOutput(config.output);
})();
