const path = require('path');
const fs = require('fs-extra');

/**
 * @typedef {import('jscodeshift').API} API
 * @typedef {import('jscodeshift').FileInfo} FileInfo
 * @typedef {import('../').CJS2ESMOptions} CJS2ESMOptions
 */

/**
 * @typedef {Object} TransformOptions
 * @property {CJS2ESMOptions} cjs2esm The options sent to the main tool. Needed to validate how
 *                                    the extension should be handled.
 */

/**
 * This is a transformation for `jscodeshift` that checks import statements in order to add
 * missing `.mjs` extensions, or, if the path is a folder, the `index.mjs`.
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
  const base = path.dirname(file.path);
  const root = j(file.source);
  const ignoreList = options.cjs2esm.extension.ignoreImports.map((ignore) => new RegExp(ignore));

  root.find(j.ImportDeclaration)
  .filter((item) => {
    const relPath = item.value.source.value;
    return !ignoreList.some((exp) => relPath.match(exp)) &&
      (
        relPath.startsWith('.') ||
        relPath.match(/^\w/)
      );
  })
  .replaceWith((item) => {
    const relPath = item.value.source.value;
    const itemPath = relPath.startsWith('.') ?
      path.join(base, relPath) :
      path.resolve('node_modules', relPath);
    const existsPath = fs.pathExistsSync(itemPath);
    let replacement;
    if (existsPath) {
      replacement = relPath.replace(/\/$/, '');
      replacement = `${replacement}/index.mjs`;
    } else {
      replacement = `${relPath}.mjs`;
    }

    return j.importDeclaration(item.value.specifiers, j.literal(replacement));
  });

  return root.toSource({
    quote: 'single',
  });
};

module.exports = transform;
