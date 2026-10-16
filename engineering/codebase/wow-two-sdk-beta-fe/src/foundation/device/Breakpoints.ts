// The breakpoint model — pure, DOM-free, and deliberately WITHOUT a built-in scale.
//
// WHY NO DEFAULT SCALE: this library is Tailwind-v4 token-driven, so the app owns its breakpoints in its `@theme`
// block. A scale hardcoded here would be a second source of truth that silently disagrees with the CSS the same
// app ships — a layout that switches at 768px in JS and 720px in CSS is a bug no test in this repo could see.
// `TailwindBreakpoints` is offered as a constant the caller may opt into, never a fallback a composable reaches for.
//
// Queries are plain `(min-width: …)` sorted WIDEST FIRST, so "the first query that matches" is the active
// breakpoint. Mutually-exclusive bands (`min` and `max` together) are the alternative and were rejected: bands
// need a sentinel max for the widest entry and a sub-pixel gap between neighbours (`max-width: 767.98px`), and
// both are places for an off-by-one to hide. Independent min-width queries have neither, and match how the
// mobile-first CSS beside them already cascades.

/** A breakpoint scale — each key (`sm`, `md`, …) mapped to its minimum viewport width in CSS pixels. */
export type BreakpointScale = Readonly<Record<string, number>>;

/**
 * Tailwind v4's default breakpoint scale, in CSS pixels. Opt-in: pass it to `useBreakpoint` explicitly. An app
 * that customised its `@theme` breakpoints must pass its own map instead, or JS and CSS will disagree.
 */
export const TailwindBreakpoints = {
  /** ≥ 640px. */
  sm: 640,
  /** ≥ 768px. */
  md: 768,
  /** ≥ 1024px. */
  lg: 1024,
  /** ≥ 1280px. */
  xl: 1280,
  /** ≥ 1536px. */
  '2xl': 1536,
} as const;

/** One breakpoint compiled to the media query that detects it. */
export interface BreakpointQuery<TKey extends string = string> {
  /** The scale key this query stands for. */
  readonly key: TKey;
  /** The minimum viewport width, in CSS pixels. */
  readonly minWidth: number;
  /** The `(min-width: …px)` string to hand to `matchMedia`. */
  readonly query: string;
}

/**
 * Compiles a scale into widest-first `(min-width: …)` queries.
 *
 * Entries whose width is not a finite number `>= 0` are dropped: a malformed scale must not emit
 * `(min-width: NaNpx)`, which `matchMedia` accepts and then never matches, quietly skewing the resolved
 * breakpoint instead of failing.
 *
 * @param scale The caller's breakpoint map.
 * @returns The scale's valid entries as queries, widest first.
 */
export function toBreakpointQueries<TScale extends BreakpointScale>(
  scale: TScale,
): ReadonlyArray<BreakpointQuery<Extract<keyof TScale, string>>> {
  return Object.entries(scale)
    .filter(([, minWidth]) => Number.isFinite(minWidth) && minWidth >= 0)
    .sort(([, left], [, right]) => right - left)
    .map(([key, minWidth]) => ({
      // `Object.entries` widens the key to `string`; by construction it is a key of `scale`.
      key: key as Extract<keyof TScale, string>,
      minWidth,
      query: `(min-width: ${minWidth}px)`,
    }));
}

/**
 * Picks the active breakpoint from a widest-first query list and the match results for it.
 *
 * @param queries Compiled queries, widest first, as returned by {@link toBreakpointQueries}.
 * @param matches Match results positionally aligned with `queries`. A shorter array reads as "did not match" for
 * the missing tail.
 * @returns The key of the widest matching breakpoint, or `null` when the viewport is narrower than every entry —
 * the implicit mobile-first base band, which by definition has no key of its own.
 */
export function resolveBreakpoint<TKey extends string>(
  queries: ReadonlyArray<BreakpointQuery<TKey>>,
  matches: ReadonlyArray<boolean>,
): TKey | null {
  for (const [index, entry] of queries.entries()) {
    if (matches[index] === true) return entry.key;
  }
  return null;
}
