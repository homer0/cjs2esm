jest.unmock('../src/transformer');

jest.mock('fs-extra');
const path = require('path');
const fs = require('fs-extra');
const transformer = require('../src/transformer');
const utils = require('../src/utils');

describe('transformer', () => {
  const cwd = process.cwd();

  beforeEach(() => {
    utils.findFileSync.mockReset();
    utils.getAbsPathInfoSync.mockReset();
    fs.pathExistsSync.mockReset();
  });

  it('should transform a file', () => {
    // Given
    const file = {
      path: path.join(cwd, 'index.js'),
      source: 'magic',
    };
    const nodes = [
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: './some/file',
          },
        },
      },
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: '~/some/weird/import/that/will/be/ignored',
          },
        },
      },
    ];
    let currentNodes = nodes.slice();
    const message = 'done';
    const firstNode = 'first-node';
    const programUtils = {
      get: jest.fn(() => firstNode),
    };
    const ast = {
      filter: jest.fn(),
      replaceWith: jest.fn(),
      find: jest.fn((type) => (type === 'Program' ? programUtils : ast)),
      toSource: jest.fn(() => message),
    };
    ast.filter.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.filter(fn);
      return ast;
    });
    ast.filter.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.filter(fn);
      return ast;
    });
    ast.replaceWith.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.map(fn);
      return ast;
    });
    const jscodeshift = jest.fn(() => ast);
    jscodeshift.ImportDeclaration = 'ImportDeclaration';
    jscodeshift.Program = 'Program';
    jscodeshift.importDeclaration = jest.fn((_, str) => str);
    jscodeshift.literal = jest.fn((str) => str);
    const api = { jscodeshift };
    const cjs2esm = {
      extension: {
        ignore: [],
      },
      modules: [],
    };
    const options = { cjs2esm };
    utils.getAbsPathInfoSync.mockImplementationOnce(() => ({
      isFile: true,
      path: path.join(cwd, 'some', 'file.js'),
    }));
    let result = null;
    // When
    result = transformer(file, api, options);
    // Then
    expect(result).toBe(message);
    expect(currentNodes).toEqual(['./some/file.js']);
    expect(jscodeshift).toHaveBeenCalledTimes(1);
    expect(jscodeshift).toHaveBeenCalledWith(file.source);
    expect(utils.getAbsPathInfoSync).toHaveBeenCalledTimes(1);
    expect(utils.getAbsPathInfoSync).toHaveBeenCalledWith(path.join(cwd, 'some', 'file'));
    expect(jscodeshift.importDeclaration).toHaveBeenCalledTimes(1);
    expect(jscodeshift.importDeclaration).toHaveBeenCalledWith(
      'specifier',
      './some/file.js',
    );
    expect(ast.find).toHaveBeenCalledTimes(3);
    expect(ast.find).toHaveBeenNthCalledWith(1, 'Program');
    expect(ast.find).toHaveBeenNthCalledWith(2, 'ImportDeclaration');
    expect(ast.find).toHaveBeenNthCalledWith(3, 'Program');
    expect(programUtils.get).toHaveBeenCalledTimes(2);
    expect(programUtils.get).toHaveBeenNthCalledWith(1, 'body', 0);
    expect(programUtils.get).toHaveBeenNthCalledWith(2, 'body', 0);
  });

  it('should transform a file and preserve the leading comments', () => {
    // Given
    const file = {
      path: path.join(cwd, 'index.js'),
      source: 'magic',
    };
    const nodes = [
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: './some/file',
          },
        },
      },
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: '~/some/weird/import/that/will/be/ignored',
          },
        },
      },
    ];
    let currentNodes = nodes.slice();
    const message = 'done';
    const originalFirstNode = {
      node: {
        comments: 'original-first-node-comments',
      },
    };
    const newFirstNode = {
      node: {
        comments: 'new-first-node-comments',
      },
    };
    let getFirstNodeCount = 0;
    const programUtils = {
      get: jest.fn(() => {
        const result = getFirstNodeCount ? newFirstNode : originalFirstNode;
        getFirstNodeCount++;
        return result;
      }),
    };
    const ast = {
      filter: jest.fn(),
      replaceWith: jest.fn(),
      find: jest.fn((type) => (type === 'Program' ? programUtils : ast)),
      toSource: jest.fn(() => message),
    };
    ast.filter.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.filter(fn);
      return ast;
    });
    ast.filter.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.filter(fn);
      return ast;
    });
    ast.replaceWith.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.map(fn);
      return ast;
    });
    const jscodeshift = jest.fn(() => ast);
    jscodeshift.ImportDeclaration = 'ImportDeclaration';
    jscodeshift.Program = 'Program';
    jscodeshift.importDeclaration = jest.fn((_, str) => str);
    jscodeshift.literal = jest.fn((str) => str);
    const api = { jscodeshift };
    const cjs2esm = {
      extension: {
        ignore: [],
      },
      modules: [],
    };
    const options = { cjs2esm };
    utils.getAbsPathInfoSync.mockImplementationOnce(() => ({
      isFile: true,
      path: path.join(cwd, 'some', 'file.js'),
    }));
    let result = null;
    // When
    result = transformer(file, api, options);
    // Then
    expect(result).toBe(message);
    expect(currentNodes).toEqual(['./some/file.js']);
    expect(jscodeshift).toHaveBeenCalledTimes(1);
    expect(jscodeshift).toHaveBeenCalledWith(file.source);
    expect(utils.getAbsPathInfoSync).toHaveBeenCalledTimes(1);
    expect(utils.getAbsPathInfoSync).toHaveBeenCalledWith(path.join(cwd, 'some', 'file'));
    expect(jscodeshift.importDeclaration).toHaveBeenCalledTimes(1);
    expect(jscodeshift.importDeclaration).toHaveBeenCalledWith(
      'specifier',
      './some/file.js',
    );
    expect(newFirstNode.comments).toBe(originalFirstNode.comments);
  });

  it('should transform a file that imports a directories', () => {
    // Given
    const file = {
      path: path.join(cwd, 'index.js'),
      source: 'magic',
    };
    const nodes = [
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: './some/folder-with-pkgjson',
          },
        },
      },
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: './some/folder-with-index',
          },
        },
      },
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: 'to-be-explicitly-ignored',
          },
        },
      },
    ];
    let currentNodes = nodes.slice();
    const message = 'done';
    const firstNode = 'first-node';
    const programUtils = {
      get: jest.fn(() => firstNode),
    };
    const ast = {
      filter: jest.fn(),
      replaceWith: jest.fn(),
      find: jest.fn((type) => (type === 'Program' ? programUtils : ast)),
      toSource: jest.fn(() => message),
    };
    ast.filter.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.filter(fn);
      return ast;
    });
    ast.filter.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.filter(fn);
      return ast;
    });
    ast.replaceWith.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.map(fn);
      return ast;
    });
    const jscodeshift = jest.fn(() => ast);
    jscodeshift.ImportDeclaration = 'ImportDeclaration';
    jscodeshift.Program = 'Program';
    jscodeshift.importDeclaration = jest.fn((_, str) => str);
    jscodeshift.literal = jest.fn((str) => str);
    const api = { jscodeshift };
    const cjs2esm = {
      extension: {
        ignore: ['ignored'],
      },
      modules: [],
    };
    const options = { cjs2esm };
    const pkgFolderPath = path.join(cwd, 'some', 'folder-with-pkgjson');
    utils.getAbsPathInfoSync.mockImplementationOnce(() => ({
      isFile: false,
      path: pkgFolderPath,
    }));
    const indexFolderPath = path.join(cwd, 'some', 'folder-with-index');
    utils.getAbsPathInfoSync.mockImplementationOnce(() => ({
      isFile: false,
      path: indexFolderPath,
    }));
    fs.pathExistsSync.mockImplementationOnce(() => true);
    fs.pathExistsSync.mockImplementationOnce(() => false);
    utils.findFileSync.mockImplementationOnce(() =>
      path.join(indexFolderPath, 'index.mjs'),
    );

    let result = null;
    // When
    result = transformer(file, api, options);
    // Then
    expect(result).toBe(message);
    expect(currentNodes).toEqual([
      './some/folder-with-pkgjson',
      './some/folder-with-index/index.mjs',
    ]);
    expect(jscodeshift).toHaveBeenCalledTimes(1);
    expect(jscodeshift).toHaveBeenCalledWith(file.source);
    expect(utils.getAbsPathInfoSync).toHaveBeenCalledTimes(2);
    expect(utils.getAbsPathInfoSync).toHaveBeenCalledWith(pkgFolderPath);
    expect(utils.getAbsPathInfoSync).toHaveBeenCalledWith(indexFolderPath);
    expect(jscodeshift.importDeclaration).toHaveBeenCalledTimes(2);
    expect(jscodeshift.importDeclaration).toHaveBeenCalledWith(
      'specifier',
      './some/folder-with-pkgjson',
    );
    expect(jscodeshift.importDeclaration).toHaveBeenCalledWith(
      'specifier',
      './some/folder-with-index/index.mjs',
    );
  });

  it("shouldn't modify statements for paths it can't get info", () => {
    // Given
    const file = {
      path: path.join(cwd, 'index.js'),
      source: 'magic',
    };
    const nodes = [
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: './some/folder-with-pkgjson',
          },
        },
      },
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: './some/folder-with-index',
          },
        },
      },
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: 'to-be-explicitly-ignored',
          },
        },
      },
    ];
    let currentNodes = nodes.slice();
    const message = 'done';
    const firstNode = 'first-node';
    const programUtils = {
      get: jest.fn(() => firstNode),
    };
    const ast = {
      filter: jest.fn(),
      replaceWith: jest.fn(),
      find: jest.fn((type) => (type === 'Program' ? programUtils : ast)),
      toSource: jest.fn(() => message),
    };
    ast.filter.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.filter(fn);
      return ast;
    });
    ast.filter.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.filter(fn);
      return ast;
    });
    ast.replaceWith.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.map(fn);
      return ast;
    });
    const jscodeshift = jest.fn(() => ast);
    jscodeshift.ImportDeclaration = 'ImportDeclaration';
    jscodeshift.Program = 'Program';
    jscodeshift.importDeclaration = jest.fn((_, str) => str);
    jscodeshift.literal = jest.fn((str) => str);
    const api = { jscodeshift };
    const cjs2esm = {
      extension: {
        ignore: ['ignored'],
      },
      modules: [],
    };
    const options = { cjs2esm };
    const pkgFolderPath = path.join(cwd, 'some', 'folder-with-pkgjson');
    utils.getAbsPathInfoSync.mockImplementationOnce(() => null);
    const indexFolderPath = path.join(cwd, 'some', 'folder-with-index');
    utils.getAbsPathInfoSync.mockImplementationOnce(() => ({
      isFile: false,
      path: indexFolderPath,
    }));
    fs.pathExistsSync.mockImplementationOnce(() => false);
    fs.pathExistsSync.mockImplementationOnce(() => false);
    utils.findFileSync.mockImplementationOnce(() => null);
    utils.findFileSync.mockImplementationOnce(() => null);

    let result = null;
    // When
    result = transformer(file, api, options);
    // Then
    expect(result).toBe(message);
    expect(currentNodes).toEqual([
      './some/folder-with-pkgjson',
      './some/folder-with-index',
    ]);
    expect(jscodeshift).toHaveBeenCalledTimes(1);
    expect(jscodeshift).toHaveBeenCalledWith(file.source);
    expect(utils.getAbsPathInfoSync).toHaveBeenCalledTimes(2);
    expect(utils.getAbsPathInfoSync).toHaveBeenCalledWith(pkgFolderPath);
    expect(utils.getAbsPathInfoSync).toHaveBeenCalledWith(indexFolderPath);
    expect(jscodeshift.importDeclaration).toHaveBeenCalledTimes(2);
    expect(jscodeshift.importDeclaration).toHaveBeenCalledWith(
      'specifier',
      './some/folder-with-pkgjson',
    );
    expect(jscodeshift.importDeclaration).toHaveBeenCalledWith(
      'specifier',
      './some/folder-with-index',
    );
  });

  it('should fix imports from node_modules', () => {
    // Given
    const file = {
      path: path.join(cwd, 'index.js'),
      source: 'magic',
    };
    const nodes = [
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: 'jimpex',
          },
        },
      },
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: 'wootils/shared/deepAssign',
          },
        },
      },
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: 'wootils/node',
          },
        },
      },
    ];
    let currentNodes = nodes.slice();
    const firstNode = 'first-node';
    const programUtils = {
      get: jest.fn(() => firstNode),
    };
    const ast = {
      filter: jest.fn(),
      replaceWith: jest.fn(),
      find: jest.fn((type) => (type === 'Program' ? programUtils : ast)),
      toSource: jest.fn(),
    };
    ast.filter.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.filter(fn);
      return ast;
    });
    ast.filter.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.filter(fn);
      return ast;
    });
    ast.replaceWith.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.map(fn);
      return ast;
    });
    const jscodeshift = jest.fn(() => ast);
    jscodeshift.ImportDeclaration = 'ImportDeclaration';
    jscodeshift.Program = 'Program';
    jscodeshift.importDeclaration = jest.fn((_, str) => str);
    jscodeshift.literal = jest.fn((str) => str);
    const api = { jscodeshift };
    const cjs2esm = {
      extension: {
        ignore: ['ignored'],
      },
      modules: [],
    };
    const options = { cjs2esm };
    const nodeMods = path.join(cwd, 'node_modules');
    const jimpexPath = path.join(nodeMods, 'jimpex');
    utils.getAbsPathInfoSync.mockImplementationOnce(() => ({
      isFile: false,
      path: jimpexPath,
    }));
    const deepAssignPath = path.join(nodeMods, 'wootils', 'shared', 'deepAssign.js');
    utils.getAbsPathInfoSync.mockImplementationOnce(() => ({
      isFile: true,
      path: deepAssignPath,
    }));
    const nodePath = path.join(nodeMods, 'wootils', 'node');
    utils.getAbsPathInfoSync.mockImplementationOnce(() => ({
      isFile: false,
      path: nodePath,
    }));
    fs.pathExistsSync.mockImplementationOnce(() => true);
    fs.pathExistsSync.mockImplementationOnce(() => false);
    utils.findFileSync.mockImplementationOnce(() => path.join(nodePath, 'index.js'));
    // When
    transformer(file, api, options);
    // Then
    expect(currentNodes).toEqual([
      'jimpex',
      'wootils/shared/deepAssign.js',
      'wootils/node/index.js',
    ]);
  });

  it('should modify the modules import of a file', () => {
    // Given
    const file = {
      path: path.join(cwd, 'index.js'),
      source: 'magic',
    };
    const nodes = [
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: 'wootils/shared/deepAssign',
          },
        },
      },
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: 'parserror',
          },
        },
      },
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: 'lodash',
          },
        },
      },
      {
        value: {
          specifiers: 'specifier',
          source: {
            value: 'lodash-es',
          },
        },
      },
    ];
    let currentNodes = nodes.slice();
    const message = 'done';
    const firstNode = 'first-node';
    const programUtils = {
      get: jest.fn(() => firstNode),
    };
    const ast = {
      filter: jest.fn(),
      replaceWith: jest.fn(),
      find: jest.fn((type) => (type === 'Program' ? programUtils : ast)),
      toSource: jest.fn(() => message),
    };
    ast.filter.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.filter(fn);
      return ast;
    });
    ast.filter.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.filter(fn);
      return ast;
    });
    ast.replaceWith.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.map((item) => ({
        value: {
          specifiers: 'specifiers',
          source: {
            value: fn(item),
          },
        },
      }));

      return ast;
    });
    ast.replaceWith.mockImplementationOnce((fn) => {
      currentNodes = currentNodes.map(fn);
      return ast;
    });
    const jscodeshift = jest.fn(() => ast);
    jscodeshift.ImportDeclaration = 'ImportDeclaration';
    jscodeshift.Program = 'Program';
    jscodeshift.importDeclaration = jest.fn((_, str) => str);
    jscodeshift.literal = jest.fn((str) => str);
    const api = { jscodeshift };
    const cjs2esm = {
      extension: {
        ignore: [],
      },
      modules: [
        {
          name: 'wootils',
          path: 'wootils/esm',
        },
        {
          name: 'parserror',
          find: 'par\\w+or',
          path: 'parserror/esm',
        },
        { name: 'lodash', path: 'lodash-es' },
      ],
    };
    const options = { cjs2esm };
    const nodeMods = path.join(cwd, 'node_modules');
    const deepAssignPath = path.join(nodeMods, 'wootils', 'shared', 'deepAssign.js');
    utils.getAbsPathInfoSync.mockImplementationOnce(() => ({
      isFile: true,
      path: deepAssignPath,
    }));
    utils.getAbsPathInfoSync.mockImplementationOnce(() => null);
    utils.getAbsPathInfoSync.mockImplementationOnce(() => null);
    utils.getAbsPathInfoSync.mockImplementationOnce(() => null);
    let result = null;
    // When
    result = transformer(file, api, options);
    // Then
    expect(result).toBe(message);
    expect(currentNodes).toEqual([
      'wootils/esm/shared/deepAssign.js',
      'parserror/esm',
      'lodash-es',
      'lodash-es',
    ]);
  });
});
