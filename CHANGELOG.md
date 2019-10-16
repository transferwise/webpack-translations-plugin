# v1.1.1
## Fixes `main.js` returning `__TRANSLATIONS_MODULE_STRING_TO_BE_REPLACED__`

# v1.1.0
## Adds a `development` option for webpack-dev-server, bundles under `source` key if only source translations file exists

When the `development` option is set, the exported value will be double escaped to work with webpack-dev-server's `eval` behaviour.
When no `messages.*.json` file exists, but `messages.json` does, a bundle will be built with the default filename,
containing translations under the `"source"` key.

# v1.0.0
## Stops adding `containsAllLanguages` and `language` properties to resolved `translations`

This caused more confusion and unnecessary coupling than necessary.
To get the language codes, the consumer can now just do `Object.keys(translations)`, and be sure to only get codes.

# v0.2.1
## Retriggers for README on npm

# v0.2.0
## Adds WebpackTranslationsPlugin

`WebpackTranslationsPlugin` is exposed as the default export of this package.

# v0.1.0
## Initial release