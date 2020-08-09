#!/usr/bin/env node
const {
  getConfiguration,
  ensureOutput,
  copyFiles,
  transformOutput,
  updatePackageJSON,
} = require('.');

(async () => {
  const config = await getConfiguration();
  await ensureOutput(config.output);
  const files = await copyFiles(
    config.input,
    config.output,
    config.extension.use,
    config.forceDirectory,
  );
  await transformOutput(files, config);
  if (config.addModuleEntry) {
    await updatePackageJSON(files);
  }
})();
