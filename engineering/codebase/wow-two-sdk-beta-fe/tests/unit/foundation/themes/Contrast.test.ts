import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEMES, getTheme, validateTheme, contrastPairs, type TokenSet } from '@src/foundation/themes';
import { Tones } from '@src/foundation/styles';

// Independent sRGB luminance/compositing calculation: no SDK contrast or conversion helpers.
function rgb(css: string): number[] {
  if (css.startsWith('#'))
    return css
      .slice(1)
      .match(/../g)!
      .map((part) => Number.parseInt(part, 16) / 255);
  const [light, chroma, hue] = css.match(/[\d.]+/g)!.map(Number);
  const angle = (hue! * Math.PI) / 180;
  const a = chroma! * Math.cos(angle);
  const b = chroma! * Math.sin(angle);
  const l = (light! / 100 + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (light! / 100 - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (light! / 100 - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((value) => {
    const bounded = Math.min(1, Math.max(0, value));
    return bounded <= 0.0031308 ? 12.92 * bounded : 1.055 * bounded ** (1 / 2.4) - 0.055;
  });
}

function ratio(foreground: number[], background: number[]): number {
  const luminance = (values: number[]): number =>
    values.reduce((sum, value, index) => {
      const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      return sum + linear * [0.2126, 0.7152, 0.0722][index]!;
    }, 0);
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const surfaces = ['background', 'card', 'popover', 'muted', 'field'] as const;
const tones = ['primary', 'accent', 'destructive', 'info', 'success', 'warning'] as const;

function checkSupportedPairs(set: TokenSet, label: string): void {
  const assertPair = (foreground: string, background: string, minimum = 4.5, over?: string, alpha = 1): void => {
    let backdrop = rgb(background);
    if (over) backdrop = backdrop.map((value, index) => value * alpha + rgb(over)[index]! * (1 - alpha));
    expect(ratio(rgb(foreground), backdrop), label + ': ' + foreground + ' / ' + background).toBeGreaterThanOrEqual(
      minimum,
    );
  };
  for (const surface of surfaces) {
    for (const indicator of ['input', 'border-strong', 'ring'] as const) {
      assertPair(set[indicator], set[surface], 3);
    }
    for (const foreground of ['foreground', 'muted-foreground', 'subtle-foreground'] as const) {
      assertPair(set[foreground], set[surface]);
    }
    for (const tone of tones) {
      assertPair(set[`${tone}-soft-foreground`], set[surface]);
      assertPair(set[`${tone}-soft-foreground`], set[tone], 4.5, set[surface], 0.3);
      assertPair(set.foreground, set[`${tone}-soft`], 4.5, set[surface], 0.6);
    }
    assertPair(set['popover-foreground'], set.popover, 4.5, set[surface], 0.7);
    assertPair(set.foreground, set.muted, 4.5, set[surface], 0.3);
  }
  for (const tone of tones) {
    assertPair(set[`${tone}-foreground`], set[tone]);
    assertPair(set[`${tone}-soft-foreground`], set[`${tone}-soft`]);
  }
  assertPair(set['card-foreground'], set.card);
  assertPair(set['popover-foreground'], set.popover);
  assertPair(set['inverse-foreground'], set.inverse);
}

describe('supported text and translucent-surface contrast', () => {
  it('requires 4.5 for small placeholders on every supported neutral host', () => {
    for (const bg of surfaces) {
      for (const fg of ['foreground', 'muted-foreground', 'subtle-foreground'] as const) {
        expect(contrastPairs()).toContainEqual({ fg, bg, min: 4.5 });
      }
    }
    const theme = getTheme('smart-qr')!;
    const bad = { ...theme.light, 'subtle-foreground': '#9b9fb5' };
    expect(validateTheme({ light: bad, dark: theme.dark }).contrastAA).toBe(false);
  });

  it('rejects insufficient required boundaries on neutral hosts', () => {
    for (const bg of surfaces) {
      for (const fg of ['input', 'border-strong', 'ring'] as const) {
        expect(contrastPairs()).toContainEqual({ fg, bg, min: 3 });
      }
    }
    const theme = getTheme('smart-qr')!;
    for (const token of ['input', 'border-strong', 'ring'] as const) {
      const bad = { ...theme.light, [token]: theme.light.popover };
      expect(validateTheme({ light: bad, dark: theme.dark }).contrastAA).toBe(false);
    }
  });

  it('independently verifies every shipped theme, including translucent variants', () => {
    for (const theme of THEMES) {
      checkSupportedPairs(theme.light, theme.id + ' light');
      checkSupportedPairs(theme.dark, theme.id + ' dark');
      expect(theme.meta.contrastAA, theme.id).toBe(true);
    }
    expect(getTheme('smart-qr')?.status).toBe('candidate');
  });

  it('independently verifies the actual default CSS variables and keeps package source registration', () => {
    const css = readFileSync(new URL('../../../../src/index.css', import.meta.url), 'utf8');
    expect(css).toContain("@source './';");
    const dark = css.indexOf('\n.dark {');
    for (const [index, block] of [css.slice(0, dark), css.slice(dark)].entries()) {
      const tokens = Object.fromEntries(
        [...block.matchAll(/--color-([\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2]!.trim()]),
      ) as TokenSet;
      checkSupportedPairs(tokens, index === 0 ? 'default light' : 'default dark');
    }
  });

  it('preserves every background, fill and decorative border outside the explicit indicator amendment', () => {
    const palette = THEMES.map((theme) => [
      theme.id,
      ...(['light', 'dark'] as const).map((mode) =>
        Object.entries(theme[mode]).filter(
          ([key]) =>
            key !== 'foreground' &&
            !key.endsWith('-foreground') &&
            !['input', 'border-strong', 'ring', 'field'].includes(key),
        ),
      ),
    ]);
    const hash = createHash('sha256').update(JSON.stringify(palette)).digest('hex');
    // Adding a theme or an owner-approved palette changes this on purpose; re-pin it from the message, never for an
    // incidental edit to an existing theme.
    expect(hash, `palette hash ${hash}`).toBe('13edc49040ea850ed8aac3ddad7d20a7de451657fe33aaccf0dc9977106e3a73');
  });

  it('derives every field fill from an existing surface: the popover in light mode, the page in dark mode', () => {
    for (const theme of THEMES) {
      expect(theme.light.field, theme.id + ' light').toBe(theme.light.popover);
      expect(theme.dark.field, theme.id + ' dark').toBe(theme.dark.background);
    }
  });

  it('uses independently tested soft foregrounds for every colored glass recipe', () => {
    for (const kind of ['glass', 'glassOutline'] as const) {
      for (const [tone, token] of Object.entries({
        primary: 'primary',
        danger: 'destructive',
        success: 'success',
        warning: 'warning',
        info: 'info',
      })) {
        const classes = Tones[kind][tone as keyof typeof Tones.glass];
        expect(classes).toContain(`bg-${token}/30`);
        expect(classes).toContain(`text-${token}-soft-foreground`);
      }
    }
  });
});
