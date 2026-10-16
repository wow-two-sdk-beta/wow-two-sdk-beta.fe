import { inject, provide, shallowRef, type InjectionKey } from 'vue';

/**
 * Defines the navigation-progress controls plus the ref-counted manual busy flag exposed to app code.
 *
 * `isBusy` is a REACTIVE PROPERTY — a native getter over the internal ref, the same shape `auth`'s
 * `AuthApi` uses. Read it in a template, a `computed`, or a `watch` and it re-evaluates; destructuring
 * (`const { isBusy } = useNavigationProgress()`) takes a one-time copy and will not update.
 */
export interface NavigationProgressState {
  /** The ref-counted busy flag — true while at least one manual span is in flight. */
  readonly isBusy: boolean;

  /** Starts a manual busy span; returns an idempotent function that ends only that span. */
  readonly begin: () => () => void;

  /** Ends one manual busy span — the raw counterpart to `begin`, clamped at zero. */
  readonly end: () => void;

  /** Tracks a promise as a manual busy span — begins now, ends when it settles; resolves with the promise's value. */
  readonly track: <T>(promise: Promise<T>) => Promise<T>;
}

/** The injection key backing `ProgressProvider` — React's `createContext(null)` counterpart. */
export const NavigationProgressKey: InjectionKey<NavigationProgressState> = Symbol('wow-two.navigation-progress');

/**
 * Creates a standalone navigation-progress state — ref-counts manual busy spans. Headless and
 * component-free, so a plain module (a store, a test) can drive the indicator without mounting a
 * provider. `ProgressProvider` is this factory plus a `provide`.
 */
export function createNavigationProgress(): NavigationProgressState {
  const count = shallowRef(0);

  const begin = (): (() => void) => {
    count.value += 1;
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      count.value = Math.max(0, count.value - 1);
    };
  };

  const end = (): void => {
    count.value = Math.max(0, count.value - 1);
  };

  const track = <T>(promise: Promise<T>): Promise<T> => {
    const done = begin();
    return promise.finally(done);
  };

  // Native getter over the counter ref — a read inside a template / computed / watch tracks it,
  // so no re-created object is needed on each transition (React rebuilt the value via `useMemo`).
  return {
    get isBusy() {
      return count.value > 0;
    },
    begin,
    end,
    track,
  };
}

/** Provides a navigation-progress state to the current component's subtree; returns the state it provided. */
export function provideNavigationProgress(
  state: NavigationProgressState = createNavigationProgress(),
): NavigationProgressState {
  provide(NavigationProgressKey, state);
  return state;
}

/** @internal Reads the navigation-progress state, or null when used outside a `ProgressProvider`. */
export function useOptionalNavigationProgress(): NavigationProgressState | null {
  return inject(NavigationProgressKey, null);
}

/** Provides access to the navigation-progress controls (begin / end / track) from the nearest `ProgressProvider`. */
export function useNavigationProgress(): NavigationProgressState {
  const state = useOptionalNavigationProgress();
  if (state === null) {
    throw new Error('useNavigationProgress must be used within a <ProgressProvider>.');
  }
  return state;
}
