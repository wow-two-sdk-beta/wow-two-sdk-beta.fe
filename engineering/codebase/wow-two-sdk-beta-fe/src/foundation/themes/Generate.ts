/* ---------------------------------------------------------------------------
 * OKLCH theme generator.
 *
 * `generateTheme(seed)` → a fully-resolved, validated `Theme` with both light
 * and dark `TokenSet`s. Pure & deterministic — output depends only on the seed
 * (no `Math.random`). Strategy:
 *
 *   1. Neutral ramp  — low-chroma lightness steps, hue/chroma biased by
 *      `neutralTemp`; `surface` widens/narrows the steps. Drives background /
 *      card / popover / field / muted / border / input / *-foreground.
 *   2. Primary       — from `primaryHue` at a readable chroma; soft = high-L
 *      low-C tint; foregrounds auto-nudged to clear AA.
 *   3. Accent        — primary hue rotated per `accentMode`.
 *   4. Status        — success / warning / destructive / info anchored to
 *      canonical hues but chroma-harmonized to the primary.
 *
 * Every *-foreground is contrast-paired and nudged (lighter/darker in L) until
 * it clears its WCAG AA threshold, so generated themes are "proven" by default.
 * ------------------------------------------------------------------------- */

import type { AccentMode, NeutralTemp, SurfaceStyle, Theme, ThemeSeed } from './Theme';
import { ThemeStatus } from './Theme';
import { applyToneSlots, type ToneFamilyName, type ToneSlots, type TokenSet } from './Tokens';
import { contrastRatio, normalizeHue, oklchToCss, relativeLuminance, type Oklch } from './Oklch';
import { AaText, AaUi, validateTheme } from './Validate';
import { ensureForegroundContrast } from './ForegroundContrast';

// ---------------------------------------------------------------------------
// Neutral ramp configuration
// ---------------------------------------------------------------------------

/** Hue + chroma the neutral grey ramp is tinted toward, per temperature. */
const NeutralTint: Record<NeutralTemp, { hue: number; chroma: number }> = {
  cool: { hue: 250, chroma: 0.012 }, // bluish slate
  neutral: { hue: 270, chroma: 0.003 }, // near-achromatic
  warm: { hue: 70, chroma: 0.012 }, // warm stone
};

/** Canonical status hues (OKLCH degrees), tuned for sRGB. */
const StatusHue = {
  success: 150,
  warning: 80,
  destructive: 27,
  info: 230,
} as const;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const clampL = (l: number): number => Math.min(0.985, Math.max(0.06, l));

/** Pick the foreground (near-white vs near-black, tinted to `hue`) with higher contrast on `bg`. */
function bestTextOn(bg: Oklch, hue: number): Oklch {
  const white: Oklch = { l: 0.985, c: 0.004, h: hue };
  const black: Oklch = { l: 0.18, c: 0.01, h: hue };
  return contrastRatio(white, bg) >= contrastRatio(black, bg) ? white : black;
}

/**
 * Nudge a foreground's lightness toward the better-contrast end until it clears
 * `min` against `bg` (or we run out of headroom). Deterministic stepping.
 */
function nudgeForeground(fg: Oklch, bg: Oklch, min: number): Oklch {
  let cur = { ...fg };
  if (contrastRatio(cur, bg) >= min) return cur;

  // Decide direction: move toward whichever pole increases contrast.
  const goLighter = relativeLuminance(bg) < 0.4;
  const step = goLighter ? 0.03 : -0.03;

  for (let i = 0; i < 32; i++) {
    cur = { ...cur, l: clampL(cur.l + step) };
    if (contrastRatio(cur, bg) >= min) return cur;
    if (cur.l <= 0.06 || cur.l >= 0.985) break;
  }
  // Last resort: pure pole (white or black) for maximum contrast.
  return goLighter ? { l: 0.985, c: 0, h: fg.h } : { l: 0.1, c: 0, h: fg.h };
}

/**
 * Resolve a {base, foreground} pair that clears `min`. First nudge the
 * foreground; if it's already maxed at a pole and still short, slide the BASE
 * lightness away from the foreground (darker when fg is light, lighter when fg
 * is dark) — preserving hue/chroma — until the pair passes. Returns both.
 */
