#!/usr/bin/env node
const {
  getConfiguration,
  ensureOutput,
  copyFiles,
  transformOutput,
} = require('.');

(async () => {
  const config = await getConfiguration();
  await ensureOutput(config.output);
  const files = await copyFiles(
    config.input,
    config.output,
    config.extension.change,
    config.forceDirectory,
  );
  await transformOutput(files, config);
})();
