#!/usr/bin/env node
const { getConfiguration } = require('.');

(async () => {
  const config = await getConfiguration();
  // eslint-disable-next-line no-console
  console.log(config);
})();
