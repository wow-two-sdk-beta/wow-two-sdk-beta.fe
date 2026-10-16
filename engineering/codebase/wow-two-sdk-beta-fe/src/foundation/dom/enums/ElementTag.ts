/* Shared polymorphic-element vocabulary for the `as` prop
 * (countUp / typewriter / animatedNumber / tilt / gradientText / scrollReveal). */

/** Defines the HTML tag a polymorphic component renders as. */
export const ElementTag = {
  /** Refers to a `<span>`. */
  Span: 'span',
  /** Refers to a `<div>`. */
  Div: 'div',
  /** Refers to a `<p>`. */
  P: 'p',
  /** Refers to an `<h1>`. */
  H1: 'h1',
  /** Refers to an `<h2>`. */
  H2: 'h2',
  /** Refers to an `<h3>`. */
  H3: 'h3',
  /** Refers to an `<h4>`. */
  H4: 'h4',
  /** Refers to an `<h5>`. */
  H5: 'h5',
  /** Refers to an `<h6>`. */
  H6: 'h6',
  /** Refers to a `<section>`. */
  Section: 'section',
  /** Refers to an `<article>`. */
  Article: 'article',
  /** Refers to an `<li>`. */
  Li: 'li',
} as const;

export type ElementTag = (typeof ElementTag)[keyof typeof ElementTag];
