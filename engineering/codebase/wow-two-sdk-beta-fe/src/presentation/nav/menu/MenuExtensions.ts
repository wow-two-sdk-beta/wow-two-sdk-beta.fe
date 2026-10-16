// Folder-internal helpers for `nav/menu`. Not exported from the barrel — the "internal" signal is
// absence from `index.ts`, not the file name.

/** Extends menu rows with the pointer, focus and direction reads every row kind shares. */
export const MenuExtensions = {
  /** @internal The pointer type that moves the row highlight; touch and pen only activate. */
  MousePointerType: 'mouse',

  /** Whether a pointer event came from a mouse, the one pointer whose movement moves the highlight. */
  isMousePointer(event: PointerEvent): boolean {
    return event.pointerType === MenuExtensions.MousePointerType;
  },

  /** Focuses a row unless it already holds focus, without scrolling the page. */
  focusRow(row: HTMLElement | null): void {
    if (!row || row.ownerDocument.activeElement === row) return;

    row.focus({ preventScroll: true });
  },

  /** Whether a node lays out right to left, read from its computed `direction`. */
  isRightToLeft(node: HTMLElement | null): boolean {
    return node?.ownerDocument.defaultView?.getComputedStyle(node).direction === 'rtl';
  },
} as const;
