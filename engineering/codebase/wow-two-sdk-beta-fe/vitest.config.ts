import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { fileURLToPath } from 'node:url';
import { libSourceAliases } from './apps/lib-source-alias.mjs';

// Tests live under `tests/` (source-only `src/`); they reach back into source via the
// `@src/*` alias (mirrors the `tsconfig.json` path). Applied per project so every project
// (unit · ssr · dom · browser) resolves it.
const srcAlias = libSourceAliases(fileURLToPath(new URL('.', import.meta.url)), [
  { find: '@src', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
]);

/* The two suffixes the smoke layer routes on, excluded from every project that is not theirs. */
const smokeSuffixes = ['**/*.ssr.test.ts', '**/*.dom.test.ts'];

/*
 * Four projects:
 *  - unit    — node, pure logic: the framework-agnostic engines under the components
 *              (`foundation/*`, `domain/*`, `feedback` / `reporting` / `analytics` / `flags` / `auth`,
 *              `formsEngine`). Node is load-bearing here too, not just in `ssr`: with no
 *              `localStorage` and no `indexedDB`, a slice that forgot its capability guard
 *              throws on the first read rather than degrading.
 *  - ssr     — node, `renderToString` only. NO DOM globals, deliberately: the whole point of
 *              the tier is that a component touching `window`/`document` at setup or from an
 *              `immediate: true` watcher throws here. Giving this project a DOM environment
 *              would silently retire the tier.
 *  - dom     — happy-dom, mounts SFCs via @vue/test-utils. Interaction tests.
 *  - browser — real chromium, for anything needing layout, real focus, or true event timing.
 *
 * Test routing:
 *   `*.browser.test.ts` = needs a real DOM → browser project
 *   `*.dom.test.ts`     = mounts an SFC → dom project
 *   `*.ssr.test.ts`     = server-render only, must run WITHOUT a DOM → ssr project
 *   plain `*.test.ts` in the logic layers = pure logic → unit project
 */
export default defineConfig({
  resolve: { alias: srcAlias },
  test: {
    projects: [
      {
        plugins: [vue()],
        resolve: { alias: srcAlias },
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'tests/unit/foundation/**/*.test.ts',
            'tests/unit/domain/**/*.test.ts',
            'tests/unit/{router,query,auth,feedback,reporting,formsEngine,analytics,flags}/**/*.test.ts',
            // The atlas app's content graph and link codecs — pure data, no DOM.
            'tests/unit/atlas/**/*.test.ts',
          ],
          exclude: ['**/*.browser.test.ts', '**/*.component.test.ts', ...smokeSuffixes],
        },
      },
      {
        plugins: [vue()],
        resolve: { alias: srcAlias },
        test: {
          name: 'ssr',
          environment: 'node',
          include: ['tests/unit/**/*.ssr.test.ts'],
        },
      },
      {
        plugins: [vue()],
        resolve: { alias: srcAlias },
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: ['tests/unit/**/*.dom.test.ts'],
        },
      },
      {
        plugins: [vue(), tailwindcss()],
        resolve: { alias: srcAlias },
        optimizeDeps: { include: ['lossless-json', 'bignumber.js'] },
        test: {
          name: 'browser',
          include: ['tests/unit/**/*.component.test.ts', 'tests/unit/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [
              { browser: 'chromium', name: 'chromium' },
              { browser: 'firefox', name: 'firefox' },
              { browser: 'webkit', name: 'webkit' },
              {
                browser: 'chromium',
                name: 'chromium-forced-colors',
                provider: playwright({ contextOptions: { forcedColors: 'active' } }),
              },
            ],
          },
        },
      },
    ],
  },
});
