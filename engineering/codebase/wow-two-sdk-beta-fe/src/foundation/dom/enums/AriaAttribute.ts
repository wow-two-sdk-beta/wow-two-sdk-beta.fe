/* Provides the ARIA attribute names components read off or write to `$attrs` and the DOM directly. */

/**
 * Defines an ARIA attribute name.
 *
 * Values are the DOM spelling, kebab-case, because that is what `getAttribute` / `setAttribute` and a
 * `$attrs` key literally are — the house camelCase value rule does not apply to a wire format. The
 * constant exists so the spelling is written once: a typo'd `'aria-lable'` is silently inert in the
 * accessibility tree, and no test that renders the component will fail on it.
 */
export const AriaAttribute = {
  /** Refers to the accessible name carried on the element itself. */
  Label: 'aria-label',

  /** Refers to the id list of elements naming this one. */
  LabelledBy: 'aria-labelledby',

  /** Refers to the id list of elements describing this one. */
  DescribedBy: 'aria-describedby',

  /** Refers to the flag hiding an element from the accessibility tree. */
  Hidden: 'aria-hidden',

  /** Refers to the disabled state announced without removing focusability. */
  Disabled: 'aria-disabled',

  /** Refers to the selected state of an option or tab. */
  Selected: 'aria-selected',

  /** Refers to the expanded state of a disclosure or combobox. */
  Expanded: 'aria-expanded',

  /** Refers to the required state of a form control. */
  Required: 'aria-required',

  /** Refers to the busy state of a region loading its content. */
  Busy: 'aria-busy',

  /** Refers to the announcement priority of a live region. */
  Live: 'aria-live',

  /** Refers to the direction of a composite widget. */
  Orientation: 'aria-orientation',

  /** Refers to the validation state of a control. */
  Invalid: 'aria-invalid',

  /** Refers to the pressed state of a toggle button. */
  Pressed: 'aria-pressed',

  /** Refers to the type of popup opened by an element. */
  HasPopup: 'aria-haspopup',

  /** Refers to a localized description of an element's role. */
  RoleDescription: 'aria-roledescription',

  /** Refers to the minimum value of a range widget. */
  ValueMin: 'aria-valuemin',

  /** Refers to the maximum value of a range widget. */
  ValueMax: 'aria-valuemax',

  /** Refers to the current value of a range widget. */
  ValueNow: 'aria-valuenow',
} as const;

/** Defines an ARIA attribute name. */
export type AriaAttribute = (typeof AriaAttribute)[keyof typeof AriaAttribute];
