import { onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useRouter, type RouteLocationNormalized } from 'vue-router';

/** The copy surfaced to the native unload prompt; browsers show their own generic message instead. */
const UnsavedChangesMessage = 'You have unsaved changes that may be lost.';

/** Defines the blocker's phase — react-router's `Blocker.state` vocabulary, kept verbatim. */
export const BlockerState = {
  /** Refers to no navigation being held. */
  Unblocked: 'unblocked',
  /** Refers to a navigation held pending a decision — render the confirm dialog. */
  Blocked: 'blocked',
  /** Refers to a released navigation currently running. */
  Proceeding: 'proceeding',
} as const;

export type BlockerState = (typeof BlockerState)[keyof typeof BlockerState];

/**
 * Defines the blocker handle a confirm dialog drives — react-router's `Blocker` shape reimplemented
 * over a vue-router global guard.
 *
 * `state` and `location` are REACTIVE PROPERTIES (native getters over refs, the house convention);
 * read them off the object rather than destructuring.
 */
export interface NavigationBlocker {
  /** The current phase. */
  readonly state: BlockerState;

  /** The held navigation's target, or `null` when nothing is held. */
  readonly location: RouteLocationNormalized | null;

  /** Releases the held navigation — runs it without re-blocking. */
  readonly proceed: () => void;

  /** Discards the held navigation and returns to `unblocked`. */
  readonly reset: () => void;
}

/** Warns the browser before a full-page unload/tab-close by returning a truthy string. */
function handleBeforeUnload(event: BeforeUnloadEvent): string {
  event.preventDefault();
  event.returnValue = UnsavedChangesMessage; // legacy browsers read the assigned value
  return UnsavedChangesMessage; // older browsers read the returned value
}

/**
 * Manages navigation blocking for a dirty form — intercepts in-app routing and full-page unloads
 * while `shouldBlock`, and hands back the blocker a confirm dialog drives.
 *
 * react-router shipped `useBlocker`; vue-router has only `onBeforeRouteLeave`, which fires solely for
 * the component's OWN route and cannot hold a navigation for a later decision. This reimplements the
 * blocker over a global `beforeEach`: a blocked navigation is aborted and its target parked, then
 * `proceed()` re-pushes it with the guard stood down for exactly one navigation.
 *
 * The guard is torn down with the owning effect scope, so an unmounted form stops blocking.
 */
export function useNavigationBlocker(shouldBlock: MaybeRefOrGetter<boolean>): NavigationBlocker {
  const router = useRouter();
  const state = shallowRef<BlockerState>(BlockerState.Unblocked);
  const location = shallowRef<RouteLocationNormalized | null>(null);

  // One-shot stand-down for the navigation `proceed()` re-pushes — the guard would otherwise
  // re-block it immediately, since `shouldBlock` is still true until the app clears the form.
  let releaseOnce = false;

  const unregister = router.beforeEach((to) => {
    if (releaseOnce) {
      releaseOnce = false;
      state.value = BlockerState.Unblocked;
      location.value = null;
      return true;
    }
    if (!toValue(shouldBlock)) return true;

    location.value = to;
    state.value = BlockerState.Blocked;
    return false; // abort — `proceed()` replays it
  });
  onScopeDispose(unregister);

  // `typeof window` guarded: an immediate watcher runs on the server too, where `addEventListener`
  // would throw. `flush: 'pre'` (the default) keeps it off the post-render queue as well.
  watch(
    () => toValue(shouldBlock),
    (block, _previous, onCleanup) => {
      if (typeof window === 'undefined' || !block) return;
      window.addEventListener('beforeunload', handleBeforeUnload);
      onCleanup(() => window.removeEventListener('beforeunload', handleBeforeUnload));
    },
    { immediate: true },
  );

  const proceed = (): void => {
    const target = location.value;
    if (target === null) return;
    releaseOnce = true;
    state.value = BlockerState.Proceeding;
    void router.push(target.fullPath);
  };

  const reset = (): void => {
    state.value = BlockerState.Unblocked;
    location.value = null;
  };

  return {
    get state() {
      return state.value;
    },
    get location() {
      return location.value;
    },
    proceed,
    reset,
  };
}
