import { computed, onScopeDispose, onUpdated, ref, watch, type Ref } from 'vue';

import { hasDeadline } from './ToastHostStore';
import type { VisibleToast } from './UseResolvedToasts';
import type { ToastPinControls } from './UseToastPins';

/** @internal One toast's expiry clock — its banked time and the timer running the rest. */
interface ToastClock {
  nonce: number;
  duration: number;
  remaining: number;
  startedAt: number;
  handle?: number;
}

/** Defines the reactive inputs a host's expiry clocks follow. */
export interface ToastClockSources {
  readonly stack: Readonly<Ref<HTMLElement | null>>;
  /** Every live toast, in delivery order. */
  readonly cards: Readonly<Ref<ReadonlyArray<VisibleToast>>>;
  readonly visible: Readonly<Ref<ReadonlyArray<VisibleToast>>>;
  readonly activeIds: Readonly<Ref<ReadonlySet<string>>>;
  readonly visibleIds: Readonly<Ref<ReadonlySet<string>>>;
  /** Dismissed toasts still playing their exit; a pin survives until the exit ends. */
  readonly exiting: Readonly<Ref<ReadonlyArray<VisibleToast>>>;
  readonly expandedDetails: Readonly<Ref<ReadonlySet<string>>>;
  readonly pins: ToastPinControls;
  /** Whether the reader is browsing the expanded overflow list, which holds every ordinary clock. */
  readonly browsing: () => boolean;
  /** The card a finger is dragging, whose ordinary clock holds until the drag ends. */
  readonly swiping: () => string | undefined;
  readonly expire: (id: string) => void;
}

/** Defines the host setting the expiry clocks read. */
export interface ToastClockSettings {
  /** Whether hovering or focusing the stack holds the clocks. */
  readonly canPauseOnHover: boolean;
}

/**
 * Manages one expiry clock per timed toast. Hover, descendant focus, open details, the overflow list, a swipe in
 * progress and a toast's `pauseExpiry` bank the remaining time; a toast outside the collapsed window waits with
 * its time banked. A deadline runs through all of them. Pinning discards the clock; unpinning starts a fresh one.
 */
export function useToastClock(sources: ToastClockSources, settings: ToastClockSettings) {
  const { stack, cards, visible, activeIds, visibleIds, exiting, expandedDetails, pins, browsing, swiping, expire } =
    sources;
  const hovered = ref(false);
  const focused = ref(false);
  const paused = computed(() => settings.canPauseOnHover && (hovered.value || focused.value));
  const clocks = new Map<string, ToastClock>();

  const pausedIds = computed(
    () =>
      new Set(
        visible.value
          .filter(
            (card) =>
              !hasDeadline(card) &&
              (browsing() ||
                paused.value ||
                card.id === swiping() ||
                (card.details && expandedDetails.value.has(card.id)) ||
                card.pauseExpiry?.()),
          )
          .map((card) => card.id),
      ),
  );

  function hasCountdown(t: VisibleToast): boolean {
    return Number.isFinite(t.resolvedDuration) && !pins.isPinned(t);
  }

  function countdownKey(t: VisibleToast): string {
    return `${t.id}:${t.nonce}:${t.resolvedDuration}`;
  }

  /** The time a toast's display starts from — banked time, plus the run since the clock last resumed. */
  function timerElapsed(t: VisibleToast): number {
    if (hasDeadline(t)) return Math.min(t.resolvedDuration, Math.max(0, Date.now() - t.createdAtMs));
    const clock = clocks.get(t.id);
    if (clock?.nonce !== t.nonce || clock.duration !== t.resolvedDuration) return 0;
    const running = clock.handle === undefined ? 0 : Date.now() - clock.startedAt;
    return Math.min(clock.duration, clock.duration - clock.remaining + running);
  }

  function pauseClock(clock: ToastClock, now: number): void {
    if (clock.handle === undefined) return;
    window.clearTimeout(clock.handle);
    clock.handle = undefined;
    clock.remaining = Math.max(0, clock.remaining - (now - clock.startedAt));
  }

  // Effective pins follow the host's pin default; the end of an exit releases that toast's pin.
  watch(
    [cards, visibleIds, pausedIds, pins.pinned, pins.effective, exiting],
    ([live, showing, held]) => {
      for (const [id, clock] of clocks) {
        if (activeIds.value.has(id)) continue;
        window.clearTimeout(clock.handle);
        clocks.delete(id);
      }
      pins.retain([...live, ...exiting.value]);
      const now = Date.now();
      for (const t of live) {
        let clock = clocks.get(t.id);
        if (!hasCountdown(t)) {
          window.clearTimeout(clock?.handle);
          clocks.delete(t.id);
          continue;
        }
        const deadline = hasDeadline(t);
        if (!deadline && !showing.has(t.id)) {
          if (clock) pauseClock(clock, now);
          continue;
        }
        if (!clock || clock.nonce !== t.nonce || clock.duration !== t.resolvedDuration) {
          window.clearTimeout(clock?.handle);
          clock = {
            nonce: t.nonce,
            duration: t.resolvedDuration,
            remaining: deadline ? Math.max(0, t.expiresAtMs - now) : t.resolvedDuration,
            startedAt: now,
          };
          clocks.set(t.id, clock);
        }
        if (held.has(t.id)) {
          pauseClock(clock, now);
        } else if (clock.handle === undefined) {
          clock.startedAt = now;
          clock.handle = window.setTimeout(() => expire(t.id), clock.remaining);
        }
      }
    },
    { immediate: true, flush: 'post' },
  );

  // A focused card that leaves the stack fires no `focusout`, so each patch rechecks where focus went.
  onUpdated(() => {
    if (focused.value && !stack.value?.contains(document.activeElement)) focused.value = false;
  });

  onScopeDispose(() => {
    for (const clock of clocks.values()) window.clearTimeout(clock.handle);
    clocks.clear();
  });

  return {
    paused,
    pausedIds,
    hasCountdown,
    countdownKey,
    timerElapsed,
    onPointerEnter(event: PointerEvent): void {
      if (event.pointerType !== 'touch') hovered.value = true;
    },
    onPointerLeave(): void {
      hovered.value = false;
    },
    onFocusin(): void {
      focused.value = true;
    },
    onFocusout(event: FocusEvent): void {
      const host = event.currentTarget as HTMLElement;
      if (!(event.relatedTarget instanceof Node) || !host.contains(event.relatedTarget)) focused.value = false;
    },
    /** Forgets hover and focus once the stack is gone; neither ends with an event then. */
    release(): void {
      hovered.value = false;
      focused.value = false;
    },
  };
}
