import { slidingWindowOf } from '../../../foundation/collections';

/** One dot of a windowed indicator. */
export interface DotsIndicatorDot {
  /** The item this dot stands for, zero-based. */
  readonly position: number;

  /** Whether it is the current item's dot. */
  readonly isActive: boolean;

  /** `start` or `end` when it is the window's edge dot and more items lie beyond it, so it is drawn smaller. */
  readonly edge?: 'start' | 'end';
}

/**
 * Chooses which dots an indicator shows when there are more items than dots. The window itself is the foundation's
 * `slidingWindowOf`, which keeps the current item on the centre dot while it can and stops at either end of the
 * series; this adds only what a dot row needs on top: the window's edge dot is marked when more items lie beyond it,
 * so it can be drawn smaller.
 */
export function dotsIndicatorWindowOf(count: number, index: number, visibleCount: number): readonly DotsIndicatorDot[] {
  const window = slidingWindowOf(count, index, visibleCount);
  return Array.from({ length: window.size }, (_unused, offset): DotsIndicatorDot => {
    const position = window.start + offset;
    const isActive = offset === window.offset;
    if (!isActive && offset === 0 && window.hasBefore) return { position, isActive, edge: 'start' };
    if (!isActive && offset === window.size - 1 && window.hasAfter) return { position, isActive, edge: 'end' };
    return { position, isActive };
  });
}
