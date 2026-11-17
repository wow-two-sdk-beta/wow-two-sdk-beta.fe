/** Reports whether an element's focus shows its ring — the keyboard's focus, as opposed to a pointer's. */
export function isFocusVisible(element: Element | null): boolean {
  try {
    return element?.matches(':focus-visible') ?? false;
  } catch {
    // An engine without the selector cannot tell the two apart; keep the pointer behaviour.
    return false;
  }
}
