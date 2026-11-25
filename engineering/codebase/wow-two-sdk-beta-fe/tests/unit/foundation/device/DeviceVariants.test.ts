import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'tailwindcss';
import { beforeAll, describe, expect, it } from 'vitest';
import { DeviceClass, DeviceClassAttribute } from '@src/foundation/device';

// The `phone:` / `tablet:` / `desktop:` variants `src/index.css` ships, compiled by the Tailwind the SDK builds with,
// from a stylesheet that imports the SDK css the way an app does.

const sdkCss = fileURLToPath(new URL('../../../../src/index.css', import.meta.url));
const tailwindCss = createRequire(import.meta.url).resolve('tailwindcss/index.css');

const { Phone, Tablet, Desktop } = DeviceClass;

/** The rule `build` prints for `candidate`, whitespace and quotes folded so a formatting change is no failure. */
function rule(css: string, candidate: string): string {
  const escaped = candidate.replace(/[^\w-]/g, (char) => `\\${char}`);
  const start = css.indexOf(`.${escaped}`);
  expect(start, `no rule for ${candidate}`).toBeGreaterThanOrEqual(0);
  return css
    .slice(start, css.indexOf('}', start) + 1)
    .replace(/\s+/g, ' ')
    .replaceAll('"', "'");
}

let css: string;

beforeAll(async () => {
  const compiler = await compile(`@import '${sdkCss}';`, {
    base: dirname(sdkCss),
    async loadStylesheet(id, base) {
      const path = id === 'tailwindcss' ? tailwindCss : resolve(base, id);
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
    },
  });
  css = compiler.build(['phone:hidden', 'tablet:flex', 'desktop:block', 'not-phone:grid']);
});

describe('device-class variants', () => {
  it.each([
    ['phone:hidden', Phone, 'display: none'],
    ['tablet:flex', Tablet, 'display: flex'],
    ['desktop:block', Desktop, 'display: block'],
  ])('%s matches a descendant of <html data-device-class>', (candidate, deviceClass, declaration) => {
    expect(rule(css, candidate)).toBe(
      `.${candidate.replace(':', '\\:')}:where([${DeviceClassAttribute}='${deviceClass}'] *) { ${declaration}; }`,
    );
  });

  it('negates through not-*: not-phone: is on before mount, when the attribute is absent', () => {
    expect(rule(css, 'not-phone:grid')).toBe(
      `.not-phone\\:grid:not(:where([${DeviceClassAttribute}='${Phone}'] *)) { display: grid; }`,
    );
  });
});
