import type { CSSProperties } from 'vue';
import { Padding } from '../enums/StyleTokens';

/** CSS-value extensions — types, token maps, resolvers. Call as `CssExtensions.x(...)`. */

// =============================================================================
// Tokens (enums + types — individually exported)
// =============================================================================

/* Padding token vocabulary — reuses the shared `Padding` enum (superset: adds `2xl`). */
export type PaddingToken = Padding;

/**
 * Defines the corner-radius token vocabulary local to CSS resolvers — diverges from the shared `Radius`
 * (carries `xs`, omits `2xl`).
 */
export const RadiusToken = {
  /** Refers to no rounding (square corners). */
  None: 'none',
  /** Refers to an extra-small radius. */
  Xs: 'xs',
  /** Refers to a small radius. */
  Sm: 'sm',
  /** Refers to a medium radius. */
  Md: 'md',
  /** Refers to a large radius. */
  Lg: 'lg',
  /** Refers to an extra-large radius. */
  Xl: 'xl',
  /** Refers to a fully-rounded (pill) radius. */
  Full: 'full',
} as const;

export type RadiusToken = (typeof RadiusToken)[keyof typeof RadiusToken];

export type SizeValue = string | number;
export type PaddingProp = PaddingToken | { x?: SizeValue; y?: SizeValue };
export type RadiusProp = RadiusToken | SizeValue;
export interface BoxSizeOverrides {
  width?: SizeValue;
  height?: SizeValue;
  minWidth?: SizeValue;
  minHeight?: SizeValue;
  maxWidth?: SizeValue;
  maxHeight?: SizeValue;
  /**
   * Shorthand for square boxes — applied as fallback for both `width` and `height`. Explicit `width`/`height`
   * win when both are set.
   */
  boxSize?: SizeValue;

  /** CSS `aspect-ratio`. String like `'16/9'` or number like `1.5`. Pairs naturally with a single width/height. */
  aspectRatio?: string | number;
}

/**
 * Defines the canonical size preset vocabulary — shared across components. Each component picks the subset it
 * supports via `Extract<SizePreset, ...>` and owns its internal dimension mapping.
 */
export const SizePreset = {
  /** Refers to the extra-small step. */
  Xs: 'xs',
  /** Refers to the small step. */
  Sm: 'sm',
  /** Refers to the medium (default) step. */
  Md: 'md',
  /** Refers to the large step. */
  Lg: 'lg',
  /** Refers to the extra-large step. */
  Xl: 'xl',
  /** Refers to the 2x extra-large step. */
  Xxl: '2xl',
} as const;

export type SizePreset = (typeof SizePreset)[keyof typeof SizePreset];

/** Defines the absolute-positioning preset — a 9-anchor value-set; pair with raw inset overrides. */
export const AbsolutePositionPreset = {
  /** Refers to the top-right corner. */
  TopRight: 'top-right',
  /** Refers to the top-left corner. */
  TopLeft: 'top-left',
  /** Refers to the bottom-right corner. */
  BottomRight: 'bottom-right',
  /** Refers to the bottom-left corner. */
  BottomLeft: 'bottom-left',
  /** Refers to the top edge, horizontally centered. */
  Top: 'top',
  /** Refers to the bottom edge, horizontally centered. */
  Bottom: 'bottom',
  /** Refers to the left edge, vertically centered. */
  Left: 'left',
  /** Refers to the right edge, vertically centered. */
  Right: 'right',
  /** Refers to the dead center. */
  Center: 'center',
} as const;

export type AbsolutePositionPreset = (typeof AbsolutePositionPreset)[keyof typeof AbsolutePositionPreset];

export interface AbsoluteInsetOverrides {
  top?: SizeValue;
  right?: SizeValue;
  bottom?: SizeValue;
  left?: SizeValue;
}

export type AbsolutePosition = AbsolutePositionPreset | AbsoluteInsetOverrides;

// =============================================================================
// Token → CSS maps
// =============================================================================

const PaddingTokenToCss: Record<Exclude<PaddingToken, 'none' | '2xl'>, string> = {
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
};

const RadiusTokenToCss: Record<Exclude<RadiusToken, 'none' | 'full'>, string> = {
  xs: '0.125rem',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
};

// =============================================================================
// Internal resolvers
// =============================================================================

