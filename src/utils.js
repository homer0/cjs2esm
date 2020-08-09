const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const pkgJson = require('../package.json');

/**
 * @typedef {import('path').ParsedPath} ParsedPath
 */

/**
 * @typedef {Object} AbsPathInfo
 * @property {string}  path      The complete, absolute, path to the file/folder.
 * @property {boolean} isFile    Whether or not the path is for a file.
 * @property {?string} extension If the path is for a file, this will be its extension.
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
  console.log(...[`[${pkgJson.name}]`, ...args].map((item) => chalk[color](item)));
};
/**
 * Given a list of file names and a directory, the function will try find the first file that
 * exists.
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
 * Given a list of file names and a directory, the function will try to find the first file that
 * exists.
 *
 * @param {string[]} list      The list of files to test.
 * @param {string}   directory The base directory where the paths will be tested.
 * @returns {?string}
 */
const findFileSync = (list, directory) => {
  let result;
  for (let i = 0; i < list.length; i++) {
    const test = path.join(directory, list[i]);
    const exists = fs.pathExistsSync(test);
    if (exists) {
      result = test;
      break;
    }
  }

  return result || null;
};
/**
 * A special version of `path.parse` that validates if the file extension is `.js` or `.mjs`, and
 * if is not, in case it's something like `.config` or `.service`, it moves the extension to the
 * `name` and leaves `ext` empty.
 *
 * @param {string} filepath The file path to parse.
 * @returns {ParsedPath}
 */
const parseJSPath = (filepath) => {
  const result = path.parse(filepath);
  if (result.ext && !result.ext.match(/\.m?js$/i)) {
    result.name = `${result.name}${result.ext}`;
    result.ext = '';
  }

  return result;
};
/**
 * Tries to find the extension for a file import path.
 *
 * @param {string} absPath The generated absolute path for the file.
 * @returns {?string}
 */
const findFileExtension = async (absPath) => {
  const info = parseJSPath(absPath);
  const name = info.name.replace(/\.$/, '');
  const file = await findFile(
    [`${name}.mjs`, `${name}.js`],
    info.dir,
  );

  return file ? path.parse(file).ext : null;
};
/**
 * Tries to find the extension for a file import path.
 *
 * @param {string} absPath The generated absolute path for the file.
 * @returns {?string}
 */
const findFileExtensionSync = (absPath) => {
  const info = parseJSPath(absPath);
  const name = info.name.replace(/\.$/, '');
  const file = findFileSync(
    [`${name}.mjs`, `${name}.js`],
    info.dir,
  );

  return file ? path.parse(file).ext : null;
};
/**
 * Given an the aboslute path for an import/require statement, the method will validate if its for
 * a folder, a file, and if it's for a file, it will complete its extension in case it's missing.
 *
 * @param {string} absPath The absolute path for the resource.
 * @returns {?AbsPathInfo}
 */
const getAbsPathInfo = async (absPath) => {
  const info = parseJSPath(absPath);
  let result;
  if (info.ext) {
    result = {
      path: absPath,
      isFile: true,
      extension: info.ext,
    };
  } else {
    const exists = await fs.pathExists(absPath);
    if (exists) {
      result = {
        path: absPath.replace(/\/$/, ''),
        isFile: false,
        extension: null,
      };
    } else {
      const extension = await findFileExtension(absPath);
      if (extension) {
        result = {
          path: `${absPath}${extension}`,
          isFile: true,
          extension,
        };
      } else {
        result = null;
      }
    }
  }

  return result;
};
/**
 * Given an the aboslute path for an import/require statement, the method will validate if its for
 * a folder, a file, and if it's for a file, it will complete its extension in case it's missing.
 *
 * @param {string} absPath The absolute path for the resource.
 * @returns {?AbsPathInfo}
 */
const getAbsPathInfoSync = (absPath) => {
  const info = parseJSPath(absPath);
  let result;
  if (info.ext) {
    result = {
      path: absPath,
      isFile: true,
      extension: info.ext,
    };
  } else {
    const exists = fs.pathExistsSync(absPath);
    if (exists) {
      result = {
        path: absPath.replace(/\/$/, ''),
        isFile: false,
        extension: null,
      };
    } else {
      const extension = findFileExtensionSync(absPath);
      if (extension) {
        result = {
          path: `${absPath}${extension}`,
          isFile: true,
          extension,
        };
      } else {
        result = null;
      }
    }
  }

  return result;
};
/**
 * This function is just a proxy for `require` and it only exists to make testing the tool
 * easier: the test for this is just that returns the same as `require`, but on the files that
 * use it, with mocking this funcion is enough and there won't be any need for `resetModules`.
 *
 * @param {string} modulePath The path to the module to be required.
 * @returns {Object}
 */
const requireModule = (modulePath) => {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const result = require(modulePath);
  // And this variable only exists to avoid issues between the JSDoc block and ESLint.
  return result;
};

module.exports.log = log;
module.exports.findFile = findFile;
module.exports.findFileSync = findFileSync;
module.exports.getAbsPathInfo = getAbsPathInfo;
module.exports.getAbsPathInfoSync = getAbsPathInfoSync;
module.exports.requireModule = requireModule;
