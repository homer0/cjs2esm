/**
 * @typedef {Object} CJS2ESMModuleOption
 * @property {string}  name The name of the module, or the beginning of an import path. This will
 *                          be converted into a `RegExp`, so it can be a expression too.
 * @property {?string} find Optionally, instead of replacing `name` on the path, this property can
 *                          be used to define a custom `RegExp` string.
 * @property {string}  path The custom path for the ESM version.
 */

/**
 * @typedef {'js'|'mjs'} ModuleExtension
 */

/**
 * @typedef {Object} CJS2ESMExtensionOptions
 * @property {ModuleExtension} use    Which extension should be used.
 * @property {string[]}        ignore A list of expressions (strings that will be converted on
 *                                    `RegExp`) to ignore import statements when validating the use
 *                                    of extensions.
 */

/**
 * @typedef {Object} CJS2ESMOptions
 * @property {string[]} input
 * The list of directories that should be transformed.
 * @property {string} output
 * The directory where the transformed code should be placed.
 * @property {?boolean} forceDirectory
 * By default, if `input` has only one directory, the only thing copied will be its contents,
 * instead of the directory itself; this flag can be used to force force it and always copy the
 * directory.
 * @property {CJS2ESMModuleOption[]} modules
 * Special configurations for modules with ESM versions.
 * @property {CJS2ESMExtensionOptions} extension
 * How should the tool handle the `.mjs` extension.
 * @property {boolean} addModuleMain
 * Whether or not to modify the project `package.json` and add a `module` property with the
 * path to the transformed entry file. This will only work if the project has a `main` property
 * and the file it points to is being transformed.
 */

/**
 * @typedef {Object} CJS2ESMCopiedFile
 * @property {string} from The absolute path from where the file was copied.
 * @property {string} to   The absolute path to where the file was copied to. It may include a
 *                         change of extension if it was configured on the tool.
 */

/**
 * @typedef {Object} TransformOptions
 * @property {CJS2ESMOptions} cjs2esm The options sent to the main tool. Needed to validate how
 *                                    the extension should be handled.
 */

/**
 * @typedef {Object} AbsPathInfo
 * @property {string}  path      The complete, absolute, path to the file/folder.
 * @property {boolean} isFile    Whether or not the path is for a file.
 * @property {?string} extension If the path is for a file, this will be its extension.
 */
