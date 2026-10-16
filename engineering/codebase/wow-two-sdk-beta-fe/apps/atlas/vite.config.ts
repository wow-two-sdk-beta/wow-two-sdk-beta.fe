import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { libSourceAliases } from '../lib-source-alias.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const libRoot = path.resolve(here, '../..');

/* The atlas runs against the lib source, like the playground: every edit in `src/` hot-reloads here. It also
   renders the playground's typed fixtures on the components page, so both apps stay inside `fs.allow`. */
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // 5176 is the playground; 5178 is the next even port free in the workspace port ledger.
  server: { port: 5178, fs: { allow: [libRoot] } },
  resolve: {
    alias: libSourceAliases(libRoot, [
      {
        find: '@wow-two-beta/ui-vue/styles.css',
        replacement: path.resolve(libRoot, 'src/index.css'),
      },
      { find: /^@src\//, replacement: `${path.resolve(libRoot, 'src')}/` },
    ]),
  },
  optimizeDeps: {
    exclude: ['@wow-two-beta/ui-vue'],
  },
});
