const fs = require('fs');
const { resolve, join, basename, extname } = require('path');
const { ExternalsPlugin } = require('webpack');

const SOURCE_FILE_LANGUAGE_CODE = 'source';
const OBJECT_FOR_ALL_LANGUAGES_KEY = 'objectForAllLanguages';

module.exports = class WebpackTranslationsPlugin {
  constructor({
    directory = 'translations',
    fileNameBase = 'messages',
    moduleName = 'translations',
    development = false,
  } = {}) {
    this.directory = directory;
    this.fileNameBase = fileNameBase;
    this.moduleName = moduleName;
    this.development = development;

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
      const translations = isTranslationObjectForAllLanguages(object)
        ? object[OBJECT_FOR_ALL_LANGUAGES_KEY]
        : object;
      const fileContentWithTranslations = this.addTranslationsToFileContent(
        translations,
        fileContent,
      );

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
    const string = this.stringifyTranslationsObject(object);

    return fileContent.replace(
      new RegExp(`['"]${this.MODULE_STRING_TO_BE_REPLACED}['"]`, 'g'),
      string,
    );
  }

  stringifyTranslationsObject(object) {
    const TEMPORARY_REPLACEMENT_STRING = '___TEMPORARY_REPLACEMENT___';

    return this.development
      ? JSON.stringify(object)
          .replace(/\\"/g, TEMPORARY_REPLACEMENT_STRING)
          .replace(/"/g, '\\"')
          .replace(new RegExp(TEMPORARY_REPLACEMENT_STRING, 'g'), `\\\\\\"`)
      : JSON.stringify(object);
  }

  getTranslationObjects() {
    const codes = this.getLanguageCodes();

    if (codes.length === 0) {
      // eslint-disable-next-line no-console
      console.log(
        `WebpackTranslationsPlugin: No translation files found matching ${join(
          this.directory,
          `${this.fileNameBase}.*.json`,
        )}, creating a bundle with source file...`,
      );

      return [{ [SOURCE_FILE_LANGUAGE_CODE]: this.getTranslationsForSourceFile() }];
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

    return [...objectsForEveryLanguage, { [OBJECT_FOR_ALL_LANGUAGES_KEY]: objectForAllLanguages }];
  }

  getLanguageCodes() {
    const fileNames = fs.readdirSync(this.path);

    return fileNames.map(getLanguageCodeFromFileName).filter(Boolean);
  }

  getTranslationsForSourceFile() {
    return this.getTranslationsForCode('');
  }

  getTranslationsForCode(code) {
    const filePath = this.getTranslationsPathForCode(code);

    return readJSON(filePath);
  }

  getTranslationsPathForCode(code) {
    const fileName = code ? `${this.fileNameBase}.${code}.json` : `${this.fileNameBase}.json`;

    return join(this.path, fileName);
  }
};

function getScriptFileNamesFromAssets(assets) {
  const assetFileNames = Object.keys(assets);

  return assetFileNames.filter(fileName => extname(fileName) === '.js');
}

function getFileNameForFileNameAndTranslationObject(name, object) {
  const nameWithoutExtension = basename(name, '.js');

  if (
    translationObjectContainsOnlyOneLanguage(object) &&
    !isTranslationObjectForSource(object) &&
    !isTranslationObjectForAllLanguages(object)
  ) {
    const language = Object.keys(object)[0];

    return `${nameWithoutExtension}.${language}.js`;
  }

  return `${nameWithoutExtension}.js`;
}

function translationObjectContainsOnlyOneLanguage(object) {
  return Object.keys(object).length === 1;
}

function isTranslationObjectForAllLanguages(object) {
  return Object.keys(object)[0] === OBJECT_FOR_ALL_LANGUAGES_KEY;
}

function isTranslationObjectForSource(object) {
  return Object.keys(object)[0] === SOURCE_FILE_LANGUAGE_CODE;
}

function getLanguageCodeFromFileName(name) {
  const parts = name.split('.');

  return parts.length === 3 ? parts[1] : null;
}

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf-8'));
}
