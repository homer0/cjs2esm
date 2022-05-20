jest.unmock('../src/index');
jest.mock('fs-extra');
jest.mock('jscodeshift/src/Runner');

const path = require('path');
const fs = require('fs-extra');
const Runner = require('jscodeshift/src/Runner');
const {
  getConfiguration,
  ensureOutput,
  copyFiles,
  transformOutput,
  updatePackageJSON,
  addPackageJSON,
  addErrorHandler,
  CJS2ESM_TRANSFORMATION_NAME,
} = require('../src');
const utils = require('../src/utils');

describe('index', () => {
  const cwd = process.cwd();

  describe('getConfiguration', () => {
    beforeEach(() => {
      utils.requireModule.mockClear();
      utils.findFile.mockClear();
      utils.log.mockClear();
      fs.readJSON.mockClear();
    });

    it('should load the default configuration', async () => {
      // Given
      utils.findFile.mockImplementationOnce(() => null);
      utils.requireModule.mockImplementationOnce(() => ({}));
      let result = null;
      // When
      result = await getConfiguration();
      // Then
      expect(result).toEqual({
        input: [path.resolve('src')],
        output: path.resolve('esm'),
        forceDirectory: null,
        modules: [],
        extension: {
          use: 'js',
          ignore: [],
        },
        addModuleEntry: false,
        addPackageJson: true,
        filesWithShebang: [],
      });
      expect(utils.findFile).toHaveBeenCalledTimes(1);
      expect(utils.findFile).toHaveBeenCalledWith(
        ['.cjs2esm', '.cjs2esm.json', '.cjs2esm.js'],
        cwd,
      );
      expect(utils.requireModule).toHaveBeenCalledTimes(1);
      expect(utils.requireModule).toHaveBeenCalledWith(path.join(cwd, 'package.json'));
      expect(utils.log).toHaveBeenCalledTimes(2);
    });

    it('should load the configuration from `config.cjs2esm` on the package.json', async () => {
      // Given
      utils.findFile.mockImplementationOnce(() => null);
      const config = {
        input: ['source'],
        output: 'esmodules',
        extension: {
          use: 'mjs',
        },
      };
      utils.requireModule.mockImplementationOnce(() => ({
        config: {
          cjs2esm: config,
        },
      }));
      let result = null;
      // When
      result = await getConfiguration();
      // Then
      expect(result).toEqual({
        input: [path.resolve(config.input[0])],
        output: path.resolve(config.output),
        forceDirectory: null,
        modules: [],
        extension: {
          use: 'js',
          ignore: [],
          ...config.extension,
        },
        addModuleEntry: false,
        addPackageJson: true,
        filesWithShebang: [],
      });
    });

    it('should load the configuration from `cjs2esm` on the package.json', async () => {
      // Given
      utils.findFile.mockImplementationOnce(() => null);
      const config = {
        input: ['source'],
        output: 'esmodules',
        extension: {
          use: 'mjs',
        },
      };
      utils.requireModule.mockImplementationOnce(() => ({
        cjs2esm: config,
      }));
      let result = null;
      // When
      result = await getConfiguration();
      // Then
      expect(result).toEqual({
        input: [path.resolve(config.input[0])],
        output: path.resolve(config.output),
        forceDirectory: null,
        modules: [],
        extension: {
          use: 'js',
          ignore: [],
          ...config.extension,
        },
        addModuleEntry: false,
        addPackageJson: true,
        filesWithShebang: [],
      });
    });

    it('should load the configuration from a .js file', async () => {
      // Given
      const configFile = '/some/path/.cjs2esm.js';
      utils.findFile.mockImplementationOnce(() => configFile);
      const config = {
        input: ['source'],
        output: 'esmodules',
        extension: {
          use: 'mjs',
        },
      };
      utils.requireModule.mockImplementationOnce(() => config);
      let result = null;
      // When
      result = await getConfiguration();
      // Then
      expect(result).toEqual({
        input: [path.resolve(config.input[0])],
        output: path.resolve(config.output),
        forceDirectory: null,
        modules: [],
        extension: {
          use: 'js',
          ignore: [],
          ...config.extension,
        },
        addModuleEntry: false,
        addPackageJson: true,
        filesWithShebang: [],
      });
    });

    it('should load the configuration from a JSON file', async () => {
      // Given
      const configFile = '/some/path/.cjs2esm.json';
      utils.findFile.mockImplementationOnce(() => configFile);
      const config = {
        input: ['source'],
        output: 'esmodules',
        extension: {
          use: 'mjs',
        },
      };
      fs.readJSON.mockImplementationOnce(() => config);
      let result = null;
      // When
      result = await getConfiguration();
      // Then
      expect(result).toEqual({
        input: [path.resolve(config.input[0])],
        output: path.resolve(config.output),
        forceDirectory: null,
        modules: [],
        extension: {
          use: 'js',
          ignore: [],
          ...config.extension,
        },
        addModuleEntry: false,
        addPackageJson: true,
        filesWithShebang: [],
      });
    });
  });

  describe('ensureOutput', () => {
    beforeEach(() => {
      fs.pathExists.mockClear();
      fs.remove.mockClear();
      fs.mkdir.mockClear();
      utils.log.mockClear();
    });

    it('should remove the directory if it exists and create it again', async () => {
      // Given
      const output = 'some/path/esm';
      fs.pathExists.mockImplementationOnce(() => true);
      // When
      await ensureOutput(output);
      // Then
      expect(fs.pathExists).toHaveBeenCalledTimes(1);
      expect(fs.pathExists).toHaveBeenCalledWith(output);
      expect(fs.remove).toHaveBeenCalledTimes(1);
      expect(fs.remove).toHaveBeenCalledWith(output);
      expect(fs.mkdir).toHaveBeenCalledTimes(1);
      expect(fs.mkdir).toHaveBeenCalledWith(output);
    });

    it("shouldn't try to remove the directory if it doesn't exist", async () => {
      // Given
      const output = 'some/path/esm';
      fs.pathExists.mockImplementationOnce(() => false);
      // When
      await ensureOutput(output);
      // Then
      expect(fs.pathExists).toHaveBeenCalledTimes(1);
      expect(fs.remove).toHaveBeenCalledTimes(0);
      expect(fs.mkdir).toHaveBeenCalledTimes(1);
    });
  });

  describe('copyFiles', () => {
    beforeEach(() => {
      fs.readdir.mockClear();
      fs.stat.mockClear();
      fs.ensureDir.mockClear();
      fs.copyFile.mockClear();
    });
    /**
     * Utility function to test the lists of copied files. The reason for this function is
     * that all files are copied in parallel, so we can't alaways expect the same order.
     *
     * @param {CJS2ESMCopiedFile[]} list  The list of copied files.
     * @returns {CJS2ESMCopiedFile[]}
     */
    const sortResults = (list) => {
      const newList = list.slice();
      newList.sort((a, b) => {
        const fromA = a.from;
        const fromB = b.from;
        let result;
        if (fromA > fromB) {
          result = 1;
        } else if (fromB > fromA) {
          result = -1;
        }

        return result;
      });

      return newList;
    };

    it('should copy the contents of a directory', async () => {
      // Given
      const src = path.join(cwd, 'src');
      const input = [src];
      const output = path.join(cwd, 'esm');
      const useExtension = 'js';
      const forceDirectory = false;
      const filesRoot = ['index.js', 'utils', 'README.md', '.eslintrc'];
      const filesUtils = ['index.js', 'utils.js'];
      fs.readdir.mockImplementationOnce(() => filesRoot);
      fs.readdir.mockImplementationOnce(() => filesUtils);
      /* eslint-disable jsdoc/require-jsdoc */
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => true }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      /* eslint-enable jsdoc/require-jsdoc */
      let result = null;
      const expectedResult = [
        {
          from: path.join(src, 'index.js'),
          to: path.join(output, 'index.js'),
        },
        {
          from: path.join(src, 'utils', 'index.js'),
          to: path.join(output, 'utils', 'index.js'),
        },
        {
          from: path.join(src, 'utils', 'utils.js'),
          to: path.join(output, 'utils', 'utils.js'),
        },
      ];
      // When
      result = await copyFiles(input, output, useExtension, forceDirectory);
      // Then
      expect(sortResults(result)).toEqual(expectedResult);
      expect(fs.readdir).toHaveBeenCalledTimes(2);
      expect(fs.readdir).toHaveBeenNthCalledWith(1, src);
      expect(fs.readdir).toHaveBeenNthCalledWith(2, path.join(src, 'utils'));
      expect(fs.stat).toHaveBeenCalledTimes(
        filesRoot.length + filesUtils.length - 1, // .eslintrc
      );
      expect(fs.ensureDir).toHaveBeenCalledTimes(3);
      expect(fs.ensureDir).toHaveBeenNthCalledWith(1, output);
      expect(fs.ensureDir).toHaveBeenNthCalledWith(2, path.join(output, 'utils'));
      expect(fs.ensureDir).toHaveBeenNthCalledWith(3, path.join(output, 'utils'));
      expect(fs.copyFile).toHaveBeenCalledTimes(expectedResult.length);
      expectedResult.forEach((item, index) => {
        expect(fs.copyFile).toHaveBeenNthCalledWith(index + 1, item.from, item.to);
      });
    });

    it('should copy the contents of a directory to a sub directory', async () => {
      // Given
      const src = path.join(cwd, 'src');
      const input = [src];
      const output = path.join(cwd, 'esm');
      const useExtension = 'js';
      const forceDirectory = true;
      const filesRoot = ['index.js', 'utils', 'README.md', '.eslintrc'];
      const filesUtils = ['index.js', 'utils.js'];
      fs.readdir.mockImplementationOnce(() => filesRoot);
      fs.readdir.mockImplementationOnce(() => filesUtils);
      /* eslint-disable jsdoc/require-jsdoc */
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => true }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      /* eslint-enable jsdoc/require-jsdoc */
      let result = null;
      const expectedResult = [
        {
          from: path.join(src, 'index.js'),
          to: path.join(output, 'src', 'index.js'),
        },
        {
          from: path.join(src, 'utils', 'index.js'),
          to: path.join(output, 'src', 'utils', 'index.js'),
        },
        {
          from: path.join(src, 'utils', 'utils.js'),
          to: path.join(output, 'src', 'utils', 'utils.js'),
        },
      ];
      // When
      result = await copyFiles(input, output, useExtension, forceDirectory);
      // Then
      expect(sortResults(result)).toEqual(expectedResult);
      expect(fs.readdir).toHaveBeenCalledTimes(2);
      expect(fs.readdir).toHaveBeenNthCalledWith(1, src);
      expect(fs.readdir).toHaveBeenNthCalledWith(2, path.join(src, 'utils'));
      expect(fs.stat).toHaveBeenCalledTimes(
        filesRoot.length + filesUtils.length - 1, // .eslintrc
      );
      expect(fs.ensureDir).toHaveBeenCalledTimes(3);
      expect(fs.ensureDir).toHaveBeenNthCalledWith(1, path.join(output, 'src'));
      expect(fs.ensureDir).toHaveBeenNthCalledWith(2, path.join(output, 'src', 'utils'));
      expect(fs.ensureDir).toHaveBeenNthCalledWith(3, path.join(output, 'src', 'utils'));
      expect(fs.copyFile).toHaveBeenCalledTimes(expectedResult.length);
      expectedResult.forEach((item, index) => {
        expect(fs.copyFile).toHaveBeenNthCalledWith(index + 1, item.from, item.to);
      });
    });

    it('should copy multiple directories', async () => {
      // Given
      const src = path.join(cwd, 'src');
      const config = path.join(cwd, 'config');
      const input = [src, config];
      const output = path.join(cwd, 'esm');
      const useExtension = 'js';
      const forceDirectory = false;
      const filesRoot = ['index.js', 'utils', 'README.md', '.eslintrc'];
      const filesUtils = ['index.js', 'utils.js'];
      const filesConfig = ['config.js'];
      fs.readdir.mockImplementationOnce(() => filesRoot);
      fs.readdir.mockImplementationOnce(() => filesConfig);
      fs.readdir.mockImplementationOnce(() => filesUtils);
      /* eslint-disable jsdoc/require-jsdoc */
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => true }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      /* eslint-enable jsdoc/require-jsdoc */
      let result = null;
      const expectedResult = [
        {
          from: path.join(config, 'config.js'),
          to: path.join(output, 'config', 'config.js'),
        },
        {
          from: path.join(src, 'index.js'),
          to: path.join(output, 'src', 'index.js'),
        },
        {
          from: path.join(src, 'utils', 'index.js'),
          to: path.join(output, 'src', 'utils', 'index.js'),
        },
        {
          from: path.join(src, 'utils', 'utils.js'),
          to: path.join(output, 'src', 'utils', 'utils.js'),
        },
      ];
      // When
      result = await copyFiles(input, output, useExtension, forceDirectory);
      // Then
      expect(sortResults(result)).toEqual(sortResults(expectedResult));
      expect(fs.readdir).toHaveBeenCalledTimes(3);
      expect(fs.readdir).toHaveBeenNthCalledWith(1, src);
      expect(fs.readdir).toHaveBeenNthCalledWith(2, config);
      expect(fs.readdir).toHaveBeenNthCalledWith(3, path.join(src, 'utils'));
      expect(fs.stat).toHaveBeenCalledTimes(
        filesRoot.length + filesUtils.length + filesConfig.length - 1, // .eslintrc
      );
      expect(fs.ensureDir).toHaveBeenCalledTimes(4);
      expect(fs.ensureDir).toHaveBeenNthCalledWith(1, path.join(output, 'config'));
      expect(fs.ensureDir).toHaveBeenNthCalledWith(2, path.join(output, 'src'));
      expect(fs.ensureDir).toHaveBeenNthCalledWith(3, path.join(output, 'src', 'utils'));
      expect(fs.ensureDir).toHaveBeenNthCalledWith(4, path.join(output, 'src', 'utils'));
      expect(fs.copyFile).toHaveBeenCalledTimes(expectedResult.length);
      expectedResult.forEach((item, index) => {
        expect(fs.copyFile).toHaveBeenNthCalledWith(index + 1, item.from, item.to);
      });
    });

    it('should copy multiple directories and ignore others', async () => {
      // Given
      const src = path.join(cwd, 'src');
      const config = path.join(cwd, 'config');
      const input = [src, config];
      const output = path.join(cwd, 'esm');
      const ignore = ['node_modules', 'utils/@types'];
      const useExtension = 'js';
      const forceDirectory = false;
      const filesSrc = ['index.js', 'utils', 'README.md', '.eslintrc', 'node_modules'];
      const filesUtils = ['index.js', 'utils.js', '@types'];
      const filesUtilsTypes = ['index.js'];
      const filesNodeModules = ['modules.js'];
      const filesConfig = ['config.js', '@types'];
      const filesConfigTypes = ['index.js'];
      /* eslint-disable jsdoc/require-jsdoc */
      // - src
      fs.readdir.mockImplementationOnce(() => filesSrc);
      // - config
      fs.readdir.mockImplementationOnce(() => filesConfig);
      // - src/index.js
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      // - src/utils
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => true }));
      // - src/README.md
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      // - src/node_modules
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => true }));
      // - config/config.js
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      // - config/@types
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => true }));
      // - src/utils
      fs.readdir.mockImplementationOnce(() => filesUtils);
      // - src/node_modules
      fs.readdir.mockImplementationOnce(() => filesNodeModules);
      // - config/@types
      fs.readdir.mockImplementationOnce(() => filesConfigTypes);
      // - src/utils/index.js
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      // - src/utils/utils.js
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      // - src/utils/@types
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => true }));
      // - src/node_modules/modules.js
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      // - config/@types/index.js
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      // - src/utils/@types
      fs.readdir.mockImplementationOnce(() => filesUtilsTypes);
      // - src/utils/@types/index.js
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));

      /* eslint-enable jsdoc/require-jsdoc */
      let result = null;
      const expectedResult = [
        {
          from: path.join(config, 'config.js'),
          to: path.join(output, 'config', 'config.js'),
        },
        {
          from: path.join(config, '@types', 'index.js'),
          to: path.join(output, 'config', '@types', 'index.js'),
        },
        {
          from: path.join(src, 'index.js'),
          to: path.join(output, 'src', 'index.js'),
        },
        {
          from: path.join(src, 'utils', 'index.js'),
          to: path.join(output, 'src', 'utils', 'index.js'),
        },
        {
          from: path.join(src, 'utils', 'utils.js'),
          to: path.join(output, 'src', 'utils', 'utils.js'),
        },
      ];
      // When
      result = await copyFiles(input, output, useExtension, forceDirectory, ignore);
      // Then
      expect(sortResults(result)).toEqual(sortResults(expectedResult));
      expect(fs.readdir).toHaveBeenCalledTimes(6);
      expect(fs.readdir).toHaveBeenNthCalledWith(1, src);
      expect(fs.readdir).toHaveBeenNthCalledWith(2, config);
      expect(fs.readdir).toHaveBeenNthCalledWith(3, path.join(src, 'utils'));
      expect(fs.stat).toHaveBeenCalledTimes(
        filesSrc.length +
          filesUtils.length +
          filesUtilsTypes.length +
          filesNodeModules.length +
          filesConfig.length +
          filesConfigTypes.length -
          1, // .eslintrc
      );
      expect(fs.ensureDir).toHaveBeenCalledTimes(5);
      expect(fs.ensureDir).toHaveBeenNthCalledWith(1, path.join(output, 'config'));
      expect(fs.ensureDir).toHaveBeenNthCalledWith(
        2,
        path.join(output, 'config', '@types'),
      );
      expect(fs.ensureDir).toHaveBeenNthCalledWith(3, path.join(output, 'src'));
      expect(fs.ensureDir).toHaveBeenNthCalledWith(4, path.join(output, 'src', 'utils'));
      expect(fs.ensureDir).toHaveBeenNthCalledWith(5, path.join(output, 'src', 'utils'));
      expect(fs.copyFile).toHaveBeenCalledTimes(expectedResult.length);
      expectedResult.forEach((item, index) => {
        expect(fs.copyFile).toHaveBeenNthCalledWith(index + 1, item.from, item.to);
      });
    });

    it('should copy a directory and change the extensions to .mjs', async () => {
      // Given
      const src = path.join(cwd, 'src');
      const input = [src];
      const output = path.join(cwd, 'esm');
      const useExtension = 'mjs';
      const forceDirectory = false;
      const filesRoot = ['index.js', 'utils', 'README.md', '.eslintrc'];
      const filesUtils = ['index.js', 'utils.js'];
      fs.readdir.mockImplementationOnce(() => filesRoot);
      fs.readdir.mockImplementationOnce(() => filesUtils);
      /* eslint-disable jsdoc/require-jsdoc */
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => true }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      fs.stat.mockImplementationOnce(() => ({ isDirectory: () => false }));
      /* eslint-enable jsdoc/require-jsdoc */
      let result = null;
      const expectedResult = [
        {
          from: path.join(src, 'index.js'),
          to: path.join(output, 'index.mjs'),
        },
        {
          from: path.join(src, 'utils', 'index.js'),
          to: path.join(output, 'utils', 'index.mjs'),
        },
        {
          from: path.join(src, 'utils', 'utils.js'),
          to: path.join(output, 'utils', 'utils.mjs'),
        },
      ];
      // When
      result = await copyFiles(input, output, useExtension, forceDirectory);
      // Then
      expect(sortResults(result)).toEqual(sortResults(expectedResult));
      expect(fs.readdir).toHaveBeenCalledTimes(2);
      expect(fs.readdir).toHaveBeenNthCalledWith(1, src);
      expect(fs.readdir).toHaveBeenNthCalledWith(2, path.join(src, 'utils'));
      expect(fs.stat).toHaveBeenCalledTimes(
        filesRoot.length + filesUtils.length - 1, // .eslintrc
      );
      expect(fs.ensureDir).toHaveBeenCalledTimes(3);
      expect(fs.ensureDir).toHaveBeenNthCalledWith(1, output);
      expect(fs.ensureDir).toHaveBeenNthCalledWith(2, path.join(output, 'utils'));
      expect(fs.ensureDir).toHaveBeenNthCalledWith(3, path.join(output, 'utils'));
      expect(fs.copyFile).toHaveBeenCalledTimes(expectedResult.length);
      expectedResult.forEach((item, index) => {
        expect(fs.copyFile).toHaveBeenNthCalledWith(index + 1, item.from, item.to);
      });
    });
  });

  describe('transformOutput', () => {
    beforeEach(() => {
      Runner.run.mockClear();
      fs.readFile.mockReset();
      fs.writeFile.mockReset();
    });

    it('should transform a list of files', async () => {
      // Given
      const files = [
        {
          to: 'index.js',
        },
        {
          to: 'utils.js',
        },
      ];
      const options = {
        output: path.join(cwd, 'esm'),
        filesWithShebang: [],
      };
      const stats = {
        timeElapsed: 25.09,
        ok: files.length,
        nochange: 0,
      };
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      const expectedTransformations = [
        ...['cjs', 'exports', 'named-export-generation'].map((file) =>
          require.resolve(path.join('5to6-codemod', 'transforms', `${file}.js`)),
        ),
        path.resolve('src', 'transformer.js'),
      ];
      const expectedOptions = {
        verbose: 0,
        dry: false,
        print: false,
        babel: true,
        extension: 'js',
        ignorePattern: [],
        ignoreConfig: [],
        runInBand: false,
        silent: true,
        parser: 'babel',
        cjs2esm: options,
      };
      // When
      await transformOutput(files, options);
      // Then
      expectedTransformations.forEach((file, index) => {
        expect(Runner.run).toHaveBeenNthCalledWith(
          index + 1,
          file,
          [options.output],
          expectedOptions,
        );
      });
    });

    it('should transform a list of files using a custom version of 5to6-codemod', async () => {
      // Given
      const files = [
        {
          to: 'index.js',
        },
        {
          to: 'utils.js',
        },
      ];
      const options = {
        output: path.join(cwd, 'esm'),
        codemod: {
          path: 'custom-codemod',
        },
      };
      const stats = {
        timeElapsed: 25.09,
        ok: files.length,
        nochange: 0,
      };
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      const expectedTransformations = [
        ...['cjs', 'exports', 'named-export-generation'].map((file) =>
          path.resolve(options.codemod.path, `${file}.js`),
        ),
        path.resolve('src', 'transformer.js'),
      ];
      const expectedOptions = {
        verbose: 0,
        dry: false,
        print: false,
        babel: true,
        extension: 'js',
        ignorePattern: [],
        ignoreConfig: [],
        runInBand: false,
        silent: true,
        parser: 'babel',
        cjs2esm: options,
      };
      // When
      await transformOutput(files, options);
      // Then
      expectedTransformations.forEach((file, index) => {
        expect(Runner.run).toHaveBeenNthCalledWith(
          index + 1,
          file,
          [options.output],
          expectedOptions,
        );
      });
    });

    it('should transform a list of files using a single transformation', async () => {
      // Given
      const files = [
        {
          to: 'index.js',
        },
        {
          to: 'utils.js',
        },
      ];
      const options = {
        output: path.join(cwd, 'esm'),
        codemod: {
          files: ['exports'],
        },
      };
      const stats = {
        timeElapsed: 25.09,
        ok: files.length,
        nochange: 0,
      };
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      const expectedTransformations = [
        ...options.codemod.files.map((file) =>
          require.resolve(path.join('5to6-codemod', 'transforms', `${file}.js`)),
        ),
        path.resolve('src', 'transformer.js'),
      ];
      const expectedOptions = {
        verbose: 0,
        dry: false,
        print: false,
        babel: true,
        extension: 'js',
        ignorePattern: [],
        ignoreConfig: [],
        runInBand: false,
        silent: true,
        parser: 'babel',
        cjs2esm: options,
      };
      // When
      await transformOutput(files, options);
      // Then
      expectedTransformations.forEach((file, index) => {
        expect(Runner.run).toHaveBeenNthCalledWith(
          index + 1,
          file,
          [options.output],
          expectedOptions,
        );
      });
    });

    it('should transform a list of files with a custom order of transformations', async () => {
      // Given
      const files = [
        {
          to: 'index.js',
        },
        {
          to: 'utils.js',
        },
      ];
      const options = {
        output: path.join(cwd, 'esm'),
        codemod: {
          files: ['exports', CJS2ESM_TRANSFORMATION_NAME, 'named-export-generation'],
        },
      };
      const stats = {
        timeElapsed: 25.09,
        ok: files.length,
        nochange: 0,
      };
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      const expectedTransformations = options.codemod.files.map((file) =>
        file === CJS2ESM_TRANSFORMATION_NAME
          ? path.resolve('src', 'transformer.js')
          : require.resolve(path.join('5to6-codemod', 'transforms', `${file}.js`)),
      );
      const expectedOptions = {
        verbose: 0,
        dry: false,
        print: false,
        babel: true,
        extension: 'js',
        ignorePattern: [],
        ignoreConfig: [],
        runInBand: false,
        silent: true,
        parser: 'babel',
        cjs2esm: options,
      };
      // When
      await transformOutput(files, options);
      // Then
      expectedTransformations.forEach((file, index) => {
        expect(Runner.run).toHaveBeenNthCalledWith(
          index + 1,
          file,
          [options.output],
          expectedOptions,
        );
      });
    });

    it('should transform a list of files with custom transformations', async () => {
      // Given
      const files = [
        {
          to: 'index.js',
        },
        {
          to: 'utils.js',
        },
      ];
      const customTransformationBefore = './custom-transformation-before';
      const customTransformationAfter = './custom-transformation-after';
      const options = {
        output: path.join(cwd, 'esm'),
        codemod: {
          files: [customTransformationBefore, 'exports', customTransformationAfter],
        },
      };
      const stats = {
        timeElapsed: 25.09,
        ok: files.length,
        nochange: 0,
      };
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      const expectedTransformations = [
        path.resolve(`${customTransformationBefore}.js`),
        ...options.codemod.files
          .filter((file) => !file.startsWith('.'))
          .map((file) =>
            require.resolve(path.join('5to6-codemod', 'transforms', `${file}.js`)),
          ),
        path.resolve(`${customTransformationAfter}.js`),
        path.resolve('src', 'transformer.js'),
      ];
      const expectedOptions = {
        verbose: 0,
        dry: false,
        print: false,
        babel: true,
        extension: 'js',
        ignorePattern: [],
        ignoreConfig: [],
        runInBand: false,
        silent: true,
        parser: 'babel',
        cjs2esm: options,
      };
      // When
      await transformOutput(files, options);
      // Then
      expectedTransformations.forEach((file, index) => {
        expect(Runner.run).toHaveBeenNthCalledWith(
          index + 1,
          file,
          [options.output],
          expectedOptions,
        );
      });
    });

    it('should throw if the cjs2esm transformation is first in the list', () => {
      // Given
      const files = [
        {
          to: 'index.js',
        },
      ];
      const options = {
        output: path.join(cwd, 'esm'),
        codemod: {
          files: [CJS2ESM_TRANSFORMATION_NAME, 'named-export-generation'],
        },
      };
      expect.assertions(1);
      // When
      return transformOutput(files, options).catch((error) => {
        expect(error.message).toMatch(/cannot be the first one in the list/i);
      });
    });

    it('should remove and restore the shebang of a file', async () => {
      // Given
      const files = [
        {
          from: 'index.js',
          to: 'index.js',
        },
        {
          from: 'utils.js',
          to: 'utils.js',
        },
      ];
      const options = {
        output: path.join(cwd, 'esm'),
        filesWithShebang: ['index', 'utils'],
      };
      const stats = {
        timeElapsed: 25.09,
        ok: files.length,
        nochange: 0,
      };
      const indexShebang = '#!/usr/bin/env node';
      const indexRest = 'something else;';
      const indexContent = `${indexShebang}\n\n${indexRest}`;
      fs.readFile.mockImplementationOnce(() => indexContent);
      fs.readFile.mockImplementationOnce(() => 'some other file;');
      fs.readFile.mockImplementationOnce(() => indexRest);
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      // When
      await transformOutput(files, options);
      // Then
      expect(fs.readFile).toHaveBeenCalledTimes(3);
      expect(fs.readFile).toHaveBeenNthCalledWith(1, files[0].to, 'utf-8');
      expect(fs.readFile).toHaveBeenNthCalledWith(2, files[1].to, 'utf-8');
      expect(fs.readFile).toHaveBeenNthCalledWith(3, files[0].to, 'utf-8');
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
      expect(fs.writeFile).toHaveBeenNthCalledWith(1, files[0].to, indexRest);
      expect(fs.writeFile).toHaveBeenNthCalledWith(2, files[0].to, indexContent);
      expect(Runner.run).toHaveBeenCalledTimes(4);
      expect(Runner.run).toHaveBeenCalledWith(expect.any(String), [options.output], {
        verbose: 0,
        dry: false,
        print: false,
        babel: true,
        extension: 'js',
        ignorePattern: [],
        ignoreConfig: [],
        runInBand: false,
        silent: true,
        parser: 'babel',
        cjs2esm: options,
      });
    });

    it('should fail to transform a list of files', () => {
      // Given
      const files = [
        {
          to: 'index.mjs',
        },
        {
          to: 'utils.mjs',
        },
      ];
      const options = {
        output: path.join(cwd, 'esm'),
        filesWithShebang: [],
      };
      const stats = {
        timeElapsed: 25.09,
        ok: 0,
        nochange: 0,
      };
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      Runner.run.mockImplementationOnce(() => Promise.resolve(stats));
      expect.assertions(3);
      // When
      return transformOutput(files, options).catch((error) => {
        expect(error.message).toMatch(/at least one file couldn't be transformed/i);
        expect(Runner.run).toHaveBeenCalledTimes(4);
        expect(Runner.run).toHaveBeenCalledWith(expect.any(String), [options.output], {
          verbose: 0,
          dry: false,
          print: false,
          babel: true,
          extension: 'mjs',
          ignorePattern: [],
          ignoreConfig: [],
          runInBand: false,
          silent: true,
          parser: 'babel',
          cjs2esm: options,
        });
      });
    });
  });

  describe('updatePackageJSON', () => {
    beforeEach(() => {
      utils.requireModule.mockClear();
      utils.getAbsPathInfo.mockClear();
      utils.findFile.mockClear();
      fs.pathExists.mockClear();
      fs.writeJSON.mockClear();
    });

    it('should add the module property when main is a folder name', async () => {
      // Given
      const pkgJson = {
        main: 'src',
      };
      const file = {
        from: path.join(cwd, 'src', 'index.js'),
        to: path.join(cwd, 'esm', 'index.js'),
      };
      const files = [file];
      const mainPath = path.join(cwd, pkgJson.main);
      utils.requireModule.mockImplementationOnce(() => pkgJson);
      utils.getAbsPathInfo.mockImplementationOnce(() => ({
        path: mainPath,
        isFile: false,
      }));
      utils.findFile.mockImplementationOnce(() => file.from);
      const pkgPath = path.join(cwd, 'package.json');
      const expectedResult = './esm/index.js';
      let result = null;
      // When
      result = await updatePackageJSON(files);
      // Then
      expect(result).toBe(expectedResult);
      expect(utils.requireModule).toHaveBeenCalledTimes(1);
      expect(utils.requireModule).toHaveBeenCalledWith(pkgPath);
      expect(utils.getAbsPathInfo).toHaveBeenCalledTimes(1);
      expect(utils.getAbsPathInfo).toHaveBeenCalledWith(mainPath);
      expect(utils.findFile).toHaveBeenCalledTimes(1);
      expect(utils.findFile).toHaveBeenCalledWith(['index.mjs', 'index.js'], mainPath);
      expect(fs.writeJSON).toHaveBeenCalledTimes(1);
      expect(fs.writeJSON).toHaveBeenCalledWith(
        pkgPath,
        {
          ...pkgJson,
          module: expectedResult,
        },
        { spaces: 2 },
      );
    });

    it('should add the module property when main is a file without ext', async () => {
      // Given
      const pkgJson = {
        main: 'src/index',
      };
      const file = {
        from: path.join(cwd, 'src', 'index.js'),
        to: path.join(cwd, 'esm', 'index.js'),
      };
      const files = [file];
      const mainPath = path.join(cwd, pkgJson.main);
      utils.requireModule.mockImplementationOnce(() => pkgJson);
      utils.getAbsPathInfo.mockImplementationOnce(() => ({
        path: `${mainPath}.js`,
        isFile: true,
      }));
      fs.pathExists.mockImplementationOnce(() => false);
      const pkgPath = path.join(cwd, 'package.json');
      const expectedResult = './esm/index.js';
      let result = null;
      // When
      result = await updatePackageJSON(files);
      // Then
      expect(result).toBe(expectedResult);
      expect(utils.requireModule).toHaveBeenCalledTimes(1);
      expect(utils.requireModule).toHaveBeenCalledWith(pkgPath);
      expect(utils.getAbsPathInfo).toHaveBeenCalledTimes(1);
      expect(utils.getAbsPathInfo).toHaveBeenCalledWith(mainPath);
      expect(fs.pathExists).toHaveBeenCalledTimes(0);
      expect(fs.writeJSON).toHaveBeenCalledTimes(1);
      expect(fs.writeJSON).toHaveBeenCalledWith(
        pkgPath,
        {
          ...pkgJson,
          module: expectedResult,
        },
        { spaces: 2 },
      );
    });

    it("shouldn't modify the package.json if it can't find the file", async () => {
      // Given
      const pkgJson = {
        main: 'src/index',
      };
      const file = {
        from: path.join(cwd, 'src', 'index.js'),
        to: path.join(cwd, 'esm', 'index.js'),
      };
      const files = [file];
      const mainPath = path.join(cwd, pkgJson.main);
      utils.requireModule.mockImplementationOnce(() => pkgJson);
      utils.getAbsPathInfo.mockImplementationOnce(() => ({
        path: mainPath,
        isFile: true,
      }));
      fs.pathExists.mockImplementationOnce(() => false);
      const pkgPath = path.join(cwd, 'package.json');
      let result = null;
      // When
      result = await updatePackageJSON(files);
      // Then
      expect(result).toBe(null);
      expect(utils.requireModule).toHaveBeenCalledTimes(1);
      expect(utils.requireModule).toHaveBeenCalledWith(pkgPath);
      expect(utils.getAbsPathInfo).toHaveBeenCalledTimes(1);
      expect(utils.getAbsPathInfo).toHaveBeenCalledWith(mainPath);
      expect(fs.writeJSON).toHaveBeenCalledTimes(0);
    });

    it("shouldn't modify the package.json if there's no main property", async () => {
      // Given
      const pkgJson = {};
      const files = [];
      utils.requireModule.mockImplementationOnce(() => pkgJson);
      let result = null;
      // When
      result = await updatePackageJSON(files);
      // Then
      expect(result).toBe(null);
      expect(utils.getAbsPathInfo).toHaveBeenCalledTimes(0);
    });

    it("should throw an error if the main file doesn't exist", () => {
      // Given
      const pkgJson = {
        main: 'src',
      };
      const file = {
        from: path.join(cwd, 'src', 'index.js'),
        to: path.join(cwd, 'esm', 'index.js'),
      };
      const files = [file];
      const mainPath = path.join(cwd, pkgJson.main);
      utils.requireModule.mockImplementationOnce(() => pkgJson);
      utils.getAbsPathInfo.mockImplementationOnce(() => ({
        path: mainPath,
        isFile: false,
      }));
      utils.findFile.mockImplementationOnce(() => null);
      expect.assertions(1);
      // When
      return updatePackageJSON(files).catch((error) => {
        expect(error.message).toMatch(/the entry file can't be found/i);
      });
    });
  });

  describe('addPackageJSON', () => {
    beforeEach(() => {
      fs.writeJSON.mockClear();
      utils.log.mockClear();
    });

    it('should create a package.json with the type property set to module', async () => {
      // Given
      const output = path.join(cwd, 'esm');
      // When
      await addPackageJSON(output);
      // Then
      expect(fs.writeJSON).toHaveBeenCalledTimes(1);
      expect(fs.writeJSON).toHaveBeenCalledWith(
        path.join(output, 'package.json'),
        { type: 'module' },
        { spaces: 2 },
      );
      expect(utils.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('addErrorHandler', () => {
    const originalProcessOn = process.on;
    const originalProcessRemoveListener = process.removeListener;

    beforeEach(() => {
      process.on = originalProcessOn;
      process.removeListener = originalProcessRemoveListener;
      utils.log.mockReset();
    });

    it('should add the listers', () => {
      // Given
      const onMock = jest.fn();
      process.on = onMock;
      let sut = null;
      // When
      sut = addErrorHandler();
      // Then
      expect(sut).toBeInstanceOf(Function);
      expect(onMock).toHaveBeenCalledTimes(2);
      expect(onMock).toHaveBeenNthCalledWith(
        1,
        'uncaughtException',
        expect.any(Function),
      );
      expect(onMock).toHaveBeenNthCalledWith(
        2,
        'unhandledRejection',
        expect.any(Function),
      );
    });

    it('should add and remove the listeners', () => {
      // Given
      const onMock = jest.fn();
      process.on = onMock;
      const removeListenerMock = jest.fn();
      process.removeListener = removeListenerMock;
      let sut = null;
      // When
      sut = addErrorHandler();
      sut();
      // Then
      expect(onMock).toHaveBeenCalledTimes(2);
      expect(onMock).toHaveBeenNthCalledWith(
        1,
        'uncaughtException',
        expect.any(Function),
      );
      expect(onMock).toHaveBeenNthCalledWith(
        2,
        'unhandledRejection',
        expect.any(Function),
      );
      expect(removeListenerMock).toHaveBeenCalledTimes(2);
      expect(removeListenerMock).toHaveBeenNthCalledWith(
        1,
        'uncaughtException',
        expect.any(Function),
      );
      expect(removeListenerMock).toHaveBeenNthCalledWith(
        2,
        'unhandledRejection',
        expect.any(Function),
      );
    });

    it('should handle an error', () => {
      // Given
      const onMock = jest.fn();
      process.on = onMock;
      const error = new Error('DAMN');
      const stack = error.stack.split('\n');
      const errorTitle = stack.shift();
      let handler = null;
      // When
      addErrorHandler();
      [[, handler]] = onMock.mock.calls;
      handler(error);
      // Then
      expect(utils.log).toHaveBeenCalledTimes(stack.length + 3);
      expect(utils.log).toHaveBeenNthCalledWith(1, 'red', errorTitle);
      stack.forEach((line, index) => {
        expect(utils.log).toHaveBeenNthCalledWith(index + 2, 'gray', line.trim());
      });
      expect(utils.log).toHaveBeenNthCalledWith(stack.length + 2, 'gray');
      expect(utils.log).toHaveBeenNthCalledWith(
        stack.length + 3,
        'gray',
        expect.any(String),
      );
    });
  });
});