function resolveSolidPair(base: Oklch, fg: Oklch, min: number): { base: Oklch; foreground: Oklch } {
  let curFg = nudgeForeground(fg, base, min);
  if (contrastRatio(curFg, base) >= min) return { base, foreground: curFg };

  // Foreground couldn't get there alone → move the base.
  const fgIsLight = relativeLuminance(curFg) >= 0.5;
  const step = fgIsLight ? -0.02 : 0.02; // push base contrast up
  let curBase = { ...base };
  for (let i = 0; i < 32; i++) {
    curBase = { ...curBase, l: clampL(curBase.l + step) };
    curFg = nudgeForeground(curFg, curBase, min);
    if (contrastRatio(curFg, curBase) >= min) break;
    if (curBase.l <= 0.06 || curBase.l >= 0.985) break;
  }
  return { base: curBase, foreground: curFg };
}

// ---------------------------------------------------------------------------
// Per-mode build
// ---------------------------------------------------------------------------

interface ModeConfig {
  /** Background lightness. */
  bgL: number;

  /** Step between stacked surfaces (card/popover/muted), signed toward foreground. */
  surfStep: number;

  /** Foreground (body text) lightness. */
  fgL: number;

  /** Base lightness for saturated tone bases (primary/status). */
  toneL: number;

  /** Chroma for saturated tone bases. */
  toneC: number;

  /** Soft-surface lightness. */
  softL: number;

  /** Soft-surface chroma. */
  softC: number;

  /** Is this the dark mode build? */
  isDark: boolean;
}

/** Resolve per-mode lightness/chroma knobs from the surface style. */
function modeConfig(isDark: boolean, surface: SurfaceStyle): ModeConfig {
  const crisp = surface === 'crisp';
  if (isDark) {
    return {
      bgL: crisp ? 0.16 : 0.2,
      surfStep: crisp ? 0.05 : 0.04,
      fgL: 0.96,
      toneL: 0.7,
      toneC: 0.16,
      softL: 0.3,
      softC: 0.06,
      isDark: true,
    };
  }
  return {
    bgL: 1.0,
    surfStep: crisp ? -0.035 : -0.025,
    fgL: 0.2,
    toneL: 0.58,
    toneC: 0.17,
    softL: 0.95,
    softC: 0.05,
    isDark: false,
  };
}

/** Build one mode's full token set. */
function buildMode(
  primaryHue: number,
  accentHue: number,
  neutralTemp: NeutralTemp,
  surface: SurfaceStyle,
  isDark: boolean,
): TokenSet {
  const cfg = modeConfig(isDark, surface);
  const tint = NeutralTint[neutralTemp];
  const nh = tint.hue;
  const nc = tint.chroma;

  // ---- neutral surfaces ----
  const background: Oklch = { l: clampL(cfg.bgL), c: nc, h: nh };
  // card/popover sit one step "in front of" the background.
  const card: Oklch = { l: clampL(cfg.bgL + cfg.surfStep), c: nc, h: nh };
  const popover = card;
  // Form fields sit below raised panels: the popover fill in light mode, the page fill in dark mode, so an open
  // menu reads as a lighter surface over the fields it covers.
  const field = isDark ? background : popover;
  const muted: Oklch = { l: clampL(cfg.bgL + cfg.surfStep * 1.5), c: nc * 1.4, h: nh };

  // Borders / input outline — a couple steps further from bg, slightly more chroma.
  const border: Oklch = { l: clampL(cfg.bgL + cfg.surfStep * 2.2), c: nc * 1.6, h: nh };
  const borderStrong: Oklch = {
    l: clampL(cfg.bgL + cfg.surfStep * 3.4),
    c: nc * 1.8,
    h: nh,
  };
  const input = borderStrong;

  // Foregrounds (auto-nudged for AA).
  const foreground = nudgeForeground({ l: cfg.fgL, c: nc * 2, h: nh }, background, AaText);
  const cardFg = nudgeForeground(foreground, card, AaText);
  const popoverFg = nudgeForeground(foreground, popover, AaText);
  const mutedFg = nudgeForeground({ l: isDark ? 0.72 : 0.5, c: nc * 2.5, h: nh }, muted, AaText);
  const subtleFg = nudgeForeground({ l: isDark ? 0.55 : 0.62, c: nc * 2, h: nh }, background, AaText);

  // Inverse = flipped surface (dark chip on light theme, light chip on dark theme).
  const inverse: Oklch = isDark ? { l: 0.96, c: nc, h: nh } : { l: 0.2, c: nc * 2, h: nh };
  const inverseFg = nudgeForeground({ l: isDark ? 0.18 : 0.97, c: nc, h: nh }, inverse, AaText);

  // ---- tone family builder ----
  const buildTone = (hue: number, chromaScale = 1): ToneSlots => {
    const baseSeed: Oklch = { l: cfg.toneL, c: cfg.toneC * chromaScale, h: hue };
    const foregroundC = bestTextOn(baseSeed, hue);
    // Co-resolve base + foreground so the solid pair always clears AA text.
    const { base, foreground: fg } = resolveSolidPair(baseSeed, foregroundC, AaText);
    const soft: Oklch = { l: cfg.softL, c: cfg.softC * chromaScale, h: hue };
    // Soft-foreground: a deep (light mode) / bright (dark mode) tint of the same hue.
    const softFgSeed: Oklch = isDark
      ? { l: 0.85, c: cfg.softC * 1.4 * chromaScale, h: hue }
      : { l: 0.42, c: cfg.toneC * 0.9 * chromaScale, h: hue };
    const softFg = nudgeForeground(softFgSeed, soft, AaText);
    return {
      base: oklchToCss(base),
      foreground: oklchToCss(fg),
      soft: oklchToCss(soft),
      softForeground: oklchToCss(softFg),
    };
  };

  // Ring = primary at a vivid, mid lightness; checked as UI affordance vs bg.
  const ring = nudgeForeground({ l: isDark ? 0.7 : 0.55, c: 0.16, h: primaryHue }, background, AaUi);

  const set: Partial<TokenSet> = {
    background: oklchToCss(background),
    foreground: oklchToCss(foreground),
    card: oklchToCss(card),
    'card-foreground': oklchToCss(cardFg),
    popover: oklchToCss(popover),
    'popover-foreground': oklchToCss(popoverFg),
    field: oklchToCss(field),
    muted: oklchToCss(muted),
    'muted-foreground': oklchToCss(mutedFg),
    'subtle-foreground': oklchToCss(subtleFg),
    inverse: oklchToCss(inverse),
    'inverse-foreground': oklchToCss(inverseFg),
    border: oklchToCss(border),
    'border-strong': oklchToCss(borderStrong),
    input: oklchToCss(input),
    ring: oklchToCss(ring),
  };

  const tones: Record<ToneFamilyName, number> = {
    primary: primaryHue,
    accent: accentHue,
    destructive: StatusHue.destructive,
    info: StatusHue.info,
    success: StatusHue.success,
    warning: StatusHue.warning,
  };

  for (const [family, hue] of Object.entries(tones) as [ToneFamilyName, number][]) {
    // Warning runs a touch lower-chroma so the yellow doesn't blow out.
    const chromaScale = family === 'warning' ? 0.92 : 1;
    applyToneSlots(set, family, buildTone(hue, chromaScale));
  }

  return ensureForegroundContrast(set as TokenSet);
}

