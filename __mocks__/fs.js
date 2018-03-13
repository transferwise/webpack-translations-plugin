const path = require('path');

const fs = jest.genMockFromModule('fs');

const workingDirectory = process.cwd();

let mockFiles = {}; // eslint-disable-line no-unused-vars
function __setMockFiles(files) {
  mockFiles = files;
}

function readdirSync(directoryPath) {
  const relativePath = getRelativePath(directoryPath);

  return Object.keys(getContentOfPath(relativePath));
}

function readFileSync(p) {
  const relativePath = getRelativePath(p);

  return getContentOfPath(relativePath);
}

function getRelativePath(p) {
  return p.replace(`${workingDirectory}/`, '');
}

function getContentOfPath(p) {
  const objectExpression = getObjectExpressionForPath(p);

  return eval(objectExpression); // eslint-disable-line no-eval
}

function getObjectExpressionForPath(p) {
  const pathParts = p.split(path.sep);
  const pathPartsInBrackets = pathParts.map(part => `['${part}']`);

  return ['mockFiles', ...pathPartsInBrackets].join('');
}

fs.__setMockFiles = __setMockFiles;
fs.readdirSync = readdirSync;
fs.readFileSync = readFileSync;

module.exports = fs;
