/* Provides the literal strings a DOM attribute carries for a boolean state. */

/** Defines the value a boolean DOM or ARIA attribute is set to. */
export const AttributeValue = {
  /** Refers to the affirmative state — `aria-expanded="true"`, `data-copied="true"`. */
  True: 'true',

  /** Refers to the explicit negative state, for attributes where absence is not the same as false. */
  False: 'false',
} as const;

/** Defines the value a boolean DOM or ARIA attribute is set to. */
export type AttributeValue = (typeof AttributeValue)[keyof typeof AttributeValue];
