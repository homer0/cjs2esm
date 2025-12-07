/* eslint-disable no-console */
jest.unmock('../src/utils');
jest.mock('../src/esm', () => {
  const chalk = new Proxy(
    {},
    {
      mocks: {},
      clear() {
        Object.keys(this.mocks).forEach((color) => {
          this.mocks[color].mockClear();
        });
      },
      get(target, name) {
        let result;
        if (this[name]) {
          result = this[name];
        } else {
          if (!this.mocks[name]) {
            this.mocks[name] = jest.fn((str) => str);
          }

          result = this.mocks[name];
        }

        return result;
      },
    },
  );

  return {
    /**
     * Get the Proxy-mock for `chalk`.
     *
     * @returns {Object}
     */
    getChalk: () => ({ default: chalk }),
    chalk,
  };
});
jest.mock('fs-extra');

const path = require('path');
const fs = require('fs-extra');
const { chalk } = require('../src/esm');
const utils = require('../src/utils');
const pkgJson = require('../package.json');

describe('utils', () => {
  describe('log', () => {
    let originalConsoleLog;
    beforeEach(() => {
      originalConsoleLog = console.log;
      console.log = jest.fn();
    });
    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it('should log a colored message on the console', () => {
      // Given
      const color = 'green';
      chalk[color].mockImplementationOnce((str) => str);
      chalk[color].mockImplementationOnce((str) => str);
      const message = 'hello world';
      // When
      utils.log(color, message);
      // Then
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(`[${pkgJson.name}]`, message);
      expect(chalk[color]).toHaveBeenCalledTimes(2);
      expect(chalk[color]).toHaveBeenNthCalledWith(1, `[${pkgJson.name}]`);
      expect(chalk[color]).toHaveBeenNthCalledWith(2, message);
    });
  });

  describe('findFile', () => {
    beforeEach(() => {
      fs.pathExists.mockClear();
    });

    it('should find a file from a list', async () => {
      // Given
      const file = 'MyFile';
      const files = [file, 'something', 'else'];
      const directory = './some/path';
      fs.pathExists.mockImplementationOnce(() => true);
      let result = null;
      const expectedResult = path.join(directory, file);
      // When
      result = await utils.findFile(files, directory);
      // Then
      expect(result).toBe(expectedResult);
      expect(fs.pathExists).toHaveBeenCalledTimes(1);
      expect(fs.pathExists).toHaveBeenCalledWith(expectedResult);
    });

    it('should return null if no file is found', async () => {
      // Given
      const files = ['myFile', 'something', 'else'];
      const directory = './some/path';
      files.forEach(() => {
        fs.pathExists.mockImplementationOnce(() => false);
      });
      let result = null;
      // When
      result = await utils.findFile(files, directory);
      // Then
      expect(result).toBe(null);
      expect(fs.pathExists).toHaveBeenCalledTimes(files.length);
      files.forEach((file, index) => {
        expect(fs.pathExists).toHaveBeenNthCalledWith(
          index + 1,
          path.join(directory, file),
        );
      });
    });
  });

  describe('findFileSync', () => {
    beforeEach(() => {
      fs.pathExistsSync.mockClear();
    });

    it('should find a file from a list', () => {
      // Given
      const file = 'MyFile';
      const files = [file, 'something', 'else'];
      const directory = './some/path';
      fs.pathExistsSync.mockImplementationOnce(() => true);
      let result = null;
      const expectedResult = path.join(directory, file);
      // When
      result = utils.findFileSync(files, directory);
      // Then
      expect(result).toBe(expectedResult);
      expect(fs.pathExistsSync).toHaveBeenCalledTimes(1);
      expect(fs.pathExistsSync).toHaveBeenCalledWith(expectedResult);
    });

    it('should return null if no file is found', () => {
      // Given
      const files = ['myFile', 'something', 'else'];
      const directory = './some/path';
      files.forEach(() => {
        fs.pathExistsSync.mockImplementationOnce(() => false);
      });
      let result = null;
      // When
      result = utils.findFileSync(files, directory);
      // Then
      expect(result).toBe(null);
      expect(fs.pathExistsSync).toHaveBeenCalledTimes(files.length);
      files.forEach((file, index) => {
        expect(fs.pathExistsSync).toHaveBeenNthCalledWith(
          index + 1,
          path.join(directory, file),
        );
      });
    });
  });

  describe('getAbsPathInfo', () => {
    beforeEach(() => {
      fs.pathExists.mockClear();
    });

    it('should return the information for a file with a .js extension', async () => {
      // Given
      const file = 'myFile.js';
      const folder = '/src/utils';
      const filepath = path.join(folder, file);
      let result = null;
      // When
      result = await utils.getAbsPathInfo(filepath);
      // Then
      expect(result).toEqual({
        path: filepath,
        isFile: true,
        extension: path.parse(file).ext,
      });
    });

    it('should return the information for a .mjs file without extension', async () => {
      // Given
      const file = 'myFile';
      const folder = '/src/utils';
      const filepath = path.join(folder, file);
      fs.pathExists.mockImplementationOnce(() => false);
      fs.pathExists.mockImplementationOnce(() => true);
      let result = null;
      const expectedAbsPath = path.join(folder, file);
      const expectedAbsFilePath = `${expectedAbsPath}.mjs`;
      // When
      result = await utils.getAbsPathInfo(filepath);
      // Then
      expect(result).toEqual({
        path: expectedAbsFilePath,
        isFile: true,
        extension: '.mjs',
      });
      expect(fs.pathExists).toHaveBeenCalledTimes(2);
      expect(fs.pathExists).toHaveBeenNthCalledWith(1, expectedAbsPath);
      expect(fs.pathExists).toHaveBeenNthCalledWith(2, expectedAbsFilePath);
    });

    it('should return the information for a file without extension but with a suffix', async () => {
      // Given
      const file = 'myFile.service';
      const folder = '/src/utils';
      const filepath = path.join(folder, file);
      fs.pathExists.mockImplementationOnce(() => false);
      fs.pathExists.mockImplementationOnce(() => true);
      let result = null;
      const expectedAbsPath = path.join(folder, file);
      const expectedAbsFilePath = `${expectedAbsPath}.mjs`;
      // When
      result = await utils.getAbsPathInfo(filepath);
      // Then
      expect(result).toEqual({
        path: expectedAbsFilePath,
        isFile: true,
        extension: '.mjs',
      });
      expect(fs.pathExists).toHaveBeenCalledTimes(2);
      expect(fs.pathExists).toHaveBeenNthCalledWith(1, expectedAbsPath);
      expect(fs.pathExists).toHaveBeenNthCalledWith(2, expectedAbsFilePath);
    });

    it("shouldn't be able to find the information for a file", async () => {
      // Given
      const file = 'myFile';
      const folder = '/src/utils';
      const filepath = path.join(folder, file);
      fs.pathExists.mockImplementationOnce(() => false);
      fs.pathExists.mockImplementationOnce(() => false);
      fs.pathExists.mockImplementationOnce(() => false);
      let result = null;
      const expectedAbsPath = path.join(folder, file);
      // When
      result = await utils.getAbsPathInfo(filepath);
      // Then
      expect(result).toEqual(null);
      expect(fs.pathExists).toHaveBeenCalledTimes(3);
      expect(fs.pathExists).toHaveBeenNthCalledWith(1, expectedAbsPath);
      expect(fs.pathExists).toHaveBeenNthCalledWith(2, `${expectedAbsPath}.mjs`);
      expect(fs.pathExists).toHaveBeenNthCalledWith(3, `${expectedAbsPath}.js`);
    });

    it('should return the information for a folder', async () => {
      // Given
      const folder = '/src/utils';
      fs.pathExists.mockImplementationOnce(() => true);
      let result = null;
      // When
      result = await utils.getAbsPathInfo(folder);
      // Then
      expect(result).toEqual({
        path: folder,
        isFile: false,
        extension: null,
      });
      expect(fs.pathExists).toHaveBeenCalledTimes(1);
      expect(fs.pathExists).toHaveBeenCalledWith(folder);
    });
  });

  describe('getAbsPathInfoSync', () => {
    beforeEach(() => {
      fs.pathExistsSync.mockClear();
    });

    it('should return the information for a file with a .js extension', () => {
      // Given
      const file = 'myFile.js';
      const folder = '/src/utils';
      const filepath = path.join(folder, file);
      let result = null;
      // When
      result = utils.getAbsPathInfoSync(filepath);
      // Then
      expect(result).toEqual({
        path: filepath,
        isFile: true,
        extension: path.parse(file).ext,
      });
    });

    it('should return the information for a .mjs file without extension', () => {
      // Given
      const file = 'myFile';
      const folder = '/src/utils';
      const filepath = path.join(folder, file);
      fs.pathExistsSync.mockImplementationOnce(() => false);
      fs.pathExistsSync.mockImplementationOnce(() => true);
      let result = null;
      const expectedAbsPath = path.join(folder, file);
      const expectedAbsFilePath = `${expectedAbsPath}.mjs`;
      // When
      result = utils.getAbsPathInfoSync(filepath);
      // Then
      expect(result).toEqual({
        path: expectedAbsFilePath,
        isFile: true,
        extension: '.mjs',
      });
      expect(fs.pathExistsSync).toHaveBeenCalledTimes(2);
      expect(fs.pathExistsSync).toHaveBeenNthCalledWith(1, expectedAbsPath);
      expect(fs.pathExistsSync).toHaveBeenNthCalledWith(2, expectedAbsFilePath);
    });

    it('should return the information for a file without extension but with a suffix', () => {
      // Given
      const file = 'myFile.service';
      const folder = '/src/utils';
      const filepath = path.join(folder, file);
      fs.pathExistsSync.mockImplementationOnce(() => false);
      fs.pathExistsSync.mockImplementationOnce(() => true);
      let result = null;
      const expectedAbsPath = path.join(folder, file);
      const expectedAbsFilePath = `${expectedAbsPath}.mjs`;
      // When
      result = utils.getAbsPathInfoSync(filepath);
      // Then
      expect(result).toEqual({
        path: expectedAbsFilePath,
        isFile: true,
        extension: '.mjs',
      });
      expect(fs.pathExistsSync).toHaveBeenCalledTimes(2);
      expect(fs.pathExistsSync).toHaveBeenNthCalledWith(1, expectedAbsPath);
      expect(fs.pathExistsSync).toHaveBeenNthCalledWith(2, expectedAbsFilePath);
    });

    it("shouldn't be able to find the information for a file", () => {
      // Given
      const file = 'myFile';
      const folder = '/src/utils';
      const filepath = path.join(folder, file);
      fs.pathExistsSync.mockImplementationOnce(() => false);
      fs.pathExistsSync.mockImplementationOnce(() => false);
      fs.pathExistsSync.mockImplementationOnce(() => false);
      let result = null;
      const expectedAbsPath = path.join(folder, file);
      // When
      result = utils.getAbsPathInfoSync(filepath);
      // Then
      expect(result).toEqual(null);
      expect(fs.pathExistsSync).toHaveBeenCalledTimes(3);
      expect(fs.pathExistsSync).toHaveBeenNthCalledWith(1, expectedAbsPath);
      expect(fs.pathExistsSync).toHaveBeenNthCalledWith(2, `${expectedAbsPath}.mjs`);
      expect(fs.pathExistsSync).toHaveBeenNthCalledWith(3, `${expectedAbsPath}.js`);
    });

    it('should return the information for a folder', () => {
      // Given
      const folder = '/src/utils';
      fs.pathExistsSync.mockImplementationOnce(() => true);
      let result = null;
      // When
      result = utils.getAbsPathInfoSync(folder);
      // Then
      expect(result).toEqual({
        path: folder,
        isFile: false,
        extension: null,
      });
      expect(fs.pathExistsSync).toHaveBeenCalledTimes(1);
      expect(fs.pathExistsSync).toHaveBeenCalledWith(folder);
    });
  });

  describe('requireModule', () => {
    it('should work as a proxy for `require`', () => {
      // Given
      const modPath = '../package.json';
      let result = null;
      // eslint-disable-next-line n/global-require, import-x/no-dynamic-require
      const expectedResult = require(modPath);
      // When
      result = utils.requireModule(modPath);
      // Then
      expect(result).toEqual(expectedResult);
    });
  });
});
