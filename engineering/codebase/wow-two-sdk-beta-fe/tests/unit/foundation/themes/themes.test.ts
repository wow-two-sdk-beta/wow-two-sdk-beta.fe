import { describe, expect, it } from 'vitest';
import {
  candidateThemes,
  contrastPairRatio,
  contrastPairs,
  contrastRatio,
  emitThemesManifest,
  generateTheme,
  getTheme,
  Oklch,
  oklchToHex,
  parseColor,
  readableForeground,
  SemanticTokens,
  ThemeCatalog,
  ThemeIds,
  THEMES,
  themeToCss,
  ThemeStatus,
  validatedThemes,
  validateTheme,
} from '@src/foundation/themes';

/*
 * Smoke depth, `unit` project (node). The engine is pure math over an OKLCH seed, so the two
 * things worth pinning are the ones a curated-theme drift would break silently:
 * the generator emits the FULL documented token set for both modes, and the color conversion
 * round-trips — a hue that drifts on the way out and back is a brand color the app renders
 * slightly wrong on every surface.
 */

describe('generateTheme', () => {
  const theme = generateTheme({ id: 'smoke-seed', name: 'Smoke Seed', primaryHue: 265 });

  it('emits every semantic token in both modes', () => {
    for (const token of SemanticTokens) {
      expect(theme.light[token], `light is missing \`${token}\``).toBeDefined();
      expect(theme.dark[token], `dark is missing \`${token}\``).toBeDefined();
    }
  });

  it('is deterministic — the same seed yields an identical theme', () => {
    const again = generateTheme({ id: 'smoke-seed', name: 'Smoke Seed', primaryHue: 265 });
    expect(again).toEqual(theme);
  });

  it('lands a generated theme at `candidate`, never `validated`', () => {
    expect(theme.status).toBe(ThemeStatus.Candidate);
  });

  it('carries a contrast verdict, and the validator agrees with it', () => {
    expect(validateTheme({ light: theme.light, dark: theme.dark }).contrastAA).toBe(theme.meta.contrastAA);
  });

  it('scores each public pair with the ratio the validator gates on', () => {
    const failing = (['light', 'dark'] as const).flatMap((mode) =>
      contrastPairs().filter((pair) => !(contrastPairRatio(theme[mode], pair) >= pair.min)),
    );
    expect(failing.length === 0).toBe(theme.meta.contrastAA);
    const translucent = contrastPairs().find((pair) => pair.bg === 'primary' && pair.opacity !== undefined)!;
    // A translucent fill composites over its host surface, so it never scores like the opaque token.
    expect(contrastPairRatio(theme.light, translucent)).not.toBe(
      contrastRatio(parseColor(theme.light[translucent.fg])!, parseColor(theme.light[translucent.bg])!),
    );
  });
});

describe('Oklch conversion', () => {
  it('round-trips a color through hex without drifting', () => {
    const source = { l: 0.62, c: 0.16, h: 265 };
    const back = parseColor(oklchToHex(source));

    expect(back).not.toBeNull();
    expect(back?.l).toBeCloseTo(source.l, 2);
    expect(back?.c).toBeCloseTo(source.c, 2);
    expect(back?.h).toBeCloseTo(source.h, 0);
  });

  it('normalizes a hue onto 0–360', () => {
    expect(Oklch.normalizeHue(400)).toBeCloseTo(40, 6);
    expect(Oklch.normalizeHue(-40)).toBeCloseTo(320, 6);
  });

  it('returns null for a value it cannot read, rather than a bogus color', () => {
    expect(parseColor('not a color')).toBeNull();
  });

  it('reports the maximum ratio for black against white', () => {
    expect(contrastRatio({ l: 0, c: 0, h: 0 }, { l: 1, c: 0, h: 0 })).toBeCloseTo(21, 0);
  });
});

describe('the curated registry', () => {
  it('resolves a shipped theme by id', () => {
    const first = THEMES[0];
    expect(first).toBeDefined();
    expect(getTheme(first?.id ?? '')).toBe(first);
  });
});

