# CJS 2 ESM

[![GitHub Workflow Status (main)](https://img.shields.io/github/workflow/status/homer0/cjs2esm/Test/main?style=flat-square)](https://github.com/homer0/cjs2esm/actions?query=workflow%3ATest)
[![Coveralls github](https://img.shields.io/coveralls/github/homer0/cjs2esm.svg?style=flat-square)](https://coveralls.io/github/homer0/cjs2esm?branch=main)
[![David](https://img.shields.io/david/homer0/cjs2esm.svg?style=flat-square)](https://david-dm.org/homer0/cjs2esm)
[![David](https://img.shields.io/david/dev/homer0/cjs2esm.svg?style=flat-square)](https://david-dm.org/homer0/cjs2esm)

Transforms a project that uses CommonJS to ES Modules.

## 📝 Introduction

> If you are wondering why I built this, go to the [Motivation](#motivation) section.

You can use this tool to transform a project that uses **CommonJS** to **ES Modules** and get it ready for Node `v14`, any module bundler with **ESM** support, or even [`typedef` imports on JSDoc](https://github.com/homer0/jsdoc-ts-utils#import-type-defintions).

This tool internally uses [`jscodeshift`](https://github.com/facebook/jscodeshift) with the transformations from [`5to6`](https://github.com/5to6/5to6-codemod) and an extra one created to fix missing extensions.

## ⚡️ Examples

### Require

```js
const { Jimpex } = require('jimpex');
const ObjectUtils = require('wootils/shared/objectUtils');
require('./homer0');

// Becomes

import { Jimpex } from 'jimpex';
import ObjectUtils from 'wootils/shared/objectUtils.js';
import './homer0/index.js';
```

It validates if the file needs an extension `.mjs` or `.js` by checking if the statement is for a directory and there's `package.json` in there.

If there's no `package.json`, it tries to find `index.mjs` or `index.js`.

### Exports

```js
module.exports = Rosario;
module.exports.Pilar = Pilar;

module.exports = {
  Rosario,
  Pilar,
};

// Becomes

export default Rosario;
export { Pilar }

const exported = { Rosario, Pilar };
export default exported;
export { Rosario, Pilar };
```

## 🚀 Usage

The package comes with a binary that you can execute from your `package.json`, or with `npm`/`yarn`:

```bash
# From the package.json
cjs2esm

# NPM
npx cjs2esm

# Yarn
yarn cjs2esm

```

### Configuration

The tool has a lot of different settings you can change to customize how the imports and extensions are handled:

```js
module.exports = {
  input: ['src'],
  ignore: [],
  output: 'esm',
  forceDirectory: null,
  modules: [],
  extension: {
    use: 'js',
    ignore: [],
  },
  addModuleEntry: false,
  addPackageJson: true,
  filesWithShebang: [],
  codemod: {
    path: '',
    files: ['cjs', 'exports', 'named-export-generation'],
  },
};
```

To modify the settings, you can...

1. Create a property `cjs2esm` on your `package.json`.
2. Create a property `cjs2esm` inside the `config` object of your `package.json`.
3. Create a `.cjs2esm` file that uses JSON syntax.
4. Create a `.cjs2esm.json` file.
5. Create a `.cjs2esm.js` file and use `module.exports` to export the settings (like on the example above).

#### .input

The list of directories that should be transformed.

> Default `['src']`

#### .ignore

A list of expressions (strings that will be converted on `RegExp`) to specify files/paths that should be ignored.

When a path is ignored, not only doesn't it get transformed, but it also doesn't get copied to the output directory.

#### .output

The directory where the transformed code should be placed.

> Default `esm`

#### .forceDirectory

By default, if `input` has only one directory, the only thing copied will be its contents, instead of the directory itself; this flag can be used to force force it and always copy the directory.

**This is a `boolean` setting**, using `null` means that the tool gets to decide.

> Default `null`

#### .modules

This is a list of modifiers for imports of specific modules and that can be used to change their paths. Yes, pretty complicated to explain, an example will be better:

The module `wootils` uses this tool and generates an ESM version on a `esm` diretory, so we need to change all the imports for `wootils` so they'll use `wootils/esm`:

```js
const options = {
  // ...
  modules: {
    name: 'wootils',
    path: 'wootils/esm',
  },
};
```

Now, when tool gets executed, it will perform the following change:

```js
// From
const ObjectUtils = require('wootils/shared/objectUtils');
// To
import ObjectUtils from 'wootils/esm/shared/objectUtils.js';
```

> Default `[]`

#### .extension

Starting on Node `v14`, when you are using ESM, and unless there's a `package.json` specifying the `type` `modules`, you'll need all your imports to have file extensions.

This group of settings are specific for how the tool handles the extensions.

##### .use

The extensions the files need to have; it can be `js` or `mjs`.

If you `use` `mjs`, when transforming the project files, all filenames will be renamed.

> Default `js`

##### .ignore

A list of expressions (strings that will be converted on `RegExp`) to ignore import statements when validating the use of extensions.

> Default `[]`

#### .addModuleEntry

Whether or not to modify the project `package.json` and add a `module` property with the path to the transformed entry file. This will only work if the project has a `main` property and the file it points to was transformed.

> Default `false`

#### .addPackageJson

Whether or not to add a `package.json` with `type` set to `module` on the `output` directory.

> Default `true`

#### .filesWithShebang

The list of files that have a shebang, as the tool needs to remove it before transforming them in order to avoid issues with the parsers. The list are strings that will be converted on into `RegExp`s, so they can be a parts of the path, or expressions.

For example, this project uses `src/bin.js`.

> Default `[]`

#### .codemod

Due to the `jscodeshift` and `5to6-codemod` projects not being updated quite often, it's not hard to run on scenarios in which your code is not compatible with the transformations, so this group of settings will allow you to run custom versions of the codemod, change the order fo the transformations, and even are your own.

##### .path

This is the path, relative to the working directory, in which the transformation files are located.

> Default `''` // On runtime, it gets resolved to `5to6-codemod/transforms`

##### .files

These are the name of the files for the transformations, inside the `path` directory.

The list can also be used to change the order of the default transformations, and it can also contain the `<cjs2esm>` special keyword, which references the tranformation file this package uses.

For example:

```json
{
  "files": [
    "cjs",
    "<cjs2esm>",
    "named-export-generation",
  ]
}
```

With that, `exports` wouldn't be used, and the package transformation would run before `named-export-generation`.

Local transformation files can also be specified, using path relatives to the working directory:

```json
{
  "files": [
    "cjs",
    "<cjs2esm>",
    "./my-custom-transformation",
    "named-export-generation",
  ]
}
```

- ⚠️ If the list is empty, it will use the default value.
- ⚠️ The `<cjs2esm>` cannot be used as the first item in the list.
- ⚠️ The names can't contain the extension, and they need to be `.js` files.

> Default `['cjs', 'exports', 'named-export-generation']`

## ES Modules

Yes, if you want to use the tool as a library, the tool uses itself to generate a ESM version, so you can use the `/esm` path to access it:

```js
// commonjs
const { prepare, getConfiguration } = require('cjs2esm');

// ESM
import { prepare, getConfiguration } from 'cjs2esm/esm';

// #dogfooding
```

> Check `src/index.js` to see how the API is used.

## ⚙️ Development

### Scripts

| Script     | Description                         |
|------------|-------------------------------------|
| `test`     | Run the project unit tests.         |
| `lint`     | Lint the modified files.            |
| `lint:all` | Lint the entire project code.       |
| `docs`     | Generate the project documentation. |
| `todo`     | List all the pending to-do's.       |


### Repository hooks

I use [`husky`](https://www.npmjs.com/package/husky) to automatically install the repository hooks so the code will be tested and linted before any commit, and the dependencies updated after every merge.

#### Commits convention

I use [conventional commits](https://www.conventionalcommits.org) with [`commitlint`](https://commitlint.js.org) in order to support semantic releases. The one that sets it up is actually husky, that installs a script that runs `commitlint` on the `git commit` command.

The configuration is on the `commitlint` property of the `package.json`.

### Releases

I use [`semantic-release`](https://www.npmjs.com/package/semantic-release) and a GitHub action to automatically release on NPM everything that gets merged to main.

The configuration for `semantic-release` is on `./releaserc` and the workflow for the release is on `./.github/workflow/release.yml`.

### Testing

I use [Jest](https://facebook.github.io/jest/) to test the project.

The configuration file is on `./.jestrc.js`, the tests are on `./tests` and the script that runs it is on `./utils/scripts/test`.

### Linting && Formatting

I use [ESlint](https://eslint.org) with [my own custom configuration](https://www.npmjs.com/package/@homer0/eslint-plugin) to validate all the JS code. The configuration file for the project code is on `./.eslintrc` and the one for the tests is on `./tests/.eslintrc`. There's also an `./.eslintignore` to exclude some files on the process. The script that runs it is on `./utils/scripts/lint-all`.

For formatting I use [Prettier](https://prettier.io) with [my custom configuration](https://www.npmjs.com/package/@homer0/prettier-config). The configuration file for the project code is on `./.prettierrc`.

### Documentation

I use [JSDoc](https://jsdoc.app) to generate an HTML documentation site for the project.

The configuration file is on `./.jsdoc.js` and the script that runs it is on `./utils/scripts/docs`.

### To-Dos

I use `@todo` comments to write all the pending improvements and fixes, and [Leasot](https://www.npmjs.com/package/leasot) to generate a report. The script that runs it is on `./utils/scripts/todo`.

## 💡 Motivation

I maintain a lot of open source projects (that only I use :P), most of them are Node libraries, and I alway respect the good practice of giving support to the oldest LTS, currently `v10` (for two more weeks).

**I don't want to add transpilation just for this**, Node `v10` has enough features that I don't need Babel, which means that I don't have to use `babel-eslint` to lint, nor configure Jest for transpilation.

So I started looking for something that would transpile from CJS to ESM, but most of the tooling out there are for ESM to CJS, "code with modern syntax, transpile for legacy"... Node `v12`, the active LTS (soon to be the oldest), now supports ESM, but you cannot `require` an ESM module, even if it's natively supported.

The thing I like the least from transpiling from ESM to CJS is that if you use CJS, you have to use `require('something').default`, as `export default` becomes `exports.default`; I've had to update a lot of tools for this kind of changes (on the `webpack` ecosystem)...That's a sh*#ty experience.

I found `jscodeshift` and the `5to6` codemod, that are normally used to migrate a project to ESM and I adapted so it can cover a couple more issues (like extensions and the `package.json`).

It's not as fast as Babel, running it on [Jimpex](https://github.com/homer0/jimpex) (~40 files), takes ~12seg, but you would only run it on your CI, or once or twice to see what generates.

I believe it's a better experencie to have the ESM version on a different path :D.

Enjoy 🤘!

> ~~Once `v14` becomes the oldest LTS, I'll archive this repository and deprecate the tool.~~
> Node 12 now supports ESM without a flag, but there are still a lot of things that use CommonJS, and the fact that you can't `require` ESM makes things complicated, so I'm not sure yet when I'll deprecate the tool.
> Update: 2022, and the interop is still a mess, so I'm not sure when I'll deprecate the tool.
