#!/usr/bin/env node
const {
  getConfiguration,
  ensureOutput,
  copyFiles,
} = require('.');

(async () => {
  const config = await getConfiguration();
  await ensureOutput(config.output);
  const files = await copyFiles(
    config.input,
    config.output,
    config.extension,
    config.directory,
  );

  // eslint-disable-next-line no-console
  console.log(files);
})();
