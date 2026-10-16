/* Provides the DOM event names components re-emit or intercept, plus the handler-prop derivation. */

/** Defines a DOM event name. */
export const DomEvent = {
  /** Refers to a pointer or keyboard activation. */
  Click: 'click',

  /** Refers to a committed value change — fires on blur for a native input. */
  Change: 'change',

  /** Refers to a failed operation surfaced as an event. */
  Error: 'error',

  /** Refers to a key press. */
  KeyDown: 'keydown',

  /** Refers to a key release. */
  KeyUp: 'keyup',

  /** Refers to a pointer contacting the element. */
  PointerDown: 'pointerdown',

  /** Refers to a pointer releasing over the element. */
  PointerUp: 'pointerup',

  /** Refers to a pointer leaving the element. */
  PointerLeave: 'pointerleave',

  /** Refers to a pointer interaction the browser cancelled. */
  PointerCancel: 'pointercancel',
} as const;

/** Defines a DOM event name. */
export type DomEvent = (typeof DomEvent)[keyof typeof DomEvent];

/** Defines the Vue handler-prop name carrying a DOM event — `'error'` becomes `'onError'`. */
export type HandlerProp<TEvent extends string> = `on${Capitalize<TEvent>}`;
