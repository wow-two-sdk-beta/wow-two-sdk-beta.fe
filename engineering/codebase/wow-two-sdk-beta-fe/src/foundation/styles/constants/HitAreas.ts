/* Provides the coarse-pointer hit area — how a finger's reach grows without moving what a target shows. */

/**
 * Contains the classes of the invisible hit area a coarse pointer (a finger) takes on a target: a pseudo-element
 * centred on the target, as large as its box and never smaller than 44 x 44px. The reach grows while the box, its
 * mark, icon and text stay where a mouse sees them; a fine pointer gets no pseudo-element at all.
 *
 * The target must be positioned (`relative`, or `absolute` already) and must not clip its own overflow, or the hit
 * area is cut to the box. Neighbours closer than 44px share the overlap, the later one taking the tap there.
 */
export const CoarseHitArea = {
  /** Draws the hit area with `::after`. */
  After:
    'pointer-coarse:after:absolute pointer-coarse:after:top-1/2 pointer-coarse:after:left-1/2 ' +
    'pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 ' +
    'pointer-coarse:after:-translate-1/2',
  /** Draws the hit area with `::before`, for a target whose `::after` already draws something. */
  Before:
    'pointer-coarse:before:absolute pointer-coarse:before:top-1/2 pointer-coarse:before:left-1/2 ' +
    'pointer-coarse:before:size-full pointer-coarse:before:min-h-11 pointer-coarse:before:min-w-11 ' +
    'pointer-coarse:before:-translate-1/2',
} as const;
