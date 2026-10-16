/* ---------------------------------------------------------------------------
 * Theme + Seed shapes.
 *
 * A `Theme` is a fully-resolved, validated pair of light/dark token sets plus
 * metadata. A `ThemeSeed` is the small, human-authorable recipe the OKLCH
 * generator expands into a `Theme` (see `generateTheme`).
 * ------------------------------------------------------------------------- */

import type { TokenSet } from './Tokens';

/** Defines the border-radius scale knob a theme carries (maps to the lib's `--radius-*`). */
export const ThemeRadius = {
  /** Refers to a small global radius. */
  Sm: 'sm',
  /** Refers to a medium global radius. */
  Md: 'md',
  /** Refers to a large global radius. */
  Lg: 'lg',
} as const;

export type ThemeRadius = (typeof ThemeRadius)[keyof typeof ThemeRadius];

/**
 * Defines a theme's lifecycle status.
 *
 * - `validated` — hand-authored from real, visually-verified app tokens; the
 *   colors are locked (never auto-nudged), proven in a shipping product.
 * - `candidate` — generated/curated and AA-proven by the engine, but not yet
 *   validated against a real app surface.
 */
export const ThemeStatus = {
  /** Refers to a theme proven against a real app surface. */
  Validated: 'validated',
  /** Refers to an AA-proven theme not yet app-validated. */
  Candidate: 'candidate',
} as const;

/** A theme's lifecycle status value (`"validated"` | `"candidate"`). */
export type ThemeStatus = (typeof ThemeStatus)[keyof typeof ThemeStatus];

/** Contrast / "is this theme proven" metadata, produced by the validator. */
export interface ThemeMeta {
  /** True iff every foreground↔surface pair clears its WCAG AA threshold in BOTH modes. */
  contrastAA: boolean;

  /**
   * Human-readable pair failures (empty when `contrastAA` is true).
   * Each entry: `"<mode>: <fg> on <bg> = <ratio> (need <threshold>)"`.
   */
  failures?: ReadonlyArray<string>;
}

/**
 * The coloured light behind a glass theme's translucent surfaces, per mode, as CSS background layers.
 * Emitted as `--theme-ambient`; an app paints it with the `surface-ambient` class.
 */
export interface ThemeAmbient {
  /** Light-mode backdrop layers. */
  light: string;

  /** Dark-mode backdrop layers. */
  dark: string;
}

/** A named, validated theme — the unit the registry stores and the emitter renders. */
export interface Theme {
  /** Stable kebab-case id; drives the `.theme-{id}` class. */
  id: string;

  /** Display name. */
  name: string;

  /** One-line description. */
  description: string;

  /** Free-form tags for filtering/search (e.g. `["dark","cool","brand"]`). */
  tags: ReadonlyArray<string>;

  /** Light-mode token values. */
  light: TokenSet;

  /** Dark-mode token values. */
  dark: TokenSet;

  /** Border-radius scale knob (maps to the lib's `--radius-*`). Optional. */
  radius?: ThemeRadius;

  /** Page backdrop for glass themes (maps to `--theme-ambient`). Optional. */
  ambient?: ThemeAmbient;

  /** Lifecycle status — `validated` (real-app proven, locked) or `candidate` (engine-proven). */
  status: ThemeStatus;

  /** Validation result — `meta.contrastAA === true` ⇒ the theme is "proven". */
  meta: ThemeMeta;
}

/** Defines the neutral surface temperature — biases the grey ramp warm/cool/neutral. */
export const NeutralTemp = {
  /** Refers to a cool-biased grey ramp. */
  Cool: 'cool',
  /** Refers to a pure-neutral grey ramp. */
  Neutral: 'neutral',
  /** Refers to a warm-biased grey ramp. */
  Warm: 'warm',
} as const;

export type NeutralTemp = (typeof NeutralTemp)[keyof typeof NeutralTemp];

/** Defines how the accent hue is derived from the primary hue. */
export const AccentMode = {
  /** Refers to a complementary (opposite) accent hue. */
  Complementary: 'complementary',
  /** Refers to an analogous (adjacent) accent hue. */
  Analogous: 'analogous',
  /** Refers to a triadic accent hue. */
  Triadic: 'triadic',
  /** Refers to a mono (same-hue) accent. */
  Mono: 'mono',
} as const;

export type AccentMode = (typeof AccentMode)[keyof typeof AccentMode];

/** Defines the surface character — `soft` = gentle low-contrast surfaces, `crisp` = punchier separation. */
export const SurfaceStyle = {
  /** Refers to gentle, low-contrast surfaces. */
  Soft: 'soft',
  /** Refers to punchier surface separation. */
  Crisp: 'crisp',
} as const;

export type SurfaceStyle = (typeof SurfaceStyle)[keyof typeof SurfaceStyle];

/**
 * The recipe a theme is generated from. Pure inputs → deterministic `Theme`
 * (no randomness; identical seeds always yield identical themes).
 */
export interface ThemeSeed {
  /** Stable kebab-case id for the produced theme. */
  id: string;

  /** Display name. */
  name: string;

  /** One-line description (optional — a sensible default is derived from the seed). */
  description?: string;

  /** Tags to attach (generator also auto-tags temp/mode/scheme). */
  tags?: ReadonlyArray<string>;

  /** Primary brand hue in degrees, 0–360. */
  primaryHue: number;

  /** Neutral ramp temperature. Default `neutral`. */
  neutralTemp?: NeutralTemp;

  /** Accent derivation. Default `complementary`. */
  accentMode?: AccentMode;

  /** Surface character. Default `crisp`. */
  surface?: SurfaceStyle;

  /** Radius knob to carry through. Optional. */
  radius?: ThemeRadius;
}
