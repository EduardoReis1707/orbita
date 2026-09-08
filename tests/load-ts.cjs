const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function loadTs(filename, mocks = {}, cache = new Map()) {
  const resolved = path.isAbsolute(filename) ? filename : path.join(root, filename);
  const file = [resolved, resolved + '.ts', resolved + '.tsx', path.join(resolved, 'index.ts')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!file) throw new Error('Missing module: ' + filename);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const localRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id === 'server-only') return {};
    if (id.startsWith('@/')) return loadTs(path.join(root, 'src', id.slice(2)), mocks, cache);
    if (id.startsWith('.')) return loadTs(path.resolve(path.dirname(file), id), mocks, cache);
    if (['@prisma/client', 'groq-sdk', '@google/genai', 'next/cache', 'next/headers'].includes(id)) throw new Error('Test requires explicit mock: ' + id);
    return require(id);
  };
  vm.runInThisContext('(function(require,module,exports,__filename,__dirname){' + code + '\n})', { filename: file })(localRequire,mod,mod.exports,file,path.dirname(file));
  return mod.exports;
}
module.exports = { loadTs };
