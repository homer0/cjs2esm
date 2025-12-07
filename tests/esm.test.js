jest.unmock('../src/esm');

describe('esm', () => {
  let esmModule;
  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    // eslint-disable-next-line n/global-require
    esmModule = require('../src/esm');
  });

  it('should throw an error if modules are not loaded', () => {
    // Given/When/Then
    expect(() => esmModule.getESMModule('chalk')).toThrowError(
      'ESM modules are not loaded.',
    );
    expect(() => esmModule.getChalk()).toThrowError('ESM modules are not loaded.');
  });

  it('should emit a warning when loading modules twice', async () => {
    // Given
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    // When
    await esmModule.prepareESMModules();
    await esmModule.prepareESMModules();
    // Then
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('ESM modules are already loaded.');
  });

  it('should throw an error if the module is not found', async () => {
    // Given
    await esmModule.prepareESMModules();
    // When/Then
    expect(() => esmModule.getESMModule('foo')).toThrowError(
      'ESM module "foo" is not loaded.',
    );
  });

  it('should return a reference to chalk', async () => {
    // Given
    await esmModule.prepareESMModules();
    // When/Then
    expect(esmModule.getChalk()).toEqual(
      expect.objectContaining({
        default: expect.objectContaining({
          red: expect.any(Function),
        }),
      }),
    );
  });
});