function toCss(v: SizeValue): string {
  return typeof v === 'number' ? `${v}px` : v;
}

function resolvePadding(padding: PaddingProp | undefined): CSSProperties | undefined {
  if (!padding) return undefined;
  if (typeof padding === 'string') {
    if (padding === 'none') {
      return { paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0 };
    }
    // `2xl` is carried by the shared `Padding` enum but sits outside the inline rem map.
    const v = padding === '2xl' ? '3rem' : PaddingTokenToCss[padding];
    return { paddingLeft: v, paddingRight: v, paddingTop: v, paddingBottom: v };
  }
  const style: CSSProperties = {};
  if (padding.x !== undefined) {
    const v = toCss(padding.x);
    style.paddingLeft = v;
    style.paddingRight = v;
  }
  if (padding.y !== undefined) {
    const v = toCss(padding.y);
    style.paddingTop = v;
    style.paddingBottom = v;
  }
  return style;
}

function resolveRadius(radius: RadiusProp | undefined): CSSProperties | undefined {
  if (radius === undefined || radius === null) return undefined;
  if (typeof radius === 'number') return { borderRadius: `${radius}px` };
  if (radius === 'none') return { borderRadius: 0 };
  if (radius === 'full') return { borderRadius: '9999px' };
  if (Object.hasOwn(RadiusTokenToCss, radius)) {
    return {
      borderRadius: RadiusTokenToCss[radius as Exclude<RadiusToken, 'none' | 'full'>],
    };
  }
  return { borderRadius: radius };
}

function resolveBoxSize(overrides: BoxSizeOverrides): CSSProperties | undefined {
  const style: CSSProperties = {};
  let hasAny = false;
  // boxSize is the fallback for width AND height — explicit dims win.
  const effectiveWidth = overrides.width ?? overrides.boxSize;
  const effectiveHeight = overrides.height ?? overrides.boxSize;
  if (effectiveWidth !== undefined) {
    style.width = toCss(effectiveWidth);
    hasAny = true;
  }
  if (effectiveHeight !== undefined) {
    style.height = toCss(effectiveHeight);
    hasAny = true;
  }
  if (overrides.minWidth !== undefined) {
    style.minWidth = toCss(overrides.minWidth);
    hasAny = true;
  }
  if (overrides.minHeight !== undefined) {
    style.minHeight = toCss(overrides.minHeight);
    hasAny = true;
  }
  if (overrides.maxWidth !== undefined) {
    style.maxWidth = toCss(overrides.maxWidth);
    hasAny = true;
  }
  if (overrides.maxHeight !== undefined) {
    style.maxHeight = toCss(overrides.maxHeight);
    hasAny = true;
  }
  if (overrides.aspectRatio !== undefined) {
    style.aspectRatio = String(overrides.aspectRatio);
    hasAny = true;
  }
  return hasAny ? style : undefined;
}

/** Defines a size prop — a named preset, a raw value (applied as `boxSize`), or an explicit dim object. */
export type SizeUnion<P extends string> =
  | P
  | (string & {}) // keeps preset literals in autocomplete while accepting any CSS unit string
  | number
  | BoxSizeOverrides;

/**
 * Parse a union-style size prop into (a) a preset name (if matched), or (b) a `BoxSizeOverrides` payload.
 *
 * Resolution order:
 * - `undefined`         → `{}`
 * - object              → `{ box: input }`
 * - preset string       → `{ preset: input }`
 * - any other string    → `{ box: { boxSize: input } }`
 * - number              → `{ box: { boxSize: input } }`
 */
function parseSizeUnion<P extends string>(
  input: SizeUnion<P> | undefined,
  presets: ReadonlySet<string>,
): { preset?: P; box?: BoxSizeOverrides } {
  if (input === undefined) return {};
  if (typeof input === 'object' && input !== null) return { box: input };
  if (typeof input === 'string' && presets.has(input)) return { preset: input as P };
  if (typeof input === 'number' || typeof input === 'string') {
    return { box: { boxSize: input } };
  }
  return {};
}

// =============================================================================
// Grouped namespace export
// =============================================================================

export const CssExtensions = {
  toCss,
  resolvePadding,
  resolveRadius,
  resolveBoxSize,
  parseSizeUnion,
  PaddingTokenToCss,
  RadiusTokenToCss,
} as const;
