import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const Module = require('module');
const original = Module._resolveFilename;
Module._resolveFilename = function resolve(request, parent, isMain, options) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    return original.call(this, path.join(root, 'src', request.slice(2)), parent, isMain, options);
  }
  return original.call(this, request, parent, isMain, options);
};

await import(pathToFileURL(path.join(root, 'scripts/verify-engine.ts')).href);
