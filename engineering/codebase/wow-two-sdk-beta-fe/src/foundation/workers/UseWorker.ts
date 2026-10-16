// The Vue binding: ties one worker's lifetime to one scope's, so a mounted component owns a worker and a
// disposed one does not.
//
// TERMINATION ON TEARDOWN IS THE WHOLE POINT. A `Worker` is an OS thread with its own JS heap; it is not
// garbage-collected when the last reference to it drops, because the thread itself is a root. A component
// that creates one and navigates away leaks a live thread for the rest of the session, and a list that
// mounts one per row leaks one per row. So `onScopeDispose` calls `client.terminate()` — which also rejects
// every in-flight call, releasing any `await` still parked on the torn-down component.
//
// THE FACTORY IS CALLED ONCE, IN `onMounted`. A component's `setup` runs once, so the original's
// factory-in-a-ref indirection has nothing to protect against here — the factory a consumer passes is the
// one and only. The natural call site is still an inline arrow:
//
//   const { client } = useWorker(() => new Worker(url, { type: 'module' }));
//
// and the worker is created exactly once per mount. The cost is unchanged: changing what the factory would
// return later does NOT swap the worker. Remount to swap — a `key` on the component, which is the honest
// idiom for "this is a different resource now".
//
// SSR: the worker is created in `onMounted`, which does not run on the server, so nothing here can touch the
// `Worker` constructor during a server render. `client` is therefore `null` on the server and until mount,
// non-null from the first mount onward. `supported` is likewise set in `onMounted` rather than read at setup
// — reading a browser capability at setup time is exactly what produces a hydration mismatch, where the
// server's `false` and the client's `true` disagree on the first pass.

import { toError } from '../errors';
import { onMounted, onScopeDispose, shallowRef, type ShallowRef } from 'vue';

import { createWorkerClient, type WorkerApiOf, type WorkerClient, type WorkerClientOptions } from './WorkerClient';
import { isWorkerSupported } from './WorkerSupport';

/** What {@link useWorker} returns. */
export interface UseWorkerControls<TApi extends WorkerApiOf<TApi>> {
  /**
   * The typed client, or `null` before mount and in any runtime without `Worker`.
   *
   * Guard on it (`client.value?.call(...)`) rather than asserting: the `null` window is real until mount, so
   * an effect or event handler firing before the worker exists must have a defined answer.
   */
  readonly client: Readonly<ShallowRef<WorkerClient<TApi> | null>>;

  /**
   * Whether this runtime can spawn a worker, as determined after mount. `false` during SSR and until mount —
   * before then it is not yet knowable, and claiming otherwise at setup time would desync hydration.
   */
  readonly supported: Readonly<ShallowRef<boolean>>;
}

/**
 * Owns a worker for the lifetime of the calling scope: created on mount, terminated on disposal.
 *
 * The factory is invoked once per mount, so an inline arrow is the expected call shape.
 */
export function useWorker<TApi extends WorkerApiOf<TApi>>(
  factory: () => Worker,
  options?: WorkerClientOptions,
): UseWorkerControls<TApi> {
  const client = shallowRef<WorkerClient<TApi> | null>(null);
  const supported = shallowRef(false);

  onMounted(() => {
    if (!isWorkerSupported()) {
      client.value = null;
      supported.value = false;
      return;
    }

    supported.value = true;
    try {
      client.value = createWorkerClient<TApi>(factory(), options);
    } catch (error) {
      try {
        options?.onError?.(toError(error));
      } catch {
        /* Error observers cannot break setup. */
      }
    }
  });

  onScopeDispose(() => {
    // Rejects everything in flight as well as killing the thread — an `await` left over from the torn-down
    // component gets an error instead of hanging forever.
    client.value?.terminate();
    client.value = null;
    supported.value = false;
  });

  return { client, supported };
}
