const path = require('path');
const fs = require('fs-extra');

/**
 * @typedef {import('jscodeshift').API} API
 * @typedef {import('jscodeshift').FileInfo} FileInfo
 */

/**
 * This is a transformation for `jscodeshift` that checks import statements in order to add
 * missing `.mjs` extensions, or, if the path is a folder, the `index.mjs`.
 *
 * @param {FileInfo} file The information of the file to transform.
 * @param {API}      api  The API that expose `jscodeshift`, with utilities for the transformation.
 *
 * @returns {string}
 */
const transform = (file, api) => {
  const j = api.jscodeshift;
  const base = path.dirname(file.path);
  const root = j(file.source);

  root.find(j.ImportDeclaration)
  .filter((item) => (
    item.value.source.value.startsWith('.') ||
    item.value.source.value.match(/^\w/)
  ))
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
