/* Shared overlay-anchor vocabulary — the four corners plus top/bottom center
 * (toastHost / undoBar; Fab / BackToTop / SpeedDial). */

/** Defines the anchor position of a floating overlay — the four corners plus top/bottom center. */
export const OverlayPosition = {
  /** Refers to the top-right corner. */
  TopRight: 'top-right',
  /** Refers to the top-left corner. */
  TopLeft: 'top-left',
  /** Refers to the bottom-right corner. */
  BottomRight: 'bottom-right',
  /** Refers to the bottom-left corner. */
  BottomLeft: 'bottom-left',
  /** Refers to the top edge, horizontally centered. */
  TopCenter: 'top-center',
  /** Refers to the bottom edge, horizontally centered. */
  BottomCenter: 'bottom-center',
} as const;

export type OverlayPosition = (typeof OverlayPosition)[keyof typeof OverlayPosition];
