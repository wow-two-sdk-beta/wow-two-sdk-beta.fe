import { computed, shallowRef, type ComputedRef, type Ref, type ShallowRef } from 'vue';

import { comparePriority, hasDeadline } from './ToastHostStore';
import type { VisibleToast } from './UseResolvedToasts';

/** Defines the pin state of a host's toasts and the operations that change it. */
export interface ToastPinControls {
  /** The ids the reader pinned, whether or not the pin is in effect. */
  readonly pinned: Readonly<ShallowRef<ReadonlySet<string>>>;

  /** The ids whose pin is in effect — a pin lapses while its toast, or the host's default, forbids pinning. */
  readonly effective: ComputedRef<ReadonlySet<string>>;

  /** The toasts in the order the collapsed window fills — a pinned toast first within its priority. */
  readonly ordered: ComputedRef<ReadonlyArray<VisibleToast>>;

  /** Reports whether a toast may be pinned at all. */
  canPin(t: VisibleToast): boolean;

  /** Reports whether a toast's pin is in effect. */
  isPinned(t: VisibleToast): boolean;

  /** Pins an unpinned toast, or unpins a pinned one. */
  toggle(id: string): void;

  /** Drops every pin whose toast is gone or can no longer be pinned. */
  retain(candidates: Iterable<VisibleToast>): void;
}

/** Defines the host setting pinning reads. */
export interface ToastPinSettings {
  /** Whether timed toasts may be pinned by default; a toast's own `canPin` overrides. */
  readonly canPin: boolean;
}

/** Manages which timed toasts the reader pinned. A pinned toast has no clock until it is unpinned. */
export function useToastPins(
  cards: Readonly<Ref<ReadonlyArray<VisibleToast>>>,
  settings: ToastPinSettings,
): ToastPinControls {
  const pinned = shallowRef<ReadonlySet<string>>(new Set());

  function canPin(t: VisibleToast): boolean {
    return (
      (t.canPin ?? settings.canPin) &&
      !hasDeadline(t) &&
      !t.content &&
      Number.isFinite(t.resolvedDuration) &&
      t.resolvedDuration > 0
    );
  }

  function isPinned(t: VisibleToast): boolean {
    return canPin(t) && pinned.value.has(t.id);
  }

  function toggle(id: string): void {
    const next = new Set(pinned.value);
    if (!next.delete(id)) next.add(id);
    pinned.value = next;
  }

  function retain(candidates: Iterable<VisibleToast>): void {
    if (pinned.value.size === 0) return;
    const eligible = new Set<string>();
    for (const t of candidates) if (canPin(t)) eligible.add(t.id);
    const kept = [...pinned.value].filter((id) => eligible.has(id));
    if (kept.length !== pinned.value.size) pinned.value = new Set(kept);
  }

  const effective = computed(() => new Set(cards.value.filter(isPinned).map((t) => t.id)));

  const ordered = computed(() => {
    if (pinned.value.size === 0) return cards.value;
    return [...cards.value].sort(
      (a, b) => comparePriority(a, b) || Number(isPinned(b)) - Number(isPinned(a)) || a.sequence - b.sequence,
    );
  });

  return { pinned, effective, ordered, canPin, isPinned, toggle, retain };
}