it('rejects malformed OKLCH numeric fields instead of accepting parseFloat prefixes', () => {
  expect(parseColor('oklch(50..2% 0.1 30)')).toBeNull();
  expect(parseColor('oklch(. 0.1 30)')).toBeNull();
  expect(parseColor('oklch(50% 0.1 -30)')?.h).toBe(330);
});
it('resolves catalog entries consistently through lookup and array access', () => {
  const theme = getTheme('wow');
  expect(theme).toBeDefined();
  expect(THEMES.find((entry) => entry.id === 'wow')).toBe(theme);
  expect(getTheme('wow')).toBe(theme);
  expect(getTheme('missing-theme')).toBeUndefined();
});

it('ships the Wheelhouse directions with their glass backdrops, AA in both modes', () => {
  const ids = ['glass-harbor', 'frost', 'bento-deck', 'harbor-frost'];
  for (const id of ids) {
    const theme = getTheme(id);
    expect(theme, id).toBeDefined();
    expect(theme!.meta.contrastAA, `${id}: ${theme!.meta.failures?.join('; ')}`).toBe(true);
  }
  const css = themeToCss(getTheme('harbor-frost')!);
  const [light, dark] = css.split('\n\n');
  expect(light).toContain('--theme-ambient: radial-gradient(');
  expect(dark).toContain('--theme-ambient: radial-gradient(');
  expect(light).not.toEqual(dark);
  expect(themeToCss(getTheme('bento-deck')!)).not.toContain('--theme-ambient');
});

