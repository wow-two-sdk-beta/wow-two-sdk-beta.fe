/** One dot of a windowed indicator. */
export interface DotsIndicatorDot {
  /** The item this dot stands for, zero-based. */
  readonly position: number;

  /** Whether it is the current item's dot. */
  readonly isActive: boolean;

  /** `start` or `end` when it is the window's edge dot and more items lie beyond it, so it is drawn smaller. */
  readonly edge?: 'start' | 'end';
}

/** Reads a whole number, or the fallback when the value is not finite. */
function wholeOf(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

/**
 * Chooses which dots an indicator shows when there are more items than dots. The window follows the current item and
 * keeps it on the centre dot while it can; at either end the window stops and the current dot moves toward that
 * edge. An even window centres one dot early. A window larger than the item count shows every item, and the edge dot
 * of a window with more items beyond it is marked so it can be drawn smaller.
 *
 * With 10 items and the third current, 3 dots show items 2 to 4 with the current one in the middle, and 5 dots show
 * items 1 to 5 with the current one in the middle; with the first current, the current dot is the first of the window.
 */
export function dotsIndicatorWindowOf(count: number, index: number, visibleCount: number): readonly DotsIndicatorDot[] {
  const total = Math.max(0, wholeOf(count, 0));
  if (total === 0) return [];
  const shown = Math.min(total, Math.max(1, wholeOf(visibleCount, 1)));
  const active = Math.min(total - 1, Math.max(0, wholeOf(index, 0)));
  const start = Math.min(total - shown, Math.max(0, active - Math.floor((shown - 1) / 2)));
  return Array.from({ length: shown }, (_unused, offset): DotsIndicatorDot => {
    const position = start + offset;
    const isActive = position === active;
    if (!isActive && offset === 0 && start > 0) return { position, isActive, edge: 'start' };
    if (!isActive && offset === shown - 1 && start + shown < total) return { position, isActive, edge: 'end' };
    return { position, isActive };
  });
}
