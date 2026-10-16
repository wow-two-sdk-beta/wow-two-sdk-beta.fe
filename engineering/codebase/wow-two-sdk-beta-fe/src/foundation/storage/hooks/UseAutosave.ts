import { onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue';
import type { AppError, Result } from '../../results';

/** The lifecycle of the latest autosave intent, including a queued trailing write. */
export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/** Tunes autosave timing, gating and failure reporting. */
export interface UseAutosaveOptions {
  /** The quiet period in milliseconds. Defaults to 800; read when an edit is scheduled. */
  readonly delayMs?: MaybeRefOrGetter<number>;
  /** Disabling drops pending work and invalidates completion state; reenabling schedules the current value. */
  readonly enabled?: MaybeRefOrGetter<boolean>;
  /** Reports a current write's explicit failure or exception while the scope remains enabled and live. */
  readonly onError?: (error: unknown) => void | PromiseLike<void>;
}

/** The current autosave intent and explicit queue controls. */
export interface AutosaveControls {
  readonly status: Readonly<ShallowRef<AutosaveStatus>>;
  /** The latest current-intent failure or exception; cleared by a new edit or cancellation. */
  readonly error: Readonly<ShallowRef<unknown | null>>;
  /** Date.now() when a still-current write last succeeded; obsolete completions do not advance it. */
  readonly lastSavedAt: Readonly<ShallowRef<number | null>>;
  /**
   * Makes pending work ready immediately, still waiting for any active sink. Without pending work this is a no-op.
   */
  flush(): void;
  /** Drops queued work and invalidates active completion state. An already-started sink cannot be undone. */
  cancel(): void;
}

/**
 * Watches edits deeply and serializes saves, retaining only the latest pending value behind an active write.
 * A new edit immediately supersedes the old completion status, even while its debounce is still pending.
 * The sink receives the latest value when its turn starts. For mutable drafts, a sink that needs an immutable
 * payload must snapshot before its first await; autosave does not impose a cloning policy on domain values.
 *
 * A void sink acknowledges completion by returning normally, preserving synchronous storage adapters.
 * A Result sink acknowledges success explicitly or supplies an AppError. Neither means durable persistence
 * beyond the sink's own contract. Thrown/rejected exceptions remain the original error in the handle/onError;
 * they are not converted into an expected Result failure. Error-observer failures are reported diagnostically.
 *
 * The initial value is not saved. Disable/cancel discard queued writes and invalidate late completion state.
 * Disposal cancels scheduling and starts no new writes; the rejection of an already-started sink is observed
 * without updating disposed state or invoking onError. Flush readies queued work but does not await durability;
 * disposal still cancels a write queued behind an active sink.
 */
export function useAutosave<T>(
  value: MaybeRefOrGetter<T>,
  save: (value: T) => void | Result<void, AppError> | PromiseLike<void | Result<void, AppError>>,
  options: UseAutosaveOptions = {},
): AutosaveControls {
  const { delayMs = 800, enabled = true, onError } = options;
  const status = shallowRef<AutosaveStatus>('idle');
  const error = shallowRef<unknown | null>(null);
  const lastSavedAt = shallowRef<number | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isDisposed = false;
  let isRunning = false;
  let pending = false;
  let ready = false;
  let revision = 0;
  const isEnabled = (): boolean => toValue(enabled);

  function clearTimer(): void {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  }

  /** Error observers are not allowed to create an unobserved rejection in the scheduler. */
  function reportError(failure: unknown): void {
    if (!onError) return;
    const reportObserverFailure = (observerError: unknown): void => {
      console.error('Autosave onError callback failed', observerError);
    };
    try {
      void Promise.resolve(onError(failure)).catch(reportObserverFailure);
    } catch (observerError) {
      reportObserverFailure(observerError);
    }
  }

  async function execute(currentRevision: number): Promise<void> {
    let failed = false;
    let failure: unknown;
    try {
      const outcome = await save(toValue(value));
      if (outcome && !outcome.ok) {
        failed = true;
        failure = outcome.failure;
      }
    } catch (caught) {
      failed = true;
      failure = caught;
    }
    isRunning = false;
    if (!isDisposed && isEnabled() && currentRevision === revision) {
      status.value = failed ? 'error' : 'saved';
      error.value = failed ? failure : null;
      if (failed) reportError(failure);
      else lastSavedAt.value = Date.now();
    }
    drain();
  }

  function drain(): void {
    if (isDisposed || !isEnabled() || isRunning || !pending || !ready) return;
    clearTimer();
    pending = false;
    ready = false;
    isRunning = true;
    status.value = 'saving';
    void execute(revision);
  }

  function flush(): void {
    if (isDisposed || !isEnabled() || !pending) return;
    clearTimer();
    ready = true;
    drain();
  }

  function cancel(): void {
    clearTimer();
    pending = false;
    ready = false;
    revision += 1;
    if (isDisposed) return;
    status.value = 'idle';
    error.value = null;
  }

  watch(
    [() => toValue(value), isEnabled],
    () => {
      if (isDisposed) return;
      if (!isEnabled()) {
        cancel();
        return;
      }
      revision += 1;
      clearTimer();
      pending = true;
      ready = false;
      status.value = 'pending';
      error.value = null;
      const delay = toValue(delayMs);
      timer = setTimeout(
        () => {
          timer = null;
          ready = true;
          drain();
        },
        Number.isFinite(delay) ? Math.max(0, delay) : 800,
      );
    },
    // Invalidate a completion immediately on edit; a queued watcher could otherwise report obsolete success.
    { deep: true, flush: 'sync' },
  );

  onScopeDispose(() => {
    isDisposed = true;
    cancel();
    status.value = 'idle';
    error.value = null;
  });
  return { status, error, lastSavedAt, flush, cancel };
}
