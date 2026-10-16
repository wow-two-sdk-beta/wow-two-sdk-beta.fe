/** Defines the element handle of a single-element component root. */
export interface ComponentElement {
  /** The mounted root element exposed by Vue. */
  readonly $el: HTMLElement;

  /** The component's explicit root ref, unwrapped by Vue. */
  readonly el: HTMLElement | null;
}
