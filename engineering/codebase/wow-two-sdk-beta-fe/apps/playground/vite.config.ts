import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { libSourceAliases } from '../lib-source-alias.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const libRoot = path.resolve(here, '../..');

/* Aliases the published package paths to the lib source so every edit in
   `src/` hot-reloads here. No `vite build --watch` step in the dev loop.
   Subpaths resolve to their physical layer folder (`src/<layer>/<sub>/index.ts`)
   via the shared map in `apps/lib-source-alias.mjs`. */
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // 5173/5174/5175 are taken by the React package's playground / showcase /
  // theme-studio in the workspace preview registry.
  server: { port: 5176, fs: { allow: [libRoot] } },
  resolve: {
    alias: libSourceAliases(libRoot, [
      {
        find: '@wow-two-beta/ui-vue/styles.css',
        replacement: path.resolve(libRoot, 'src/index.css'),
      },
      // The lib's own relative imports use `@src/*` in a couple of places
      // (mirrors tsconfig `paths`); keep it resolvable from here too.
      { find: /^@src\//, replacement: `${path.resolve(libRoot, 'src')}/` },
    ]),
  },
  optimizeDeps: {
    // The lib is consumed as raw source through the aliases above; pre-bundling
    // it would freeze a snapshot and defeat the hot-reload-on-edit point.
    exclude: ['@wow-two-beta/ui-vue'],
  },
});
