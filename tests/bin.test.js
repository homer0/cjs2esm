jest.unmock('../src/bin');

/**
 * @typedef {import('../src')} Functions
 */

describe('bin', () => {
  beforeEach(() => {
    jest.resetModules();
  });
  /**
   * This is inside a function so it can be reloaded at the beginning of each test;
   * otherwise, the version of the "bin" that gets loaded won't have the same mocks.
   *
   * @returns {Functions}
   */
  const getFunctions = () => {
    // eslint-disable-next-line global-require
    const fns = require('../src');
    return fns;
  };
  /**
   * This function exists because the "bin" executes on load and it needs to be tested multiple
   * times.
   */
  const loadBin = () => {
    // eslint-disable-next-line global-require
    require('../src/bin');
  };
  /**
   * The "bin" executes a top async function, to this hack is necessary in order to wait
   * for all the functions run before doing the assertions.
   *
   * @returns {Promise}
   */
  const sleep = () =>
    new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

  it('should execute the tool', async () => {
    const config = {
      input: 'some-input',
      output: 'some-output',
      extension: {
        use: 'jsx',
      },
      forceDirectory: 'maybe',
    };
    const files = ['file-a.js', 'file-b.mjs'];
    const fns = getFunctions();
    fns.getConfiguration.mockImplementationOnce(() => config);
    fns.copyFiles.mockImplementationOnce(() => files);
    // When
    loadBin();
    await sleep();
    // Then
    expect(fns.getConfiguration).toHaveBeenCalledTimes(1);
    expect(fns.copyFiles).toHaveBeenCalledTimes(1);
    expect(fns.copyFiles).toHaveBeenCalledWith(
      config.input,
      config.output,
      config.extension.use,
      config.forceDirectory,
    );
    expect(fns.transformOutput).toHaveBeenCalledTimes(1);
    expect(fns.transformOutput).toHaveBeenCalledWith(files, config);
    expect(fns.updatePackageJSON).toHaveBeenCalledTimes(0);
    expect(fns.addPackageJSON).toHaveBeenCalledTimes(0);
  });

  it('should execute the tool and modify the project package.json', async () => {
    const config = {
      input: 'some-input',
      output: 'some-output',
      extension: {
        use: 'jsx',
      },
      forceDirectory: 'maybe',
      addModuleEntry: true,
    };
    const files = ['file-a.js', 'file-b.mjs'];
    const fns = getFunctions();
    fns.getConfiguration.mockImplementationOnce(() => config);
    fns.copyFiles.mockImplementationOnce(() => files);
    // When
    loadBin();
    await sleep();
    // Then
    expect(fns.getConfiguration).toHaveBeenCalledTimes(1);
    expect(fns.copyFiles).toHaveBeenCalledTimes(1);
    expect(fns.copyFiles).toHaveBeenCalledWith(
      config.input,
      config.output,
      config.extension.use,
      config.forceDirectory,
    );
    expect(fns.transformOutput).toHaveBeenCalledTimes(1);
    expect(fns.transformOutput).toHaveBeenCalledWith(files, config);
    expect(fns.updatePackageJSON).toHaveBeenCalledTimes(1);
    expect(fns.addPackageJSON).toHaveBeenCalledTimes(0);
  });

  it('should execute the tool and create a package.json', async () => {
    const config = {
      input: 'some-input',
      output: 'some-output',
      extension: {
        use: 'jsx',
      },
      forceDirectory: 'maybe',
      addPackageJson: true,
    };
    const files = ['file-a.js', 'file-b.mjs'];
    const fns = getFunctions();
    fns.getConfiguration.mockImplementationOnce(() => config);
    fns.copyFiles.mockImplementationOnce(() => files);
    // When
    loadBin();
    await sleep();
    // Then
    expect(fns.getConfiguration).toHaveBeenCalledTimes(1);
    expect(fns.copyFiles).toHaveBeenCalledTimes(1);
    expect(fns.copyFiles).toHaveBeenCalledWith(
      config.input,
      config.output,
      config.extension.use,
      config.forceDirectory,
    );
    expect(fns.transformOutput).toHaveBeenCalledTimes(1);
    expect(fns.transformOutput).toHaveBeenCalledWith(files, config);
    expect(fns.updatePackageJSON).toHaveBeenCalledTimes(0);
    expect(fns.addPackageJSON).toHaveBeenCalledTimes(1);
  });
});
