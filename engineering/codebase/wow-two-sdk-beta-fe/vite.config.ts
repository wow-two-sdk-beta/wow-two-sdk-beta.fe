import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

const here = dirname(fileURLToPath(import.meta.url));

const pkg = JSON.parse(readFileSync(resolve(here, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  exports: Record<string, string | { import?: string }>;
};

// The manifest owns the public entry list; every JavaScript export must have source.
const entry = Object.fromEntries(
  Object.values(pkg.exports).flatMap((target) => {
    if (typeof target === 'string' || !target.import?.endsWith('.js')) return [];
    const output = target.import.replace(/^\.\/dist\//, '').replace(/\.js$/, '');
    const source = `src/${output}.ts`;
    if (!existsSync(resolve(here, source))) {
      throw new Error(`Public export has no source: ${target.import} -> ${source}`);
    }
    return [[output, source]];
  }),
);

// tsup auto-externalizes `dependencies` + `peerDependencies`; Vite's lib mode does not, so
// reproduce it here — otherwise `clsx`/`tailwind-merge`/… get inlined into all ~50 entries.
// `@vue/test-utils` (a devDep) is external only so the `query/testing` entry references it
// rather than inlining it.
const externalPackages = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  '@vue/test-utils',
];

const isExternal = (id: string) =>
  id.startsWith('node:') || externalPackages.some((name) => id === name || id.startsWith(`${name}/`));

export default defineConfig({
  resolve: {
    // Mirrors the `@src/*` path in tsconfig.json — tests reach back into source through it.
    alias: { '@src': resolve(here, 'src') },
  },
  plugins: [
    vue(),
    dts({
      tsconfigPath: resolve(here, 'tsconfig.json'),
      entryRoot: resolve(here, 'src'),
      outDir: resolve(here, 'dist'),
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.vue'],
      // One .d.ts per source file, mirroring `dist/` 1:1 — no rollup of types (the React
      // package hit rollup-plugin-dts ENFILE issues on macOS; keep the flat emit here too).
      rollupTypes: false,
      insertTypesEntry: false,
      staticImport: false,
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    minify: false,
    // Every entry keeps its own CSS import graph out of a single shared bundle; `src/index.css`
    // is copied verbatim by the `build` script (consumers run it through their own Tailwind).
    cssCodeSplit: true,
    lib: {
      entry,
      formats: ['es'],
    },
    rollupOptions: {
      external: isExternal,
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
