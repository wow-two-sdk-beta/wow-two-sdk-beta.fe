import { nextTick, shallowRef, watch, type Ref } from 'vue';

import { isFocusVisible } from './ToastFocusExtensions';
import type { VisibleToast } from './UseResolvedToasts';

/** @internal The present card nearest a departing one — the next toward the far end, else the previous. */
function neighbourOf(host: HTMLElement, leaving: Element): HTMLElement | null {
  const present = (node: Element | null): node is HTMLElement =>
    node instanceof HTMLElement && node.dataset.toastId !== undefined && !node.hasAttribute('data-toast-exiting');
  for (let node = leaving.nextElementSibling; node; node = node.nextElementSibling) if (present(node)) return node;
  for (let node = leaving.previousElementSibling; node; node = node.previousElementSibling) {
    if (present(node)) return node;
  }
  return host.querySelector<HTMLElement>('[data-toast-overflow]');
}

/**
 * Manages the exit list, retaining each dismissed card in its slot until its exit ends. `removeExiting` runs
 * when the exit's `Presence` unmounts the card; a card that returns to the visible list leaves the list at once.
 * Keyboard focus inside a departing card moves to the nearest card that stays, or to the overflow control.
 */
export function useToastExits(
  stack: Readonly<Ref<HTMLElement | null>>,
  visible: Readonly<Ref<ReadonlyArray<VisibleToast>>>,
  visibleIds: Readonly<Ref<ReadonlySet<string>>>,
  activeIds: Readonly<Ref<ReadonlySet<string>>>,
) {
  const exiting = shallowRef<ReadonlyArray<VisibleToast>>([]);
  let previous: ReadonlyArray<VisibleToast> = [];

  function handOffFocus(gone: ReadonlyArray<VisibleToast>): void {
    const host = stack.value;
    if (!host || gone.length === 0) return;
    const focused = document.activeElement;
    if (!host.contains(focused) || !isFocusVisible(focused)) return;
    const leaving = [...host.children].find(
      (node) =>
        node instanceof HTMLElement && node.contains(focused) && gone.some((card) => card.id === node.dataset.toastId),
    );
    if (!leaving) return;
    void nextTick(() => {
      const current = document.activeElement;
      if (stack.value !== host || (current !== focused && current !== document.body && current !== null)) return;
      neighbourOf(host, leaving)?.focus({ preventScroll: true });
    });
  }

  // Runs before Vue patches the list, so a departing card never leaves its slot for a frame.
  watch(
    visibleIds,
    (ids) => {
      const gone = previous.filter((p) => !ids.has(p.id) && !activeIds.value.has(p.id));
      previous = visible.value;
      handOffFocus(gone);
      const current = exiting.value;
      const known = new Set(current.map((e) => e.id));
      const merged = [...current, ...gone.filter((g) => !known.has(g.id))].filter((e) => !ids.has(e.id));
      if (merged.length !== current.length || !merged.every((e, i) => e.id === current[i]?.id)) {
        exiting.value = merged;
      }
    },
    { immediate: true },
  );

  function removeExiting(id: string): void {
    exiting.value = exiting.value.filter((e) => e.id !== id);
  }

  return { exiting, removeExiting };
}
