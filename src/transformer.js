const path = require('path');
const fs = require('fs-extra');
/**
 * @typedef {import('jscodeshift').API} API
 * @typedef {import('jscodeshift').FileInfo} FileInfo
 * @typedef {import('./').CJS2ESMOptions} CJS2ESMOptions
 * @typedef {import('path').ParsedPath} ParsedPath
 */

/**
 * @typedef {Object} TransformOptions
 * @property {CJS2ESMOptions} cjs2esm The options sent to the main tool. Needed to validate how
 *                                    the extension should be handled.
 */

/**
 * @typedef {Object} ImportTypeInfo
 * @property {string}  path      The complete, absolute, path to the file/folder.
 * @property {boolean} isFile    Whether or not the import is for a file.
 * @property {?string} extension If the import is for a file, this will be its extension.
 */

/**
 * Given a list of file names and a directory, the function will try to find the first file that
 * exists.
 * The reason this is sync it's because the transformation can't use promises.
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
  if (result.ext && !result.match(/\.m?js$/i)) {
    result.name = `${result.name}${result.ext}`;
    result.ext = '';
  }

  return result;
};
/**
 * Creates the replacement path for an import statement for a folder. It validates if the folder
 * has a `package.json`, to keep it as it is, and if it fails, it tries to find an index files,
 * `.mjs` or `.js`.
 *
 * @param {string} absPath    The absolute path for the folder.
 * @param {string} importPath The path as it is on the import statement.
 * @returns {string}
 */
const createReplacementForFolder = (absPath, importPath) => {
  let result;
  const pkgPath = path.join(absPath, 'package.json');
  const pkgExists = fs.pathExistsSync(pkgPath);
  if (pkgExists) {
    result = importPath.replace(/\/$/, '');
  } else {
    const file = findFileSync(['index.mjs', 'index.js'], absPath);
    result = file ?
      path.join(importPath, path.basename(file)) :
      null;
  }

  return result;
};
/**
 * Tries to find the extension for a file import path.
 *
 * @param {string} absPath The generated absolute path for the file.
 * @returns {?string}
 */
const findFileExtension = (absPath) => {
  const info = path.parse(absPath);
  const name = info.name.replace(/\.$/, '');
  const file = findFileSync(
    [`${name}.mjs`, `${name}.js`],
    info.dir,
  );

  return file ? path.parse(file).ext : null;
};
/**
 * Given the aboslute path for an import statement, the method will validate if its for a folder,
 * a file, and if it's for a file, it will complete its extension in case it's missing.
 *
 * @param {string} absPath The absolute path for the resource.
 * @returns {?ImportTypeInfo}
 */
const getImportTypeInfo = (absPath) => {
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
      const extension = findFileExtension(absPath);
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
 * This is the transformation for `jscodeshift` the tool uses to modify import statements, add
 * missing `.mjs` extensions and change paths if needed.
 *
 * @param {FileInfo}         file    The information of the file to transform.
 * @param {API}              api     The API that expose `jscodeshift`, with utilities for the
 *                                   transformation.
 * @param {TransformOptions} options These options are sent by `jscodeshift`, but the tool injected
 *                                   its own options so the transformation can access to the
 *                                   settings related to the extension.
 * @returns {string}
 */
const transform = (file, api, options) => {
  const j = api.jscodeshift;
  // Extract the tool options.
  const { cjs2esm } = options;
  // Get the absolute path to the file directory, so it can be joined with the imports.
  const base = path.dirname(file.path);
  // Generate the AST.
  const root = j(file.source);
  // Generate the list of expressions to ignore import statements.
  const ignoreListForExt = cjs2esm.extension.ignore
  .map((ignore) => new RegExp(ignore));

  // Get the list of import statements on the file.
  const imports = root.find(j.ImportDeclaration)
  .filter((item) => {
    const importPath = item.value.source.value;
    return (
      importPath.startsWith('.') ||
      importPath.match(/^\w/)
    );
  });
  // =================================================
  // Parse the import statements to add missing extensions.
  // =================================================
  imports
  // Filter out the ones that are on the ignore list.
  .filter((item) => {
    const importPath = item.value.source.value;
    return !ignoreListForExt.some((exp) => importPath.match(exp));
  })
  .replaceWith((item) => {
    const importPath = item.value.source.value;
    // Resolve the absolute path for the import statement.
    const absPath = importPath.startsWith('.') ?
      path.join(base, importPath) :
      path.resolve('node_modules', importPath);
    const info = getImportTypeInfo(absPath);
    let replacement;
    if (info === null) {
      // No info was found, so "don't replace it".
      replacement = importPath;
    } else if (info.isFile) {
      // Join the import path directory with the real filename from the info.
      replacement = path.join(
        path.dirname(importPath),
        path.basename(info.path),
      );
    } else {
      // If it's a directory, call the function that checks for a `package.json` or an `index`.
      replacement = createReplacementForFolder(absPath, importPath);
    }

    /**
     * This is a hotfix; when you use `path.join()` with a path that starts with `./`, the
     * function removes it, but that's needed for import statements: if they path doesn't
     * starts with `.`, it assumes that it's on `node_modules`.
     */
    if (importPath.startsWith('./') && !replacement.startsWith('./')) {
      replacement = `./${replacement}`;
    }

    // Replace the node with a new one on the AST.
    return j.importDeclaration(item.value.specifiers, j.literal(replacement));
  });
  // =================================================
  // Parse the modules modifications.
  // =================================================
  if (cjs2esm.modules.length) {
    imports
    // Filter out the import statments that don't need to be modified.
    .filter((item) => {
      const importPath = item.value.source.value;
      return cjs2esm.modules.some((mod) => importPath.startsWith(mod.name));
    })
    // Apply the modifications.
    .replaceWith((item) => {
      const importPath = item.value.source.value;
      const info = cjs2esm.modules.find((mod) => importPath.startsWith(mod.name));
      const find = info.find ?
        new RegExp(info.find) :
        new RegExp(`^${info.name}`);
      const replacement = importPath.replace(find, info.path);

      return j.importDeclaration(item.value.specifiers, j.literal(replacement));
    });
  }

  // Regenerate the file code.
  return root.toSource({
    quote: 'single',
  });
};

module.exports = transform;
