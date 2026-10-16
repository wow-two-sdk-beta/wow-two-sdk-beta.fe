// Network reachability — or as much of it as the browser is willing to admit to.
//
// WHAT `navigator.onLine` ACTUALLY MEANS: it is `false` only when the browser is certain there is NO network link
// — airplane mode, Wi-Fi off, cable unplugged. It is `true` the moment a link exists and says NOTHING beyond that.
// A captive portal nobody has logged into, hotel Wi-Fi that has not been paid for, a dropped VPN, a DNS failure,
// or an API that is simply down all report `true`. So `false` is trustworthy and `true` is a hint.
//
// USE ACCORDINGLY: explain a failure that already happened ("you appear to be offline"), defer a retry, pause a
// poll. Never treat `true` as a precondition — "we are online, so this request will succeed" is exactly the
// inference this value cannot support. Proving the server that matters is reachable takes a request to it, which
// is `foundation/http`'s job and not this slice's.
//
// The `online` / `offline` events bind through `foundation/dom`' `useEventListener` rather than a hand-rolled
// `addEventListener`, so handler identity, attach options, and teardown follow the same rules as every other
// listener in the library. The target is a GETTER, not a module constant: resolving `window` at module scope
// would evaluate during a server render, and the lazy getter is the same shape `useEventListener` uses for its
// own default.

import { onMounted, shallowRef, type ShallowRef } from 'vue';

import { useEventListener } from '../../dom';

/** Resolved lazily so importing this module in an SSR pass never touches `window`. */
const globalTarget = (): Window | null => (typeof window === 'undefined' ? null : window);

/**
 * Reads `navigator.onLine`, defaulting to online when there is no `navigator` (SSR), when the property is missing
 * (a partial polyfill), or when the read throws. Optimistic by design — see the note on the composable.
 */
function readOnlineStatus(): boolean {
  try {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
  } catch {
    return true;
  }
}

/**
 * Tracks whether the browser believes it has a network link — seeded optimistically, synced from
 * `navigator.onLine` on mount, then kept current by the window `online` / `offline` events.
 *
 * Reads `true` under SSR and whenever the status cannot be read: an offline banner rendered by a server that has
 * never met the client is worse than a missing one, and the value corrects on mount either way. Read this file's
 * header before acting on it — `false` is reliable, `true` only means a link exists.
 *
 * @returns `true` while the browser reports a network link.
 */
export function useOnlineStatus(): Readonly<ShallowRef<boolean>> {
  // Seeded `true` rather than read at setup: `readOnlineStatus` answers `true` under SSR anyway, and seeding a
  // constant keeps `navigator` out of the setup pass entirely.
  const online = shallowRef(true);

  // Re-read once on mount. Two gaps the events alone can never close: the seed was unconditional, and the link
  // can flip between setup and the listeners attaching.
  onMounted(() => {
    online.value = readOnlineStatus();
  });

  useEventListener(
    'online',
    () => {
      online.value = true;
    },
    globalTarget,
  );
  useEventListener(
    'offline',
    () => {
      online.value = false;
    },
    globalTarget,
  );

  return online;
}
