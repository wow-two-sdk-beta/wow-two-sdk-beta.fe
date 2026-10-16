import { onScopeDispose, readonly, ref, type Ref } from 'vue';

/** Defines options for `useRefresh`. */
export interface UseRefreshOptions {
  /** The shortest time `refreshing` stays true, in ms, so the skeleton swap is always seen. Default `400`. */
  readonly minDuration?: number;
}

/** The state `useRefresh` returns. */
export interface UseRefreshReturn {
  /** Runs the refresh; resolves once it settles and the minimum duration has passed. */
  readonly refresh: () => Promise<void>;
  /** True from the click until the refresh settles — drive the region's `SkeletonStateGroup` with it. */
  readonly refreshing: Readonly<Ref<boolean>>;
}

/**
 * Tracks a user-requested refresh, separate from background refetches, so a region can swap its values to
 * placeholders and back. A refresh that answers instantly still shows them for `minDuration`, so the user can
 * tell it ran; overlapping clicks share one pending state. A failed refetch still ends the refresh — the query
 * owns its error. Disposing the scope clears the timers, so an unmounted component never updates.
 */
export function useRefresh(refetch: () => unknown, { minDuration = 400 }: UseRefreshOptions = {}): UseRefreshReturn {
  const refreshing = ref(false);
  const delays = new Map<ReturnType<typeof setTimeout>, () => void>();
  let pending = 0;
  let active = true;

  onScopeDispose(() => {
    active = false;
    for (const [timer, resolve] of delays) {
      clearTimeout(timer);
      resolve();
    }
    delays.clear();
  });

  async function refresh(): Promise<void> {
    pending += 1;
    refreshing.value = true;
    const delay = new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        delays.delete(timer);
        resolve();
      }, minDuration);
      delays.set(timer, resolve);
    });
    try {
      await Promise.all([
        Promise.resolve()
          .then(refetch)
          .catch(() => undefined),
        delay,
      ]);
    } finally {
      pending -= 1;
      if (active && pending === 0) refreshing.value = false;
    }
  }

  return { refresh, refreshing: readonly(refreshing) };
}
