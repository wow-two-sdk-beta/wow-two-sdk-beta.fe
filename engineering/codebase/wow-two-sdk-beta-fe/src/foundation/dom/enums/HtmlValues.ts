/* HTML attribute & element value enums (const + type pairs). */

/** Defines an HTML element tag name (for intrinsic elements and polymorphic components). */
export const HtmlElement = {
  /** Refers to a `<button>` element. */
  Button: 'button',
  /** Refers to an `<a>` (anchor) element. */
  Anchor: 'a',
  /** Refers to a `<span>` element. */
  Span: 'span',
  /** Refers to a `<div>` element. */
  Div: 'div',
} as const;

export type HtmlElement = (typeof HtmlElement)[keyof typeof HtmlElement];

/** Defines the `<button type="">` attribute value. */
export const ButtonType = {
  /** Refers to a non-submitting button. */
  Button: 'button',
  /** Refers to a form-submitting button. */
  Submit: 'submit',
  /** Refers to a form-resetting button. */
  Reset: 'reset',
} as const;

export type ButtonType = (typeof ButtonType)[keyof typeof ButtonType];
