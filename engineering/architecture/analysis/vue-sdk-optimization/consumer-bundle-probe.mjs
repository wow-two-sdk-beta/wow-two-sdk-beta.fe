// Analysis-only probe. Run after building the Vue package; writes only temporary entrypoints.
// Measures the actual implementation; the previous two-engine baseline remains in its saved JSON.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const pkg = fileURLToPath(new URL('../../../codebase/wow-two-sdk-beta-fe/', import.meta.url));
const { build } = await import(pathToFileURL(join(pkg, 'node_modules/vite/dist/node/index.js')).href);
const scratch = mkdtempSync(join(tmpdir(), 'vue-consumer-bundle-'));
const cases = [
  ['button', 'presentation/actions', 'Button'],
  ['text', 'presentation/display', 'Text'],
  ['card', 'presentation/display', 'Card'],
  ['http', 'foundation/http', 'createApiClient'],
  ['numbers', 'foundation/numbers', 'ExactNumber'],
];
const rows = [];
try {
  for (const mode of ['current']) {
    for (const [name, entry, symbol] of cases) {
      const file = join(scratch, name + '.mjs');
      writeFileSync(
        file,
        'import {' + symbol + '} from ' + JSON.stringify(join(pkg, 'dist', entry, 'index.js')) +
          '; globalThis.__sdkAudit = ' + symbol + ';',
      );
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        root: scratch,
        build: {
          write: false,
          minify: 'esbuild',
          rollupOptions: { input: file, external: ['vue'], output: { format: 'es' } },
        },
      });
      const chunks = (Array.isArray(result) ? result : [result])
        .flatMap((item) => item.output).filter((item) => item.type === 'chunk');
      const code = chunks.map((chunk) => chunk.code).join('');
      rows.push({ mode, name, bytes: Buffer.byteLength(code), gzip: gzipSync(code).length });
    }
  }
  process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
