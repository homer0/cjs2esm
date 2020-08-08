const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const Runner = require('jscodeshift/src/Runner');
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
/**
 * Finds all the JavaScript files on a given directory.
 *
 * @param {string} directory The absolute path to the directory.
 * @returns {Promise<string[]>}
 */
const findFiles = async (directory) => {
  let result = await fs.readdir(directory);
  result = result.filter((item) => !item.startsWith('.'));
  result = await Promise.all(result.map(async (item) => {
    const itempath = path.join(directory, item);
    const stats = await fs.stat(itempath);
    let newItem;
    if (stats.isDirectory()) {
      newItem = await findFiles(itempath);
    } else if (item.match(/\.js$/i)) {
      newItem = itempath;
    } else {
      newItem = null;
    }

    return newItem;
  }));

  result = result.filter((item) => item !== null);
  return result;
};
/**
 * Copies all the files from a source directory to the output directory, changing the extensions
 * if required.
 *
 * @param {string}  directory           The source directory from where the files will be copied.
 * @param {string}  output              The output directory where the files should be copied to.
 * @param {boolean} changeExtension     Whether or not to change the extensions to `.mjs`.
 * @param {boolean} [useDirectory=true] If `false`, the directory itself won't be copied, just its
 *                                      contents.
 * @returns {Promise<string[]>}
 */
const copyDirectory = async (directory, output, changeExtension, useDirectory = true) => {
  const cwd = process.cwd();
  let contents = await findFiles(directory);
  contents = await Promise.all(contents.map(async (item) => {
    let cleanPath = item.substr(cwd.length + 1);
    if (!useDirectory) {
      cleanPath = cleanPath.split(path.sep);
      cleanPath.shift();
      cleanPath = cleanPath.join(path.sep);
    }

    let newPath = path.join(output, cleanPath);
    if (changeExtension) {
      newPath = newPath.replace(/\.js$/i, '.mjs');
    }

    await fs.ensureDir(path.dirname(newPath));
    await fs.copyFile(item, newPath);
    return newPath;
  }));

  return contents;
};
/**
 * Copies all the files the tool will transpile.
 *
 * @param {string[]} input           The list of source paths where the files are located.
 * @param {string}   output          The output path where all the files will be transpiled to.
 * @param {boolean}  changeExtension Whether or not to change the extensions to `.mjs`.
 * @param {?boolean} useDirectory    By default, if `input` has only one directory, the only thing
 *                                   copied will be its contents, instead of the directory itself;
 *                                   this parameter can be used to force it and always copy the
 *                                   directory.
 *
 * @returns {string[]}
 */
const copyFiles = async (input, output, changeExtension, useDirectory) => {
  let result;
  if (input.length === 1) {
    const [firstInput] = input;
    result = await copyDirectory(
      firstInput,
      output,
      changeExtension,
      useDirectory === true,
    );
  } else {
    result = await Promise.all(input.map((item) => copyDirectory(
      item,
      output,
      changeExtension,
    )));

    result = result.reduce((acc, item) => [...acc, ...item], []);
  }

  return result;
};
/**
 * Transforms all files from the output directory into ES Modules.
 *
 * @param {string[]} files  The list of files that were copied to the output directory.
 * @param {string}   output The absolute path to the output directory.
 * @returns {Promise}
 * @throws {Error} If there's a problem while transforming a file.
 */
const transformOutput = async (files, output) => {
  const extension = files[0].match(/\.mjs$/i) ? 'mjs' : 'js';
  const options = {
    verbose: 0,
    dry: false,
    print: false,
    babel: true,
    extension,
    ignorePattern: [],
    ignoreConfig: [],
    runInBand: false,
    silent: true,
    parser: 'babel',
  };

  const transformations = [
    path.resolve('node_modules', '5to6-codemod', 'transforms', 'cjs.js'),
    path.resolve('node_modules', '5to6-codemod', 'transforms', 'exports.js'),
  ];

  log('yellow', `Transforming ${files.length} files...`);

  const results = await transformations.reduce(
    (acc, transformation) => acc.then((prevStats) => (
      Runner.run(transformation, [output], options)
      .then((stats) => [...prevStats, stats])
    )),
    Promise.resolve([null]),
  );

  results.shift();
  const errorIndex = results.findIndex((stats) => (stats.ok + stats.nochange) !== files.length);
  if (errorIndex > -1) {
    let transformationError = transformations[errorIndex];
    transformationError = path.parse(transformationError).name;
    throw new Error(`At least one file couldn't be transformed with \`${transformationError}\``);
  }

  const cwd = process.cwd();
  files.forEach((file) => log('gray', `> ${file.substr(cwd.length + 1)}`));
  log('green', 'All files were successfully transformed!');
};

module.exports.getConfiguration = getConfiguration;
module.exports.ensureOutput = ensureOutput;
module.exports.copyFiles = copyFiles;
module.exports.transformOutput = transformOutput;
