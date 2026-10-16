/* Provides the shared four-corner anchor vocabulary (badgeOverlay / notificationDot / presenceIndicator position). */

/** Defines the corner an overlay anchors to. */
export const CornerPosition = {
  /** Refers to the top-right corner. */
  TopRight: 'top-right',
  /** Refers to the top-left corner. */
  TopLeft: 'top-left',
  /** Refers to the bottom-right corner. */
  BottomRight: 'bottom-right',
  /** Refers to the bottom-left corner. */
  BottomLeft: 'bottom-left',
} as const;

export type CornerPosition = (typeof CornerPosition)[keyof typeof CornerPosition];
