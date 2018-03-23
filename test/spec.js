const fs = require('fs');
const webpack = require('webpack');

jest.mock('fs');
let pluginInstance;
jest.mock('webpack', () => ({
  ExternalsPlugin: jest.fn(() => {
    const plugin = {
      apply: jest.fn(),
    };

    pluginInstance = plugin;
    return plugin;
  }),
}));

describe('Webpack translations plugin', () => {
  let WebpackTranslationsPlugin;

  beforeEach(() => {
    WebpackTranslationsPlugin = require('../');
  });

  afterEach(() => {
    webpack.ExternalsPlugin.mockClear();
    pluginInstance = null;
  });

  it('resolves the translations module from translations/messages.*.json and applies compiler by default', () => {
    const structure = {
      'a-context': {
        translations: {
          'messages.json': '{ "fries": "Fries" }',
          'messages.en.json': '{ "fries": "Chips" }',
          'messages.en-US.json': '{ "fries": "French fries" }',
        },
      },
    };
    const options = undefined;

    expectStructureWithOptionsToCallExternalsPluginForModule(structure, options, 'translations');
    expectStructureWithOptionsToProduceExpectedAssets(structure, options);
  });

  it('resolves passed module name if specified and applies compiler', () => {
    const structure = {
      'a-context': {
        translations: {
          'messages.json': '{ "fries": "Fries" }',
          'messages.en.json': '{ "fries": "Chips" }',
          'messages.en-US.json': '{ "fries": "French fries" }',
        },
      },
    };
    const options = { moduleName: 'new-module-name' };

    expectStructureWithOptionsToCallExternalsPluginForModule(structure, options, 'new-module-name');
    expectStructureWithOptionsToProduceExpectedAssets(structure, options);
  });

  it('gets translations from passed directory if specified and applies compiler', () => {
    const structure = {
      'a-context': {
        'new-directory': {
          'messages.json': '{ "fries": "Fries" }',
          'messages.en.json': '{ "fries": "Chips" }',
          'messages.en-US.json': '{ "fries": "French fries" }',
        },
      },
    };
    const options = { directory: 'new-directory' };

    expectStructureWithOptionsToCallExternalsPluginForModule(structure, options, 'translations');
    expectStructureWithOptionsToProduceExpectedAssets(structure, options);
  });

  it('gets translations from passed file name base if specified and applies compiler', () => {
    const structure = {
      'a-context': {
        translations: {
          'new-file-name-base.json': '{ "fries": "Fries" }',
          'new-file-name-base.en.json': '{ "fries": "Chips" }',
          'new-file-name-base.en-US.json': '{ "fries": "French fries" }',
        },
      },
    };
    const options = { fileNameBase: 'new-file-name-base' };

    expectStructureWithOptionsToCallExternalsPluginForModule(structure, options, 'translations');
    expectStructureWithOptionsToProduceExpectedAssets(structure, options);
  });

  it('resolves the translations module as "source" language from translations/messages.json when in development mode with extra escaping to function with eval', () => {
    const structure = {
      'a-context': {
        translations: {
          'messages.json': '{ "fries": "Fries" }',
        },
      },
    };
    const options = { development: true };

    expectStructureWithOptionsToCallExternalsPluginForModule(structure, options, 'translations');
    expectStructureWithOptionsToProduceExpectedEscapedAssets(structure, options);
  });

  function expectStructureWithOptionsToCallExternalsPluginForModule(structure, options, module) {
    fs.__setMockFiles(structure);

    const compiler = {
      context: 'a-context',
      hooks: { emit: { tap: () => {} } },
    };
    const plugin = new WebpackTranslationsPlugin(options);
    plugin.apply(compiler);

    expect(webpack.ExternalsPlugin).toHaveBeenCalledWith('var', {
      [module]: `'${plugin.MODULE_STRING_TO_BE_REPLACED}'`,
    });

    expect(pluginInstance.apply).toHaveBeenCalledWith(compiler);
  }

  function expectStructureWithOptionsToProduceExpectedAssets(structure, options) {
    expectStructureWithOptionsToProduceAssets(structure, options, getExpectedAssets());
  }

  function expectStructureWithOptionsToProduceExpectedEscapedAssets(structure, options) {
    expectStructureWithOptionsToProduceAssets(structure, options, getExpectedEscapedAssets());
  }

  function expectStructureWithOptionsToProduceAssets(structure, options, assets) {
    const compilation = getPluginCompilationForStructureAndOptions(structure, options);

    expectAssetsToEqual(compilation.assets, assets);
  }

  function getPluginCompilationForStructureAndOptions(structure, options) {
    fs.__setMockFiles(structure);

    const compilation = getDefaultCompilation();
    const compiler = {
      context: 'a-context',
      hooks: {
        emit: {
          tap: (name, callback) => {
            callback(compilation);
          },
        },
      },
    };

    new WebpackTranslationsPlugin(options).apply(compiler);

    return compilation;
  }

  function getDefaultCompilation() {
    return createCompilationForStructure({
      'a-script-file.js': "module.exports = '__TRANSLATIONS_MODULE_STRING_TO_BE_REPLACED__';",
      'another-script-file.js': "module.exports = '__TRANSLATIONS_MODULE_STRING_TO_BE_REPLACED__';",
      'index.html': '<html></html>',
    });
  }

  function getExpectedAssets() {
    return [
      {
        name: 'a-script-file.js',
        content: 'module.exports = {"en":{"fries":"Chips"},"en-US":{"fries":"French fries"}};',
      },
      {
        name: 'another-script-file.js',
        content: 'module.exports = {"en":{"fries":"Chips"},"en-US":{"fries":"French fries"}};',
      },
      { name: 'index.html', content: '<html></html>' },
      {
        name: 'a-script-file.en.js',
        content: 'module.exports = {"en":{"fries":"Chips"}};',
      },
      {
        name: 'a-script-file.en-US.js',
        content: 'module.exports = {"en-US":{"fries":"French fries"}};',
      },
      {
        name: 'another-script-file.en.js',
        content: 'module.exports = {"en":{"fries":"Chips"}};',
      },
      {
        name: 'another-script-file.en-US.js',
        content: 'module.exports = {"en-US":{"fries":"French fries"}};',
      },
    ];
  }

  function getExpectedEscapedAssets() {
    return [
      {
        name: 'a-script-file.js',
        content: 'module.exports = {\\"source\\":{\\"fries\\":\\"Fries\\"}};',
      },
      {
        name: 'another-script-file.js',
        content: 'module.exports = {\\"source\\":{\\"fries\\":\\"Fries\\"}};',
      },
      { name: 'index.html', content: '<html></html>' },
    ];
  }

  function createCompilationForStructure(structure) {
    const assets = Object.keys(structure).reduce(
      (assetsTillNow, fileName) => ({
        ...assetsTillNow,
        [fileName]: {
          source: () => structure[fileName],
        },
      }),
      {},
    );

    return { assets };
  }

  function expectAssetsToEqual(assets, comparable) {
    const assetsWithNameAndContent = Object.keys(assets).map(fileName => ({
      name: fileName,
      content: assets[fileName].source(),
    }));

    expect(assetsWithNameAndContent).toEqual(comparable);
  }
});
