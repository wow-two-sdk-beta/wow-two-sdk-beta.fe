// The worker-thread half of the RPC. Goal: a worker entry file is three lines.
//
//   import { exposeWorkerApi } from '@wow-two-beta/ui/foundation/workers';
//   const handlers = { add: (a: number, b: number) => a + b };
//   exposeWorkerApi(handlers);
//
// THE SCOPE IS STRUCTURALLY TYPED, NOT `DedicatedWorkerGlobalScope`. That type ships in TypeScript's
// `webworker` lib, and this package compiles under `["ES2022", "DOM", "DOM.Iterable"]` — pulling in
// `webworker` alongside `DOM` is not an option, since the two declare conflicting globals (`self`,
// `postMessage`, `location`) and the merge fails outright. A minimal structural `WorkerScope` describes
// exactly the three members used and typechecks under either lib. It also makes the host injectable, which
// is what lets a test drive both halves without a real worker.
//
// THE DEFAULT SCOPE IS RESOLVED, NOT ASSUMED. `globalThis` in a window is a `Window`, whose `postMessage`
// has a different signature (`targetOrigin`) — so the default is probed for the two members it needs and
// yields `null` when absent. Calling this on the main thread or under SSR therefore registers nothing and
// returns a no-op disposer instead of throwing. Importing a worker module from the main thread is a
// routine accident (a barrel re-export, a bundler pulling it into the wrong chunk); it should be inert,
// not fatal.
//
// EVERY FAILURE PATH MUST STILL POST A REPLY. A handler that throws, a method that does not exist, a
// rejected promise, and even a RESULT THAT WILL NOT CLONE all have to produce a `{ id, error }` message,
// because the client's pending entry is keyed on that id and only a reply (or its deadline) releases it.
// The non-cloneable result is the subtle one: posting the success throws inside the host, and without the
// second try/catch around it the call would hang until its timeout — or forever, if it has none.

import { serializeError } from '../errors';

import type { WorkerApiOf } from './WorkerClient';
import { createFailureMessage, createSuccessMessage, isWorkerRequestMessage } from './WorkerProtocol';

/**
 * Describes the parts of a worker's global scope this module uses. Structural so it typechecks without the
 * `webworker` lib, and so a test can pass a stand-in.
 */
export interface WorkerScope {
  /** Subscribes to inbound messages. */
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;

  /** Unsubscribes a previously registered listener. */
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;

  /** Posts a reply back to the main thread, optionally transferring ownership of objects reachable from it. */
  postMessage(message: unknown, transfer?: ReadonlyArray<Transferable>): void;
}

/** Constrains a handler map: method name → implementation, sync or async. */
export type WorkerHandlerMap = Record<string, (...args: never[]) => unknown>;

/**
 * Projects a client-side contract into the handler map that satisfies it — the optional annotation for a
 * consumer who wants the compiler to hold both halves of the RPC to one interface.
 *
 * ```ts
 * const handlers: WorkerHandlersOf<MathApi> = { add: (a, b) => a + b };
 * exposeWorkerApi(handlers);
 * ```
 *
 * Each handler may return the value, a promise of it, or that value wrapped by {@link withTransfer} — all
 * three arrive at the client as the plain value.
 */
export type WorkerHandlersOf<TApi extends WorkerApiOf<TApi>> = {
  readonly [TMethod in keyof TApi]: (
    ...args: Parameters<TApi[TMethod]>
  ) =>
    | Awaited<ReturnType<TApi[TMethod]>>
    | Promise<Awaited<ReturnType<TApi[TMethod]>>>
    | WorkerTransfer<Awaited<ReturnType<TApi[TMethod]>>>
    | Promise<WorkerTransfer<Awaited<ReturnType<TApi[TMethod]>>>>;
};

/**
 * Brands a {@link WorkerTransfer} wrapper. Exported only because the declaration emit needs the symbol to
 * be nameable; it is an implementation detail, not something to reference. The wrapper is unwrapped before
 * the reply is posted, so this symbol never crosses a thread boundary.
 */
export const WorkerTransferMarker = Symbol('@wow-two-beta/worker-transfer');

/** Wraps a handler's return value together with the objects to move rather than copy. Built by {@link withTransfer}. */
export interface WorkerTransfer<TValue> {
  /** The brand. */
  readonly [WorkerTransferMarker]: true;

  /** The value the client will receive — the wrapper itself is stripped before posting. */
  readonly value: TValue;

  /** The objects whose ownership moves to the main thread. */
  readonly transfer: ReadonlyArray<Transferable>;
}

