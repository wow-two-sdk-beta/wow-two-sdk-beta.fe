/** Defines a keyboard key value from `KeyboardEvent.key`. */
export const Key = {
  /** Refers to the space bar. */
  Space: ' ',
  /** Refers to the Enter / Return key. */
  Enter: 'Enter',
  /** Refers to the Escape key. */
  Escape: 'Escape',
  /** Refers to the Tab key. */
  Tab: 'Tab',
  /** Refers to the Backspace key. */
  Backspace: 'Backspace',
  /** Refers to the Delete key. */
  Delete: 'Delete',
  /** Refers to the Home key. */
  Home: 'Home',
  /** Refers to the End key. */
  End: 'End',
  /** Refers to the Page Up key. */
  PageUp: 'PageUp',
  /** Refers to the Page Down key. */
  PageDown: 'PageDown',
  /** Refers to the up-arrow key. */
  ArrowUp: 'ArrowUp',
  /** Refers to the down-arrow key. */
  ArrowDown: 'ArrowDown',
  /** Refers to the left-arrow key. */
  ArrowLeft: 'ArrowLeft',
  /** Refers to the right-arrow key. */
  ArrowRight: 'ArrowRight',
} as const;

export type Key = (typeof Key)[keyof typeof Key];
