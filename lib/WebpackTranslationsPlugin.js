const fs = require('fs');
const { resolve, join, basename, extname } = require('path');
const { ExternalsPlugin } = require('webpack');

module.exports = class WebpackTranslationsPlugin {
  constructor({
    directory = 'translations',
    fileNameBase = 'messages',
    moduleName = 'translations',
  } = {}) {
    this.directory = directory;
    this.fileNameBase = fileNameBase;
    this.moduleName = moduleName;

    this.MODULE_STRING_TO_BE_REPLACED = '__TRANSLATIONS_MODULE_STRING_TO_BE_REPLACED__';
  }

  apply(compiler) {
    this.setPath(compiler.context);

    this.resolveTranslationsModuleAsAStringToBeReplaced(compiler);

    compiler.hooks.emit.tap('TranslationPlugin', compilation => {
      const translatedAssets = this.createTranslatedAssets(compilation.assets);

      // eslint-disable-next-line no-param-reassign
      compilation.assets = {
        ...compilation.assets,
        ...translatedAssets,
      };
    });
  }

  setPath(context) {
    this.path = resolve(context, this.directory);
  }

  resolveTranslationsModuleAsAStringToBeReplaced(compiler) {
    new ExternalsPlugin('var', {
      [this.moduleName]: `'${this.MODULE_STRING_TO_BE_REPLACED}'`,
    }).apply(compiler);
  }

  createTranslatedAssets(assets) {
    const scriptFileNames = getScriptFileNamesFromAssets(assets);

    return this.createTranslatedAssetsForFileNames(scriptFileNames, assets);
  }

  createTranslatedAssetsForFileNames(fileNames, assets) {
    return fileNames.reduce(
      (assetsTillNow, fileName) => ({
        ...assetsTillNow,
        ...this.createTranslatedAssetsForFileName(fileName, assets),
      }),
      {},
    );
  }

  createTranslatedAssetsForFileName(name, assets) {
    const translationObjects = this.getTranslationObjects();
    const fileContent = assets[name].source();

    return translationObjects.reduce((assetsTillNow, object) => {
      const fileContentWithTranslations = this.addTranslationsToFileContent(object, fileContent);

      return {
        ...assetsTillNow,
        [getFileNameForFileNameAndTranslationObject(name, object)]: {
          source: () => fileContentWithTranslations,
          size: () => fileContentWithTranslations.length,
        },
      };
    }, {});
  }

  addTranslationsToFileContent(object, fileContent) {
    return fileContent.replace(
      new RegExp(`['"]${this.MODULE_STRING_TO_BE_REPLACED}['"]`, 'g'),
      JSON.stringify(object),
    );
  }

  getTranslationObjects() {
    const codes = this.getLanguageCodes();

    if (codes.length === 0) {
      throw new Error(
        `WebpackTranslationsPlugin: No translation files found matching ${join(
          this.directory,
          `${this.fileNameBase}.*.json`,
        )}`,
      );
    }

    const objectsForEveryLanguage = codes.map(code => ({
      [code]: this.getTranslationsForCode(code),
    }));

    const objectForAllLanguages = objectsForEveryLanguage.reduce(
      (objectForAll, objectForLanguage) => {
        const language = Object.keys(objectForLanguage)[0];

        return {
          ...objectForAll,
          [language]: objectForLanguage[language],
        };
      },
      {},
    );

    return [...objectsForEveryLanguage, objectForAllLanguages];
  }

  getLanguageCodes() {
    const fileNames = fs.readdirSync(this.path);

    return fileNames.map(getLanguageCodeFromFileName).filter(Boolean);
  }

  getTranslationsForCode(code) {
    const filePath = this.getTranslationsPathForCode(code);

    return readJSON(filePath);
  }

  getTranslationsPathForCode(code) {
    const fileName = `${this.fileNameBase}.${code}.json`;

    return join(this.path, fileName);
  }
};

function getScriptFileNamesFromAssets(assets) {
  const assetFileNames = Object.keys(assets);

  return assetFileNames.filter(fileName => extname(fileName) === '.js');
}

function getFileNameForFileNameAndTranslationObject(name, object) {
  const nameWithoutExtension = basename(name, '.js');

  if (translationObjectContainsOnlyOneLanguage(object)) {
    const language = Object.keys(object)[0];

    return `${nameWithoutExtension}.${language}.js`;
  }

  return `${nameWithoutExtension}.js`;
}

function translationObjectContainsOnlyOneLanguage(object) {
  return Object.keys(object).length === 1;
}

function getLanguageCodeFromFileName(name) {
  const parts = name.split('.');

  return parts.length === 3 ? parts[1] : null;
}

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf-8'));
}
