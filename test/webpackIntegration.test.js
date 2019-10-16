const path = require('path');
const fs = require('fs-extra');
const webpack = require('webpack');

const WebpackTranslationsPlugin = require('../');

const testFilesDirectory = path.resolve(__dirname, 'testFiles');

describe('Webpack translations plugin', () => {
  beforeEach(createTestFilesDirectory);
  afterEach(removeTestFilesDirectory);
  it('creates correct assets with only a base file', done => {
    createFileTreeWithContent({
      src: { 'index.js': "module.exports = require('source-only')" },
      'source-only': {
        'messages.json': '{ "fries": "Fries" }',
      },
    });

    const options = {
      moduleName: 'source-only',
      directory: 'source-only',
    };

    runWebpackWithPluginOptions(options, () => {
      expect(translationsForAllLanguages()).toEqual({
        source: {
          fries: 'Fries',
        },
      });

      done();
    });
  });

  it('creates correct assets with a base file and an en file', done => {
    createFileTreeWithContent({
      src: { 'index.js': "module.exports = require('one-locale')" },
      'one-locale': {
        'messages.json': '{ "fries": "Fries" }',
        'messages.en.json': '{ "fries": "Chips" }',
      },
    });

    const options = {
      moduleName: 'one-locale',
      directory: 'one-locale',
    };

    runWebpackWithPluginOptions(options, () => {
      expect(translationsForAllLanguages()).toEqual({
        en: {
          fries: 'Chips',
        },
      });

      done();
    });
  });

  it('creates correct assets with specified module name, directory and file name base', done => {
    createFileTreeWithContent({
      src: { 'index.js': "module.exports = require('new-module-name')" },
      'new-directory': {
        'new-file-name-base.json': '{ "fries": "Fries" }',
        'new-file-name-base.en.json': '{ "fries": "Chips" }',
        'new-file-name-base.en-US.json': '{ "fries": "French fries" }',
        'new-file-name-base.fr.json': '{ "fries": "Pomme frites" }',
        'new-file-name-base.de.json': '{ "fries": "Fritten" }',
      },
    });

    const options = {
      moduleName: 'new-module-name',
      directory: 'new-directory',
      fileNameBase: 'new-file-name-base',
    };

    runWebpackWithPluginOptions(options, () => {
      expect(translationsForAllLanguages()).toEqual({
        en: {
          fries: 'Chips',
        },
        'en-US': {
          fries: 'French fries',
        },
        fr: {
          fries: 'Pomme frites',
        },
        de: {
          fries: 'Fritten',
        },
      });

      expect(translationsForLanguage('en')).toEqual({
        en: {
          fries: 'Chips',
        },
      });

      expect(translationsForLanguage('en-US')).toEqual({
        'en-US': {
          fries: 'French fries',
        },
      });

      expect(translationsForLanguage('fr')).toEqual({
        fr: {
          fries: 'Pomme frites',
        },
      });

      expect(translationsForLanguage('de')).toEqual({
        de: {
          fries: 'Fritten',
        },
      });

      done();
    });
  });

  function createTestFilesDirectory() {
    createDirectoryIfDoesNotExist(testFilesDirectory);
  }

  function createDirectoryIfDoesNotExist(directory) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory);
    }
  }

  function removeTestFilesDirectory() {
    fs.removeSync(testFilesDirectory);
  }

  function createFileTreeWithContent(tree) {
    const directories = Object.keys(tree);

    directories.forEach(directory => {
      const directoryPath = path.resolve(testFilesDirectory, directory);

      createDirectoryIfDoesNotExist(directoryPath);
      const files = tree[directory];

      Object.keys(files).forEach(fileName => {
        fs.writeFileSync(path.resolve(directoryPath, fileName), files[fileName]);
      });
    });
  }

  function runWebpackWithPluginOptions(options, callback) {
    webpack(
      {
        mode: 'production',
        context: testFilesDirectory,
        output: {
          path: path.resolve(testFilesDirectory, 'dist'),
          libraryTarget: 'commonjs2',
        },
        plugins: [new WebpackTranslationsPlugin(options)],
      },
      errors => {
        if (errors) {
          throw errors;
        }

        callback();
      },
    );
  }

  function translationsForAllLanguages() {
    return require('./testFiles/dist/main'); // eslint-disable-line
  }

  function translationsForLanguage(language) {
    return require(`./testFiles/dist/main.${language}`); // eslint-disable-line
  }
});
