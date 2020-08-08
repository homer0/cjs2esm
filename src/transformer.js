const path = require('path');
const fs = require('fs-extra');

/**
 * @typedef {import('jscodeshift').API} API
 * @typedef {import('jscodeshift').FileInfo} FileInfo
 * @typedef {import('./').CJS2ESMOptions} CJS2ESMOptions
 */

/**
 * @typedef {Object} TransformOptions
 * @property {CJS2ESMOptions} cjs2esm The options sent to the main tool. Needed to validate how
 *                                    the extension should be handled.
 */

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
  const { cjs2esm } = options;
  const base = path.dirname(file.path);
  const root = j(file.source);
  const ignoreListForExtension = options.cjs2esm.extension.ignoreImports
  .map((ignore) => new RegExp(ignore));
  const imports = root.find(j.ImportDeclaration)
  .filter((item) => {
    const relPath = item.value.source.value;
    return (
      relPath.startsWith('.') ||
      relPath.match(/^\w/)
    );
  });

  if (cjs2esm.extension.addOnImports) {
    imports
    .filter((item) => {
      const relPath = item.value.source.value;
      return !ignoreListForExtension.some((exp) => relPath.match(exp));
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
  }

  if (cjs2esm.modules.length) {
    imports
    .filter((item) => {
      const relPath = item.value.source.value;
      return cjs2esm.modules.some((mod) => relPath.startsWith(mod.name));
    })
    .replaceWith((item) => {
      const relPath = item.value.source.value;
      const info = cjs2esm.modules.find((mod) => relPath.startsWith(mod.name));
      const find = info.find ?
        new RegExp(info.find) :
        new RegExp(`^${info.name}`);
      const replacement = relPath.replace(find, info.path);

      return j.importDeclaration(item.value.specifiers, j.literal(replacement));
    });
  }

  return root.toSource({
    quote: 'single',
  });
};

module.exports = transform;