// ---------------------------------------------------------------------------
// Accent derivation
// ---------------------------------------------------------------------------

function accentHueFrom(primaryHue: number, mode: AccentMode): number {
  switch (mode) {
    case 'complementary':
      return normalizeHue(primaryHue + 180);
    case 'analogous':
      return normalizeHue(primaryHue + 40);
    case 'triadic':
      return normalizeHue(primaryHue + 120);
    case 'mono':
      return primaryHue;
  }
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

function defaultDescription(seed: ThemeSeed): string {
  const temp = seed.neutralTemp ?? 'neutral';
  const surf = seed.surface ?? 'crisp';
  return `Generated theme · hue ${Math.round(seed.primaryHue)}° · ${temp} neutrals · ${surf} surfaces.`;
}

/**
 * Expand a {@link ThemeSeed} into a validated {@link Theme}.
 * Deterministic: same seed in → identical theme out.
 */
export function generateTheme(seed: ThemeSeed): Theme {
  const primaryHue = normalizeHue(seed.primaryHue);
  const neutralTemp = seed.neutralTemp ?? 'neutral';
  const accentMode = seed.accentMode ?? 'complementary';
  const surface = seed.surface ?? 'crisp';
  const accentHue = accentHueFrom(primaryHue, accentMode);

  const light = buildMode(primaryHue, accentHue, neutralTemp, surface, false);
  const dark = buildMode(primaryHue, accentHue, neutralTemp, surface, true);

  const meta = validateTheme({ light, dark });

  const autoTags = [neutralTemp, accentMode, surface, meta.contrastAA ? 'aa' : 'aa-fail'];

  return {
    id: seed.id,
    name: seed.name,
    description: seed.description ?? defaultDescription(seed),
    tags: Array.from(new Set([...(seed.tags ?? []), ...autoTags])),
    light,
    dark,
    radius: seed.radius,
    // Generated/curated themes default to `candidate` — engine-proven, not yet
    // validated against a real app surface.
    status: ThemeStatus.Candidate,
    meta,
  };
}
