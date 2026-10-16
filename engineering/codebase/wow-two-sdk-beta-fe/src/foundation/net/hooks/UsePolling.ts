import {
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  unref,
  watch,
  type MaybeRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue';

import { PollerState, createPoller, type PollFn, type Poller, type PollerOptions } from '../CreatePoller';

/** The live view a scope gets over its poll loop. */
export interface PollingHandle {
  /** The current poller state, updating on every transition. `paused` covers manual, hidden, and offline. */
  readonly state: Readonly<ShallowRef<PollerState>>;

  /** Suspends polling until `resume()`. */
  readonly pause: () => void;

  /** Clears the manual suspension; polling stays suspended if the tab is hidden or the browser offline. */
  readonly resume: () => void;

  /** Stops the loop and detaches its listeners. The scope-disposal cleanup calls it anyway. */
  readonly stop: () => void;
}

/**
 * Runs `fn` on an interval for the lifetime of the scope, suspended automatically while the tab is hidden or
 * the browser is offline.
 *
 * The loop stops when the scope is disposed and is rebuilt whenever `intervalMs` changes. `fn` is read fresh
 * on each tick, so a ref whose target changes needs no rebuild.
 *
 * @param fn - The work to repeat; a returned promise is awaited before the next tick is scheduled.
 * @param options - Interval and suspension behaviour, read once when the loop is built; handler callbacks are
 *   re-read per emission, so a ref or getter keeps them live.
 * @returns The poller state and `pause` / `resume` / `stop`.
 */
export function usePolling(fn: MaybeRef<PollFn>, options: MaybeRefOrGetter<PollerOptions> = {}): PollingHandle {
  const state = shallowRef<PollerState>(PollerState.Idle);

  let poller: Poller | null = null;

  function teardown(): void {
    poller?.stop();
    poller = null;
  }

  function build(): void {
    teardown();

    const current = toValue(options);
    const next = createPoller(() => unref(fn)(), {
      ...current,
      intervalMs: current.intervalMs,
      onStateChange: (value) => {
        state.value = value;
        toValue(options).onStateChange?.(value);
      },
      onError: (error) => toValue(options).onError?.(error),
    });

    poller = next;
    state.value = next.state;
  }

  onMounted(build);
  // Non-immediate on purpose: an immediate watcher runs on the server, where `document` and `window` are
  // absent. `intervalMs` alone is the rebuild trigger — the platform cannot retune a live interval.
  watch(() => toValue(options).intervalMs, build);
  onScopeDispose(teardown);

  const pause = (): void => {
    poller?.pause();
  };

  const resume = (): void => {
    poller?.resume();
  };

  const stop = (): void => {
    poller?.stop();
  };

  return { state, pause, resume, stop };
}