/**
 * Marks a handler's result for transfer instead of a structured-clone copy — the return-path counterpart
 * of `WorkerCallOptions.transfer`.
 *
 * ```ts
 * const handlers = {
 *   render: (size: number) => {
 *     const pixels = new ArrayBuffer(size);
 *     return withTransfer(pixels, [pixels]); // moved, not copied
 *   },
 * };
 * ```
 *
 * THE TRANSFERRED OBJECT IS NEUTERED IN THE SENDER. This is the single most surprising thing about the
 * whole API and it is not a bug: transfer is a MOVE. Once posted, the worker's own `pixels` has
 * `byteLength === 0` and any read of it throws — the memory now belongs to the receiving thread. So
 * transfer only a buffer you are done with, and never one you also returned a view over or kept in a
 * cache. The payoff is that a 100 MB buffer costs a pointer hand-off instead of a 100 MB copy, which for
 * a large payload is the difference between a frame and a stall.
 *
 * The same neutering hits the CALLER when transferring into the worker via `callWith({ transfer })`: after
 * that call the caller's `ArrayBuffer` is the empty one.
 */
export function withTransfer<TValue>(value: TValue, transfer: ReadonlyArray<Transferable>): WorkerTransfer<TValue> {
  return { [WorkerTransferMarker]: true, value, transfer };
}

/** Recognizes the wrapper so the host can strip it before replying. */
function isWorkerTransfer(value: unknown): value is WorkerTransfer<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  return (value as Partial<WorkerTransfer<unknown>>)[WorkerTransferMarker] === true;
}

/** Probes `globalThis` for a usable worker scope, yielding `null` on the main thread and under SSR. */
function resolveDefaultScope(): WorkerScope | null {
  const candidate = globalThis as unknown as Partial<WorkerScope>;
  return typeof candidate.addEventListener === 'function' &&
    typeof candidate.removeEventListener === 'function' &&
    typeof candidate.postMessage === 'function'
    ? (candidate as WorkerScope)
    : null;
}

/**
 * Registers `handlers` as the worker's RPC surface and returns a disposer that unregisters them.
 *
 * Dispatch is by method name; an unknown method rejects that one call rather than killing the worker. A
 * handler may be sync or async — the result is awaited either way — and may wrap its return value in
 * {@link withTransfer} to move a large buffer instead of copying it.
 *
 * Never throws, including when there is no worker scope (main thread, SSR), where it registers nothing and
 * the returned disposer is a no-op.
 */
export function exposeWorkerApi<THandlers extends WorkerHandlerMap>(
  handlers: THandlers,
  scope: WorkerScope | null = resolveDefaultScope(),
): () => void {
  if (scope === null) return () => undefined;
  const target = scope;
  let disposed = false;

  /** Runs one request to completion and posts exactly one reply. */
  async function dispatch(event: MessageEvent): Promise<void> {
    const request: unknown = event.data;
    // Not our envelope — the pipe is shared, so stay silent rather than answering a message we do not own.
    if (disposed || !isWorkerRequestMessage(request)) return;

    try {
      // OWN properties only. A bare `handlers[method]` walks the prototype chain, so a request for
      // `toString` / `valueOf` / `constructor` finds a real function and would be dispatched — answering
      // `'[object Object]'` to a method the worker never exposed, or invoking `Object`. The method name
      // arrives from another thread and is untrusted input; the surface is exactly what the map declares.
      const handler = Object.prototype.hasOwnProperty.call(handlers, request.method)
        ? handlers[request.method]
        : undefined;
      if (typeof handler !== 'function') throw new Error(`Unknown worker method \`${request.method}\``);

      // The handler map's `never[]` parameters make it unassignable at a call site by construction — the
      // wire is untyped, so the arguments are trusted here and checked by `TApi` on the client.
      const invoke = handler as (...args: ReadonlyArray<unknown>) => unknown;
      const outcome: unknown = await invoke(...request.args);

      if (disposed) return;
      const value = isWorkerTransfer(outcome) ? outcome.value : outcome;
      const transfer = isWorkerTransfer(outcome) ? [...outcome.transfer] : undefined;

      // This `postMessage` is inside the try on purpose. It throws when the result will not structured-clone
      // (a function, a DOM node, a class instance carrying methods) or when a transferred object is already
      // detached — and the caller's pending entry outlives that throw, so the failure below is what releases
      // it. Without this, such a call hangs until its deadline, or forever when it has none.
      target.postMessage(createSuccessMessage(request.id, value), transfer);
    } catch (error) {
      if (disposed) return;
      try {
        target.postMessage(createFailureMessage(request.id, serializeError(error)));
      } catch {
        /* A terminated or unusable reply channel cannot receive a failure either. */
      }
    }
  }

  /** Bridges the sync listener signature to the async dispatcher; `dispatch` never rejects, so nothing escapes. */
  function listener(event: MessageEvent): void {
    void dispatch(event);
  }

  target.addEventListener('message', listener);
  return () => {
    disposed = true;
    target.removeEventListener('message', listener);
  };
}
