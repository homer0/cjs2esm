#!/usr/bin/env node
const {
  prepare,
  getConfiguration,
  ensureOutput,
  copyFiles,
  transformOutput,
  updatePackageJSON,
  addPackageJSON,
  addErrorHandler,
} = require('.');

(async () => {
  await prepare();
  addErrorHandler();
  const config = await getConfiguration();
  await ensureOutput(config.output);
  const files = await copyFiles(
    config.input,
    config.output,
    config.extension.use,
    config.forceDirectory,
    config.ignore,
  );
  await transformOutput(files, config);
  if (config.addModuleEntry) {
    await updatePackageJSON(files);
  }
  if (config.addPackageJson) {
    await addPackageJSON(config.output);
  }
})();
