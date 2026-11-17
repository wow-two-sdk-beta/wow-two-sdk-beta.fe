import { computed, nextTick, type Ref } from 'vue';

import { formatChordString, useHotkeys } from '../../../foundation/shortcuts';

/** Defines the stack and host state the hotkey reads. */
export interface ToastHotkeySources {
  readonly stack: Readonly<Ref<HTMLElement | null>>;
  /** The chord that moves focus to the stack, or `false` for none. */
  readonly hotkey: () => string | false;
  /** Whether a present card is showing; the key is left to the page otherwise. */
  readonly hasCards: () => boolean;
}

/** @internal Reads a chord the way the platform prints it, with function keys in capitals (`F8`, `⌥F8`, `Alt+F8`). */
function formatToastHotkey(chord: string): string {
  return formatChordString(chord).replace(/(^|[^a-z])f(\d{1,2})$/i, '$1F$2');
}

/**
 * Manages the hotkey that moves focus from anywhere on the page to the card nearest the stack's anchor, and back.
 * The key is ignored while a text field has focus. Escape inside the stack returns focus to where the key was
 * pressed; so does the stack emptying while it holds focus.
 */
export function useToastHotkey(sources: ToastHotkeySources) {
  const { stack, hotkey, hasCards } = sources;
  /** The element focus came from; cleared once focus moves elsewhere on its own. */
  let origin: HTMLElement | undefined;
  /** Whether the hotkey put focus in the stack, so Escape can hand it back even without an origin. */
  let jumped = false;

  const label = computed(() => {
    const chord = hotkey();
    return chord ? formatToastHotkey(chord) : undefined;
  });

  function focusStack(): void {
    const host = stack.value;
    const card = host?.querySelector<HTMLElement>(':scope > [data-toast-id]:not([data-toast-exiting])');
    if (!host || !card) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body && !host.contains(active)) origin = active;
    jumped = true;
    card.focus({ preventScroll: true });
    card.scrollIntoView?.({ block: 'nearest' });
  }

  useHotkeys(() => hotkey() || [], focusStack, { enabled: () => hotkey() !== false && hasCards() });

  /** Handles Escape inside the stack: focus returns to its origin, if the hotkey brought it here. */
  function returnFocus(event: KeyboardEvent): void {
    const target = origin;
    const fromHotkey = jumped;
    origin = undefined;
    jumped = false;
    if (target?.isConnected) {
      event.stopPropagation();
      target.focus({ preventScroll: true });
      return;
    }
    // Pressed from the page itself: let focus go back to the document, which also resumes the clocks.
    const active = document.activeElement;
    if (fromHotkey && active instanceof HTMLElement && stack.value?.contains(active)) {
      event.stopPropagation();
      active.blur();
    }
  }

  /** Forgets the origin once focus leaves the stack for another element. */
  function onFocusout(event: FocusEvent): void {
    const host = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && !host.contains(event.relatedTarget)) {
      origin = undefined;
      jumped = false;
    }
  }

  /** Returns focus to its origin when the last card leaves while focus is still in the stack, or lost. */
  function release(): void {
    const target = origin;
    origin = undefined;
    jumped = false;
    if (!target) return;
    const host = stack.value;
    void nextTick(() => {
      const active = document.activeElement;
      const lost = active === null || active === document.body || (host?.contains(active) ?? false);
      if (lost && target.isConnected) target.focus({ preventScroll: true });
    });
  }

  return { label, returnFocus, onFocusout, release };
}
