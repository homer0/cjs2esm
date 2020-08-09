# CJS 2 ESM

[![GitHub Workflow Status (master)](https://img.shields.io/github/workflow/status/homer0/cjs2esm/Test/master?style=flat-square)](https://github.com/homer0/cjs2esm/actions?query=workflow%3ATest)
[![Coveralls github](https://img.shields.io/coveralls/github/homer0/cjs2esm.svg?style=flat-square)](https://coveralls.io/github/homer0/cjs2esm?branch=master)
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

// Become

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

# Yarn
yarn cjs2esm

# NPM
npx cjs2esm
```

### Configuration

The tool has a lot of different settings you can change to customize how the imports and extensions are handled:

```js
module.exports = {
  input: ['src'],
  output: 'esm',
  forceDirectory: null,
  modules: [],
  extension: {
    use: 'js',
    ignore: [],
  },
  addModuleEntry: false,
  addPackageJson: true,
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

```diff
- const ObjectUtils = require('wootils/shared/objectUtils');
+ import ObjectUtils from 'wootils/esm/shared/objectUtils.js';
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

## ⚙️ Development

### NPM/Yarn tasks

| Task       | Description                         |
|------------|-------------------------------------|
| `test`     | Run the project unit tests.         |
| `lint`     | Lint the modified files.            |
| `lint:all` | Lint the entire project code.       |
| `docs`     | Generate the project documentation. |
| `todo`     | List all the pending to-do's.       |


### Repository hooks

I use [`husky`](https://yarnpkg.com/package/husky) to automatically install the repository hooks so the code will be tested and linted before any commit and the dependencies updated after every merge.

The configuration is on the `husky` property of the `package.json` and the hooks' files are on `./utils/hooks`.

#### Commits convention

I use [conventional commits](https://www.conventionalcommits.org) with [`commitizen`](https://yarnpkg.com/package/commitizen) in order to support semantic releases. The one that sets it up is actually husky, that installs a script that runs commitizen on the `git commit` command.

The hook for this is on `./utils/hooks/prepare-commit-msg` and the configuration for comitizen is on the `config.commitizen` property of the `package.json`.

### Releases

I use [`semantic-release`](https://yarnpkg.com/package/semantic-release) and a GitHub action to automatically release on NPM everything that gets merged to master.

The configuration for `semantic-release` is on `./releaserc` and the workflow for the release is on `./.github/workflow/release.yml`.

### Testing

I use [Jest](https://facebook.github.io/jest/) to test the project.

The configuration file is on `./.jestrc.json`, the tests are on `./tests` and the script that runs it is on `./utils/scripts/test`.

### Linting

I use [ESlint](http://eslint.org) with [my own custom configuration](http://yarnpkg.com/en/package/eslint-plugin-homer0) to validate all the JS code. The configuration file for the project code is on `./.eslintrc` and the one for the tests is on `./tests/.eslintrc`. There's also an `./.eslintignore` to exclude some files on the process. The script that runs it is on `./utils/scripts/lint`.

### Documentation

I use [JSDoc](https://jsdoc.app) to generate an HTML documentation site for the project.

The configuration file is on `./.jsdoc.js` and the script that runs it is on `./utils/scripts/docs`.

### To-Dos

I use `@todo` comments to write all the pending improvements and fixes, and [Leasot](https://yarnpkg.com/en/package/leasot) to generate a report. The script that runs it is on `./utils/scripts/todo`.

## 💡 Motivation

I maintain a lot of open source projects (that only I use :P), and most of them are Node libraries and I alway respect the good practice of giving support to the oldes LTS, currently `v10`.

Node started supporting ES Modules, without a flag, starting on `v14`, so I can't ship a ESM-only version... I would need to transpile the code.

**I don't want to add transpilation just for this**, Node `v10` has enough features that I don't need Babel, which means that I don't have to use `babel-eslint` to lint, nor configure Jest for transpilation.

So I started looking for something that would transpile from CJS to ESM, but most of the tooling out there are for ESM to CJS, "code with modern syntax, transpile for legay"... Node `v12`, the active LTS, only supports ESM if you use a flag, so we are not talking about a really legacy functionality here.

The thing I like the least from transpiling from ESM to CJS is that if you use CJS, you have to use `require('something').default`, as `export default` becomes `exports.default`; I've had to update a lot of tools for this kind of changes (on the `webpack` ecosystem)...That's a sh*#ty experience.

I found `jscodeshift` and the `5to6` codemod, that are normally used to migrate a project to ESM and I adapted so it can cover a couple more issues (like extensions and the `package.json`).

It's not as fast as Babel, running it on [Jimpex](https://github.com/homer0/jimpex) (~40 files), takes ~12seg, but you would only run it on your CI, or once or twice to see what generates.

I believe it's a better experencie to have the ESM version on a different path :D.

Enjoy 🤘!

> Once `v14` becomes the oldest LTS, I'll archive this repository and deprecate the tool.
