/** Press-interaction extensions — types + constants shared by interactive components. */

/** Unified press event — pointer OR keyboard activation on any HTML element. */
export type PressEvent<T extends HTMLElement = HTMLElement> = (PointerEvent | KeyboardEvent) & {
  currentTarget: T;
};

export const PressExtensions = {
  /**
   * Bounds for `longPressDelay` props. Below `min`: overlaps with normal
   * click latency, too easy to trigger accidentally. Above `max`: clearly a
   * developer error (5-min hold). `default` is the conventional 500ms.
   */
  longPressDelay: {
    min: 200,
    max: 300_000,
    default: 500,
  },
} as const;
