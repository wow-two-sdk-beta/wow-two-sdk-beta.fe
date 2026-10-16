// Run after pnpm build: node --expose-gc scripts/benchmark-core.mjs [package-directory]
// Isolated process per sample; compare the same machine/runtime and retain all numeric values.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] ?? '.');
const { ExactNumber } = await import(pathToFileURL(resolve(root, 'dist/foundation/numbers/index.js')).href);
if (!global.gc) throw new Error('Run Node with --expose-gc to measure retained memory.');
for (let index = 0; index < 1000; index++) ExactNumber.parse('1234567890123456789.12');
global.gc();
const heap = process.memoryUsage().heapUsed;
const start = performance.now();
const values = Array.from({ length: 100000 }, (_, index) => {
  const result = ExactNumber.parse(`${index}.1234567890123456789`);
  if (!result.ok) throw new Error('Benchmark token rejected.');
  return result.value;
});
const parseMs = performance.now() - start;
global.gc();
const retainedBytes = process.memoryUsage().heapUsed - heap;
const themeStart = performance.now();
const themes = await import(pathToFileURL(resolve(root, 'dist/foundation/themes/index.js')).href);
const themeImportMs = performance.now() - themeStart;
const lookupStart = performance.now();
const selected = themes.getTheme('wow');
const themeLookupMs = performance.now() - lookupStart;
console.log(
  JSON.stringify({ count: values.length, parseMs, retainedBytes, themeImportMs, themeLookupMs, selected: selected.id }),
);
