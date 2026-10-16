/* ---------------------------------------------------------------------------
 * Theme validator — WCAG AA contrast checks across every text/surface pair.
 *
 * "Proven" = every paired (-foreground vs its surface/base) clears AA in BOTH
 * light and dark modes. Text pairs need ≥ 4.5:1; input boundaries and focus
 * indicators need ≥ 3:1 against each declared neutral host surface.
 * ------------------------------------------------------------------------- */

import type { Theme, ThemeMeta } from './Theme';
import { ToneFamilies, type SemanticToken, type TokenSet } from './Tokens';
import { contrastRatioCss, contrastRatioCompositeCss } from './Oklch';
import { ColorMode } from '../primitives/colorModeProvider';

/** WCAG AA thresholds. Text = normal-size body text; UI = non-text affordances. */
export const AaText = 4.5;
export const AaUi = 3.0;

/** One foreground↔background pair to verify, with its required ratio. */
export interface ContrastPair {
  /** Foreground token (text/icon/affordance color). */
  fg: SemanticToken;

  /** Background token the fg sits on. */
  bg: SemanticToken;

  /** Required minimum ratio (AaText or AaUi). */
  min: number;
  /** A translucent fill is evaluated over the declared opaque host surface. */
  opacity?: number;
  over?: SemanticToken;
}

/**
 * The canonical set of pairs every theme must satisfy.
 * Surface text pairs, tone solid/soft foreground pairs and required neutral indicators.
 */
export function contrastPairs(): ReadonlyArray<ContrastPair> {
  const pairs: Array<ContrastPair> = [
    { fg: 'foreground', bg: 'background', min: AaText },
    { fg: 'card-foreground', bg: 'card', min: AaText },
    { fg: 'popover-foreground', bg: 'popover', min: AaText },
    { fg: 'inverse-foreground', bg: 'inverse', min: AaText },
  ];

  // Small placeholders and secondary text are text under WCAG 1.4.3, including read-only inputs.
  // These neutral surfaces host InputStyles (on `field`), CodeEditor, command inputs and ordinary body text.
  for (const bg of ['background', 'card', 'popover', 'muted', 'field'] as const) {
    // Required control boundaries and focus indicators (not decorative border tokens).
    for (const fg of ['input', 'border-strong', 'ring'] as const) pairs.push({ fg, bg, min: AaUi });
    for (const fg of ['foreground', 'muted-foreground', 'subtle-foreground'] as const) {
      if (!pairs.some((pair) => pair.fg === fg && pair.bg === bg && pair.opacity === undefined))
        pairs.push({ fg, bg, min: AaText });
    }
    pairs.push({ fg: 'popover-foreground', bg: 'popover', opacity: 0.7, over: bg, min: AaText });
    pairs.push({ fg: 'foreground', bg: 'muted', opacity: 0.3, over: bg, min: AaText });
  }

  for (const f of ToneFamilies) {
    // Solid: foreground text on the saturated base.
    pairs.push({ fg: `${f}-foreground`, bg: f, min: AaText });
    // Soft: foreground text on the tinted soft surface.
    pairs.push({ fg: `${f}-soft-foreground`, bg: `${f}-soft`, min: AaText });
    // Outline and ghost variants place the same toned text on their hosting neutral surface.
    for (const bg of ['background', 'card', 'popover', 'muted'] as const) {
      pairs.push({ fg: `${f}-soft-foreground`, bg, min: AaText });
      pairs.push({ fg: `${f}-soft-foreground`, bg: f, opacity: 0.3, over: bg, min: AaText });
      pairs.push({ fg: 'foreground', bg: `${f}-soft`, opacity: 0.6, over: bg, min: AaText });
    }
  }

  return pairs;
}

/** Evaluates a declared opaque or translucent token pair without rounding its ratio. */
export function contrastPairRatio(set: TokenSet, pair: ContrastPair, foreground = set[pair.fg]): number {
  return pair.opacity !== undefined && pair.over !== undefined
    ? contrastRatioCompositeCss(foreground, set[pair.bg], set[pair.over], pair.opacity)
    : contrastRatioCss(foreground, set[pair.bg]);
}

/** Check one token set (one mode) against the pair list. Returns failure strings. */
function checkMode(set: TokenSet, mode: ColorMode): ReadonlyArray<string> {
  const failures: Array<string> = [];
  for (const pair of contrastPairs()) {
    const { fg, bg, min, opacity, over } = pair;
    const ratio = contrastPairRatio(set, pair);
    if (!Number.isFinite(ratio) || ratio < min) {
      const surface = opacity === undefined ? bg : `${bg}/${opacity} over ${over}`;
      failures.push(`${mode}: ${fg} on ${surface} = ${ratio.toFixed(2)} (need ${min.toFixed(1)})`);
    }
  }
  return failures;
}

/**
 * Validate a theme's light AND dark token sets.
 * `contrastAA` is true only when both modes pass every pair.
 */
export function validateTheme(theme: Pick<Theme, 'light' | 'dark'>): ThemeMeta {
  const failures = [...checkMode(theme.light, ColorMode.Light), ...checkMode(theme.dark, ColorMode.Dark)];
  return failures.length === 0 ? { contrastAA: true } : { contrastAA: false, failures };
}
