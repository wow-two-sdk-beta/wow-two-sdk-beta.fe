/* Provides the coarse-pointer hit area — how a finger's reach grows without moving what a target shows. */

/**
 * Contains the classes of the invisible hit area a coarse pointer (a finger) takes on a target: a pseudo-element
 * centred on the target, as large as its box and never smaller than 44 x 44px. The reach grows while the box, its
 * mark, icon and text stay where a mouse sees them; a fine pointer gets no pseudo-element at all.
 *
 * The target must be positioned (`relative`, or `absolute` already) and must not clip its own overflow, or the hit
 * area is cut to the box. A container whose targets sit closer than 44px sets `--coarse-hit-gap` to its gap plus
 * its targets' two borders (the percentages read a target's padding box, so a 1px border adds 2px): each
 * side then grows by `min((44 - box) / 2, gap / 2)`, so neighbours never share a tap. `--coarse-hit-gap-x` or
 * `--coarse-hit-gap-y` caps one axis only (a row of tabs caps the width, a column of rows the height) and wins over
 * `--coarse-hit-gap` on its axis. Unset, the floor is 44px.
 * The floor is written out in full in each class, since Tailwind reads class names from the source text.
 */
export const CoarseHitArea = {
  /** Draws the hit area with `::after`. */
  After:
    'pointer-coarse:after:absolute pointer-coarse:after:top-1/2 pointer-coarse:after:left-1/2 ' +
    'pointer-coarse:after:size-full ' +
    'pointer-coarse:after:min-h-[min(44px,calc(100%_+_var(--coarse-hit-gap-y,var(--coarse-hit-gap,44px))))] ' +
    'pointer-coarse:after:min-w-[min(44px,calc(100%_+_var(--coarse-hit-gap-x,var(--coarse-hit-gap,44px))))] ' +
    'pointer-coarse:after:-translate-1/2',
  /** Draws the hit area with `::before`, for a target whose `::after` already draws something. */
  Before:
    'pointer-coarse:before:absolute pointer-coarse:before:top-1/2 pointer-coarse:before:left-1/2 ' +
    'pointer-coarse:before:size-full ' +
    'pointer-coarse:before:min-h-[min(44px,calc(100%_+_var(--coarse-hit-gap-y,var(--coarse-hit-gap,44px))))] ' +
    'pointer-coarse:before:min-w-[min(44px,calc(100%_+_var(--coarse-hit-gap-x,var(--coarse-hit-gap,44px))))] ' +
    'pointer-coarse:before:-translate-1/2',
  /**
   * Draws a horizontal-only hit area with `::after`, for a row in a list with no gap between rows (a sidebar rail):
   * the row keeps its height, which a vertical hit area would only take from its neighbours, and reaches 44px wide.
   */
  AfterX:
    'pointer-coarse:after:absolute pointer-coarse:after:inset-y-0 pointer-coarse:after:left-1/2 ' +
    'pointer-coarse:after:w-full pointer-coarse:after:min-w-11 pointer-coarse:after:-translate-x-1/2',
} as const;
