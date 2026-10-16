/** One captured lifetime; cancellation and revision checks protect asynchronous side effects. */
export interface RequestSnapshot {
  readonly revision: number;
  readonly signal: AbortSignal;
  readonly isCurrent: () => boolean;
}

/** An explicitly owned lifetime shared by transport, authentication and server-state adapters. */
export interface RequestScope {
  readonly capture: () => RequestSnapshot;
  readonly invalidate: () => void;
  readonly dispose: () => void;
  readonly subscribe: (listener: () => void) => () => void;
}

/** Creates an isolated lifetime. Invalidation cancels old work and opens a fresh revision. */
export function createRequestScope(): RequestScope {
  let revision = 0;
  let disposed = false;
  let controller = new AbortController();
  const listeners = new Set<() => void>();
  const invalidate = (): void => {
    const previous = controller;
    revision += 1;
    controller = new AbortController();
    if (disposed) controller.abort();
    previous.abort();
    const failures: unknown[] = [];
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) throw new AggregateError(failures, 'A request-scope cleanup failed.');
  };
  return {
    capture: () => {
      const captured = revision;
      return { revision: captured, signal: controller.signal, isCurrent: () => !disposed && captured === revision };
    },
    invalidate: () => {
      if (!disposed) invalidate();
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      try {
        invalidate();
      } finally {
        listeners.clear();
      }
    },
    subscribe: (listener) => {
      if (disposed) {
        listener();
        return () => {};
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Combines owned signals without relying on newer AbortSignal.any browser support. */
export function combineRequestSignals(...signals: Array<AbortSignal | null | undefined>): {
  readonly signal: AbortSignal;
  readonly dispose: () => void;
} {
  const controller = new AbortController();
  const cleanups: Array<() => void> = [];
  const dispose = (): void => {
    for (const cleanup of cleanups.splice(0)) cleanup();
  };
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    const abort = (): void => {
      controller.abort(signal.reason);
      dispose();
    };
    signal.addEventListener('abort', abort, { once: true });
    cleanups.push(() => signal.removeEventListener('abort', abort));
  }
  if (controller.signal.aborted) dispose();
  return { signal: controller.signal, dispose };
}

/** Settles promptly on cancellation, even when an async delegate ignores its signal. */
export function awaitRequest<T>(work: () => T | PromiseLike<T>, signal?: AbortSignal | null): Promise<T> {
  if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'));
  return new Promise<T>((resolve, reject) => {
    const abort = (): void => reject(signal?.reason ?? new DOMException('Cancelled', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });
    Promise.resolve()
      .then(() => {
        if (signal?.aborted) throw signal.reason ?? new DOMException('Cancelled', 'AbortError');
        return work();
      })
      .then(resolve, reject)
      .finally(() => signal?.removeEventListener('abort', abort));
  });
}
