import { computed, nextTick, onUpdated, ref, watch, type Ref } from 'vue';

import { compareOrder } from './ToastHostStore';
import type { ToastOptions } from './ToastOptions';
import type { VisibleToast } from './UseResolvedToasts';

/** @internal The least height the overflow button is measured at (px). */
const OverflowButtonHeight = 36;

/** @internal The least height the overflow button is measured at on a coarse pointer (px). */
const TouchOverflowButtonHeight = 44;

/** Defines the elements and lists a host's capacity is measured from. */
export interface ToastCapacitySources {
  readonly stack: Readonly<Ref<HTMLElement | null>>;
  readonly overflowButton: () => HTMLElement | null | undefined;
  /** Every live toast, in delivery order. */
  readonly cards: Readonly<Ref<ReadonlyArray<VisibleToast>>>;
  /** The order the collapsed window fills in. */
  readonly ordered: Readonly<Ref<ReadonlyArray<VisibleToast>>>;
}

/** Defines the host settings capacity reads. */
export interface ToastCapacitySettings {
  /** The maximum number of cards shown at rest. */
  readonly max: number;

  /** The space between cards, in px. */
  readonly gap: number;
}

/**
 * Manages the collapsed stack's fit to `max` and to the available height, measured from full cards, and the
 * expanded overflow list that shows every card in compact rows.
 */
export function useToastCapacity(sources: ToastCapacitySources, settings: ToastCapacitySettings) {
  const { stack, overflowButton, cards, ordered } = sources;
  const overflowOpen = ref(false);
  const fitCount = ref(Infinity);
  const needsScroll = ref(false);

  const collapsed = computed(() => ordered.value.slice(0, Math.min(settings.max, fitCount.value)));
  const overflowCount = computed(() => (settings.max > 0 ? cards.value.length - collapsed.value.length : 0));
  const visible = computed(() => (overflowOpen.value ? cards.value : [...collapsed.value].sort(compareOrder)));

  /** The copy a card shows — its `compact` copy in the overflow list, when it has one. */
  function copyOf(toast: ToastOptions): Pick<ToastOptions, 'title' | 'description'> {
    return (overflowOpen.value && toast.compact) || toast;
  }

  const measuredHeights = new Map<string, { nonce: number; height: number }>();
  let sizeObserver: ResizeObserver | undefined;
  let observedCards = new Set<HTMLElement>();
  let measuredWidth = 0;

  function measureCapacity(): void {
    const host = stack.value;
    if (!host) return;
    const minButtonHeight = window.matchMedia('(pointer: coarse)').matches
      ? TouchOverflowButtonHeight
      : OverflowButtonHeight;
    const buttonHeight = Math.max(overflowButton()?.offsetHeight ?? 0, minButtonHeight);
    host.style.setProperty('--toast-overflow-control-height', `${buttonHeight}px`);
    // The collapsed capacity is measured from full cards. Compact rows can yield a different fit.
    if (overflowOpen.value) return;
    // A different viewport width can rewrap even the cards currently outside the collapsed window.
    if (host.clientWidth !== measuredWidth) {
      measuredWidth = host.clientWidth;
      measuredHeights.clear();
    }
    const nextObserved = new Set<HTMLElement>();
    const active = new Map(cards.value.map((card) => [card.id, card.nonce]));
    for (const node of host.children) {
      if (!(node instanceof HTMLElement) || !node.dataset.toastId || node.hasAttribute('data-toast-exiting')) continue;
      const id = node.dataset.toastId;
      const nonce = active.get(id);
      if (nonce === undefined) continue;
      nextObserved.add(node);
      if (!observedCards.has(node)) sizeObserver?.observe(node);
      measuredHeights.set(id, { nonce, height: node.offsetHeight });
    }
    for (const node of observedCards) if (!nextObserved.has(node)) sizeObserver?.unobserve(node);
    observedCards = nextObserved;
    for (const id of measuredHeights.keys()) if (!active.has(id)) measuredHeights.delete(id);

    const room = Number.parseFloat(getComputedStyle(host).maxHeight);
    if (!Number.isFinite(room) || settings.max <= 0) return;
    const heights = ordered.value.slice(0, settings.max).map((card) => {
      const measured = measuredHeights.get(card.id);
      return (measured?.nonce === card.nonce ? measured.height : 0) + settings.gap;
    });
    const total = heights.reduce((sum, height) => sum + height, 0) - settings.gap;
    const needsOverflow = ordered.value.length > settings.max || total > room;
    const budget = needsOverflow ? room - buttonHeight : room + settings.gap;
    let used = 0;
    let fit = 0;
    for (const height of heights) {
      if (used + height > budget) break;
      used += height;
      fit += 1;
    }
    needsScroll.value = fit === 0 && heights.length > 0;
    fitCount.value = Math.max(1, fit);
  }

  watch(
    stack,
    (host, _old, onCleanup) => {
      if (!host) return;
      if (typeof ResizeObserver !== 'undefined') {
        sizeObserver = new ResizeObserver(measureCapacity);
        sizeObserver.observe(host);
      }
      window.addEventListener('resize', measureCapacity);
      measureCapacity();
      onCleanup(() => {
        sizeObserver?.disconnect();
        sizeObserver = undefined;
        observedCards.clear();
        measuredHeights.clear();
        window.removeEventListener('resize', measureCapacity);
      });
    },
    { flush: 'post' },
  );

  onUpdated(measureCapacity);

  /** Opens the overflow list on the first hidden card, or closes it and returns focus to its button. */
  async function toggleOverflow(): Promise<void> {
    const show = !overflowOpen.value;
    const shown = new Set(collapsed.value.map((card) => card.id));
    const next = show ? cards.value.find((card) => !shown.has(card.id)) : undefined;
    overflowOpen.value = show;
    await nextTick();
    const host = stack.value;
    if (!host) return;
    if (next) {
      const card = host.querySelector<HTMLElement>(`[data-toast-id="${next.id}"]`);
      card?.focus({ preventScroll: true });
      card?.scrollIntoView({ block: 'nearest' });
    } else {
      host.scrollTop = 0;
      const target = overflowButton() ?? host.querySelector<HTMLElement>('[data-toast-id]:not([data-toast-exiting])');
      target?.focus({ preventScroll: true });
    }
  }

  function onEscape(event: KeyboardEvent): void {
    if (!overflowOpen.value) return;
    event.stopPropagation();
    void toggleOverflow();
  }

  /** Returns to the collapsed, unmeasured state once the stack is gone. */
  function reset(): void {
    overflowOpen.value = false;
    fitCount.value = Infinity;
    needsScroll.value = false;
  }

  return {
    overflowOpen,
    needsScroll,
    overflowCount,
    visible,
    copyOf,
    measureCapacity,
    toggleOverflow,
    onEscape,
    reset,
  };
}