describe('the platform theme', () => {
  const theme = getTheme('platform')!;

  it('is the validated shared theme, listed first', () => {
    expect(theme).toBeDefined();
    expect(theme.name).toBe('Platform');
    expect(theme.status).toBe(ThemeStatus.Validated);
    expect(ThemeIds[0]).toBe('platform');
    expect(ThemeCatalog[0]).toEqual({ id: 'platform', name: 'Platform', status: ThemeStatus.Validated });
    expect(validatedThemes()).toContain(theme);
    expect(candidateThemes()).not.toContain(theme);
  });

  it('defines every token of the contract in both modes and clears AA', () => {
    for (const token of SemanticTokens) {
      expect(theme.light[token], `light \`${token}\``).toMatch(/^#[0-9a-f]{6}$/u);
      expect(theme.dark[token], `dark \`${token}\``).toMatch(/^#[0-9a-f]{6}$/u);
    }
    expect(theme.meta, theme.meta.failures?.join('; ')).toEqual({ contrastAA: true });
    expect(validateTheme(theme)).toEqual({ contrastAA: true });
  });

  it('keeps the palette surfaces, fills and fields unchanged', () => {
    expect(theme.light).toMatchObject({
      background: '#f4f4ef',
      card: '#ffffff',
      field: '#ffffff',
      muted: '#eaece5',
      border: '#dde2d8',
      input: '#758579',
      primary: '#285c4b',
      accent: '#806235',
    });
    expect(theme.dark).toMatchObject({
      background: '#121917',
      card: '#1b2420',
      field: '#121917',
      muted: '#29352e',
      border: '#344138',
      input: '#7b8d7f',
      primary: '#a6d4bd',
      accent: '#d9bd8c',
    });
    expect(theme.radius).toBeUndefined();
  });

  it('emits light and dark blocks, each with its own ambient backdrop', () => {
    const [light, dark] = themeToCss(theme).split('\n\n');
    expect(light).toMatch(/^\.theme-platform \{/u);
    expect(dark).toMatch(/^\.dark\.theme-platform, \.dark \.theme-platform \{/u);
    expect(light).toContain('--color-field: #ffffff;');
    expect(dark).toContain('--color-field: #121917;');
    expect(light).toContain('--theme-ambient: radial-gradient(');
    expect(dark).toContain('--theme-ambient: radial-gradient(');
    expect(theme.ambient!.light).not.toBe(theme.ambient!.dark);
  });

  it('appears in the manifest as validated and AA-proven', () => {
    expect(emitThemesManifest(THEMES)[0]).toMatchObject({ id: 'platform', status: 'validated', contrastAA: true });
  });
});

describe('the ocharo theme', () => {
  const theme = getTheme('ocharo')!;

  it('is an AA-proven candidate with the large radius', () => {
    expect(theme.name).toBe('Ocharo');
    expect(theme.status).toBe(ThemeStatus.Candidate);
    expect(theme.radius).toBe('lg');
    expect(theme.tags).toEqual(expect.arrayContaining(['raspberry', 'ink', 'graphite', 'glass']));
    for (const token of SemanticTokens) {
      expect(theme.light[token], `light \`${token}\``).toMatch(/^#[0-9a-f]{6}$/u);
      expect(theme.dark[token], `dark \`${token}\``).toMatch(/^#[0-9a-f]{6}$/u);
    }
    expect(theme.meta, theme.meta.failures?.join('; ')).toEqual({ contrastAA: true });
  });

  it('carries the approved Ink and Raspberry and Neutral graphite values', () => {
    expect(theme.light).toMatchObject({
      background: '#f5f6fa',
      card: '#ffffff',
      popover: '#ffffff',
      foreground: '#181b25',
      'muted-foreground': '#555e72',
      primary: '#8b2459',
      'primary-foreground': '#ffffff',
      'primary-soft': '#f8e9f0',
      border: '#dfe3ed',
      ring: '#9d2e6a',
      // Approved #858ea3 and #8b2459, moved in lightness only to clear their declared pairs over `muted`.
      input: '#828b9f',
      'border-strong': '#828b9f',
      'primary-soft-foreground': '#892257',
    });
    expect(theme.dark).toMatchObject({
      background: '#141416',
      card: '#1d1d20',
      popover: '#29292d',
      foreground: '#f4f2f5',
      'muted-foreground': '#b7b3bd',
      primary: '#c24783',
      'primary-foreground': '#ffffff',
      'primary-soft': '#392330',
      'primary-soft-foreground': '#e69abc',
      border: '#3d3b42',
      input: '#85808c',
      'border-strong': '#85808c',
      ring: '#e69abc',
    });
  });

  it('no longer carries the Studio pomegranate candidate', () => {
    const values = [...Object.values(theme.light), ...Object.values(theme.dark)];
    for (const studio of ['#7a3944', '#daa0aa', '#f1f0eb', '#242b29']) expect(values).not.toContain(studio);
  });

  it('paints the approved medium backdrop in both modes', () => {
    expect(theme.ambient).toEqual({
      light:
        'radial-gradient(ellipse 60% 55% at 0% 0%, #8b245929, transparent 70%), ' +
        'radial-gradient(ellipse 55% 60% at 100% 100%, #2457ce1c, transparent 70%), ' +
        'radial-gradient(ellipse 40% 35% at 70% 8%, #c2478314, transparent 75%)',
      dark:
        'radial-gradient(ellipse 60% 55% at 0% 0%, #c2478329, transparent 70%), ' +
        'radial-gradient(ellipse 55% 60% at 100% 100%, #5b6cc81c, transparent 70%), ' +
        'radial-gradient(ellipse 40% 35% at 70% 8%, #8a6f9e14, transparent 75%)',
    });
    const [light, dark] = themeToCss(theme).split('\n\n');
    expect(light).toMatch(/^\.theme-ocharo \{/u);
    expect(dark).toMatch(/^\.dark\.theme-ocharo, \.dark \.theme-ocharo \{/u);
    expect(light).toContain('--color-primary: #8b2459;');
    expect(dark).toContain('--color-primary: #c24783;');
    expect(light).toContain(`--theme-ambient: ${theme.ambient!.light};`);
    expect(dark).toContain(`--theme-ambient: ${theme.ambient!.dark};`);
  });

  it('appears in the manifest as an AA-proven candidate', () => {
    expect(emitThemesManifest(THEMES).find((entry) => entry.id === 'ocharo')).toMatchObject({
      status: 'candidate',
      contrastAA: true,
    });
  });

  it('emits the approved frame glass in both modes, the highlight inside every shadow', () => {
    const [light, dark] = themeToCss(theme).split('\n\n');
    for (const line of [
      '--glass-fill: rgb(255 255 255 / 0.84);',
      '--glass-side-fill: rgb(255 255 255 / 0.6);',
      '--glass-menu-fill: rgb(255 255 255 / 0.92);',
      '--glass-blur: 24px;',
      '--glass-saturate: 120%;',
      '--glass-edge: rgb(24 27 37 / 0.08);',
      '--glass-highlight: rgb(255 255 255 / 0.9);',
      '--glass-shadow: 0 10px 30px rgb(24 27 37 / 0.06), inset 0 1px 0 var(--glass-highlight);',
      '--glass-bottom-shadow: 0 -10px 30px rgb(24 27 37 / 0.06), inset 0 1px 0 var(--glass-highlight);',
      '--glass-menu-shadow: 0 18px 50px rgb(24 27 37 / 0.16), inset 0 1px 0 var(--glass-highlight);',
    ]) {
      expect(light).toContain(line);
    }
    for (const line of [
      '--glass-fill: rgb(41 41 45 / 0.9);',
      '--glass-side-fill: rgb(33 33 37 / 0.7);',
      '--glass-menu-fill: rgb(41 41 45 / 0.96);',
      '--glass-blur: 24px;',
      '--glass-saturate: 100%;',
      '--glass-edge: rgb(255 255 255 / 0.07);',
      '--glass-highlight: rgb(255 255 255 / 0.06);',
      '--glass-shadow: 0 12px 32px rgb(0 0 0 / 0.25), inset 0 1px 0 var(--glass-highlight);',
      '--glass-bottom-shadow: 0 -12px 32px rgb(0 0 0 / 0.25), inset 0 1px 0 var(--glass-highlight);',
      '--glass-menu-shadow: 0 20px 60px rgb(0 0 0 / 0.5), inset 0 1px 0 var(--glass-highlight);',
    ]) {
      expect(dark).toContain(line);
    }
  });

  it('keeps body text AA on every glass fill over the page', () => {
    /** An `rgb(r g b / a)` fill composited over an opaque `#rrggbb` page, as `#rrggbb`. */
    const over = (fill: string, page: string): string => {
      const [r, g, b, a] = fill.match(/[\d.]+/gu)!.map(Number);
      const base = page.match(/[0-9a-f]{2}/giu)!.map((part) => Number.parseInt(part, 16));
      const mix = [r!, g!, b!].map((channel, index) => Math.round(channel * a! + base[index]! * (1 - a!)));
      return `#${mix.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
    };
    for (const mode of ['light', 'dark'] as const) {
      const glass = theme.glass![mode];
      for (const fill of [glass.fill!, glass.sideFill!, glass.menuFill!]) {
        const backdrop = over(fill, theme[mode].background);
        for (const text of ['foreground', 'muted-foreground'] as const) {
          const ratio = contrastRatio(parseColor(theme[mode][text])!, parseColor(backdrop)!);
          expect(ratio, `${mode} ${text} on ${fill}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

describe('a theme without glass strength', () => {
  it('emits no glass properties, so the surfaces keep the SDK glass', () => {
    for (const id of ['platform', 'frost', 'bento-deck'])
      expect(themeToCss(getTheme(id)!), id).not.toContain('--glass-');
  });
});

describe('readableForeground', () => {
  it('picks the text pole with more contrast, and reads AA on saturated fills', () => {
    for (const fill of ['#1e3a8a', '#b91c1c', '#15803d', '#7c3aed', '#fde68a', '#e0f2fe', '#f97316']) {
      const text = readableForeground(fill)!;
      const ratio = contrastRatio(parseColor(text)!, parseColor(fill)!);
      expect(ratio, fill).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('returns null for colors the engine cannot parse', () => {
    expect(readableForeground('var(--brand)')).toBeNull();
    expect(readableForeground('rebeccapurple')).toBeNull();
    expect(readableForeground(undefined)).toBeNull();
  });
});
