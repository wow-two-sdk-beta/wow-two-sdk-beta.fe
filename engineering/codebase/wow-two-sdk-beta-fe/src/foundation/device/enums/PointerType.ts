// The pointer vocabulary, kept in its own file rather than inlined into the composable so a consumer can switch
// on `PointerType.Coarse` without pulling Vue into a pure module — the same value/composable split
// `foundation/shortcuts` uses for `Modifier` vs `UseHotkeys`.

/** How precise the primary pointing device is, per the CSS `pointer` media feature. */
export const PointerType = {
  /** Low-precision primary pointer — a finger on a touchscreen, a TV remote. Size hit targets generously. */
  Coarse: 'coarse',
  /** High-precision primary pointer — a mouse, trackpad, or stylus. Hover affordances are meaningful here. */
  Fine: 'fine',
  /** No pointing device at all — keyboard- or voice-driven. Also the SSR answer, where nothing is knowable yet. */
  None: 'none',
} as const;

/** One of the {@link PointerType} values. */
export type PointerType = (typeof PointerType)[keyof typeof PointerType];
