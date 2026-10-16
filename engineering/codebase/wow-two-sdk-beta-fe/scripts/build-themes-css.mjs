/* ---------------------------------------------------------------------------
 * Emit dist/themes.css + dist/themes.json from the curated registry.
 *
 * Runs AFTER vite has compiled src/ → dist/ (so dist/foundation/themes/index.js exists).
 * Wired into the package `build` script. Pure Node, no extra deps.
 *
 * Outputs:
 *   dist/themes.css   — every theme as `.theme-{id}` + `.dark.theme-{id}` blocks
 *   dist/themes.json  — machine-readable manifest (id, name, description, tags, contrastAA)
 * ------------------------------------------------------------------------- */

import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const distThemes = resolve(here, '../dist/foundation/themes/index.js');

// The Vue port lands layer by layer — skip cleanly until `foundation/themes` exists,
// so `pnpm build` isn't red for every layer that ships before it.
if (!existsSync(distThemes)) {
  console.log('themes: dist/foundation/themes/index.js not built yet — skipping themes emit');
  process.exit(0);
}

const { THEMES, emitAllThemesCss, emitThemesManifest } = await import(distThemes);

const cssPath = resolve(here, '../dist/themes.css');
const jsonPath = resolve(here, '../dist/themes.json');

writeFileSync(cssPath, emitAllThemesCss(THEMES), 'utf8');
writeFileSync(jsonPath, JSON.stringify(emitThemesManifest(THEMES), null, 2) + '\n', 'utf8');

const proven = THEMES.filter((t) => t.meta.contrastAA).length;
console.log(
  `themes: emitted ${THEMES.length} themes → dist/themes.css + dist/themes.json ` +
    `(${proven}/${THEMES.length} pass declared contrast pairs)`,
);
