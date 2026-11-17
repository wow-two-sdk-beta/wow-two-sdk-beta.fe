import { computed, type ComputedRef, type Ref } from 'vue';

import { NoticePriority } from '../../../feedback';
import { Severity } from '../../../foundation/styles';
import type { ToastEntry } from './ToastEntry';
import { compareOrder, hasDeadline, isRunning } from './ToastHostStore';
import type { ToastSeverity } from './ToastSeverity';

/** The per-severity expiry a `ToastHost` starts from, in ms. */
export const DefaultToastDurations: Readonly<Partial<Record<ToastSeverity, number>>> = Object.freeze({
  [Severity.Danger]: 8000,
});

/** The display lifetimes for low, normal, high and urgent notices, in milliseconds. */
export const DefaultToastPriorityDurations: Readonly<Record<NoticePriority, number>> = Object.freeze({
  [NoticePriority.Low]: 4000,
  [NoticePriority.Normal]: 6000,
  [NoticePriority.High]: 10000,
  [NoticePriority.Urgent]: 10000,
});

/** Represents a live toast with the lifetime its host resolved for it. */
export interface VisibleToast extends ToastEntry {
  /** The lifetime in ms the host resolved; `Infinity` while the toast runs or never expires. */
  resolvedDuration: number;
}

/** Defines the host settings a toast's lifetime resolves from. */
export interface ToastDurationSettings {
  /** The auto-dismiss delay in ms for a severity missing from `durations`. */
  readonly defaultDuration: number;

  /** The auto-dismiss delay in ms per severity. */
  readonly durations: Readonly<Partial<Record<ToastSeverity, number>>>;

  /** The display lifetime in ms per priority; when set, unclassified toasts count as Normal. */
  readonly priorityDurations?: Readonly<Partial<Record<NoticePriority, number>>>;
}

/**
 * Manages each toast's resolved lifetime — none while it runs, else its deadline, its own `duration`, the
 * priority table, the severity table, then `defaultDuration` — in priority, then delivery, order.
 */
export function useResolvedToasts(
  entries: Readonly<Ref<ReadonlyArray<ToastEntry>>>,
  settings: ToastDurationSettings,
): ComputedRef<ReadonlyArray<VisibleToast>> {
  return computed(() =>
    entries.value
      .map((t) => {
        const priority = t.priority ?? (settings.priorityDurations ? NoticePriority.Normal : undefined);
        const priorityDuration =
          priority === undefined ? undefined : (settings.priorityDurations ?? DefaultToastPriorityDurations)[priority];
        let resolvedDuration: number;
        if (isRunning(t)) resolvedDuration = Infinity;
        else if (hasDeadline(t)) resolvedDuration = Math.max(0, t.expiresAtMs - t.createdAtMs);
        else {
          resolvedDuration =
            t.duration ??
            priorityDuration ??
            settings.durations[t.severity ?? Severity.Neutral] ??
            settings.defaultDuration;
        }
        return { ...t, resolvedDuration };
      })
      .sort(compareOrder),
  );
}
