/**
 * @typedef {Object} ESMModules
 * @property {Object} chalk  To colorize the output.
 * @ignore
 */

/**
 * This variable is used to cache the result of `require` for `chalk` and avoid having to
 * do it multiple times.
 *
 * @type {ESMModules | null}
 */
let esmModules = null;
/**
 * Load ESM modules so they can be used in CJS context.
 *
 * @returns {Promise<void>}
 * @ignore
 */
const prepareESMModules = async () => {
  if (esmModules) {
    // eslint-disable-next-line no-console
    console.warn('ESM modules are already loaded.');
    return;
  }

  esmModules = {};
  await Promise.all(
    ['chalk'].map(async (name) => {
      esmModules[name] = await import(name);
    }),
  );
};
/**
 * Get an ESM module that was previously loaded with `prepareESMModules`.
 *
 * @param {string} name  The name of the ESM module to get.
 * @returns {Object}
 * @throws {Error} If `prepareESMModules` has not been called.
 * @throws {Error} If the module is not found.
 * @ignore
 */
const getESMModule = (name) => {
  if (!esmModules) {
    throw new Error('ESM modules are not loaded.');
  }

  if (!esmModules[name]) {
    throw new Error(`ESM module "${name}" is not loaded.`);
  }

  return esmModules[name];
};
/**
 * Get a reference for `chalk` module.
 *
 * @returns {Object}
 */
const getChalk = () => getESMModule('chalk');

module.exports.prepareESMModules = prepareESMModules;
module.exports.getESMModule = getESMModule;
module.exports.getChalk = getChalk;
