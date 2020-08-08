const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const { name } = require('../package.json');
/**
 * @typedef {Object} CJS2ESMModuleOption
 * @property {string}             name     The name of the module.
 * @property {'path'|'extension'} strategy The strategy the tool will use to transform the import.
 * @property {?string}            path     When `strategy` is `path`, this property will be used to
 *                                         change the import path. For example, if the module is
 *                                         `wootils`, this can be set to `wootils/esm`.
 */

/**
 * @typedef {Object} CJS2ESMOptions
 * @property {string[]}              input     The list of directories that should be transformed.
 * @property {string}                output    The directory where the transformed code should be
 *                                             placed.
 * @property {?boolean}              directory By default, if `input` has only one directory, the
 *                                             only thing copied will be its contents, instead of
 *                                             the directory itself; this flag can be used to force
 *                                             it and always copy the directory.
 * @property {CJS2ESMModuleOption[]} modules   Special configurations for modules with ESM versions.
 * @property {boolean}               extension Whether or not to change the extensions of the
 *                                             transpiled files to `.mjs`.
 */

/**
 * Logs messages prefixed with the name of the project and with a specified color.
 * Yes, this is a proxy-like function for `console.log` with `chalk`.
 *
 * @param {string}   color The color from `chalk` that should be used.
 * @param {string[]} args  The list of messages to log.
 */
const log = (color, ...args) => {
  // eslint-disable-next-line no-console
  console.log(...[`[${name}]`, ...args].map((item) => chalk[color](item)));
};

/**
 * Given a list of file names and a directory, the function will find the first file that exists.
 *
 * @param {string[]} list      The list of files to test.
 * @param {string}   directory The base directory where the paths will be tested.
 * @returns {Promise<?string>}
 */
const findFile = async (list, directory) => {
  let result;
  for (let i = 0; i < list.length; i++) {
    const test = path.join(directory, list[i]);
    // eslint-disable-next-line no-await-in-loop
    const exists = await fs.pathExists(test);
    if (exists) {
      result = test;
      break;
    }
  }

  return result || null;
};
/**
 * Loads the configuration for the project.
 *
 * @returns {Promise<CJS2ESMOptions>}
 */
const getConfiguration = async () => {
  log('yellow', 'Loading configuration...');
  const cwd = process.cwd();
  const file = await findFile(
    [
      '.cjs2esm',
      '.cjs2esm.json',
      '.cjs2esm.js',
    ],
    cwd,
  );

  let config = {};
  if (file === null) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const pckJson = require(path.join(cwd, 'package.json'));
    if (pckJson.config && pckJson.config.cjs2esm) {
      config = pckJson.config.cjs2esm;
      log('green', 'Using configuration from the package.json');
    } else if (pckJson.cjs2esm) {
      config = pckJson.cjs2esm;
      log('green', 'Using configuration from the package.json');
    } else {
      log('gray', 'No configuration was found, using defaults...');
    }
  } else if (file.match(/\.js$/i)) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    config = require(file);
    log('green', `Configuration file found: \`${file}\``);
  } else {
    config = await fs.readJSON(file);
    log('green', `Configuration file found: \`${file}\``);
  }

  const result = {
    input: ['src'],
    output: 'esm',
    directory: null,
    modules: [],
    extension: true,
    ...config,
  };

  result.input = result.input.map((item) => path.join(cwd, item));
  result.output = path.join(cwd, result.output);
  return result;
};
/**
 * Ensures the output directory exists and it's empty. If the directory exists, it removes it and
 * then creates it again.
 *
 * @param {string} output The output directory the tool will use.
 * @returns {Promise}
 */
const ensureOutput = async (output) => {
  const exists = await fs.pathExists(output);
  if (exists) {
    await fs.remove(output);
  }

  await fs.mkdir(output);
  log('green', 'Output directory successfully cleaned');
};

module.exports.getConfiguration = getConfiguration;
module.exports.ensureOutput = ensureOutput;
