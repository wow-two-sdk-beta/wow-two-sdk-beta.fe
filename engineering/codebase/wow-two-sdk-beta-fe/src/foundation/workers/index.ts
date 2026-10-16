// workers — foundation seam. A typed request/response RPC over `postMessage`, so offloading work to a
// thread reads like calling a method: `await client.call('add', 2, 3)`. Four pieces — `createWorkerClient`
// (main thread), `exposeWorkerApi` (worker thread), `useWorker` (Vue lifetime), and `runInWorker` (a
// one-shot function on a throwaway thread).
//
// WHY THIS EXISTS AT ALL, GIVEN `postMessage` IS TWO LINES. The raw API is fire-and-forget: you post, and
// separately a message arrives. Every consumer that wants a RESULT ends up rebuilding the same four
// things, and the same one of them wrong:
//   - correlation. Replies are not ordered against requests, so a listener-per-call resolves whichever
//     reply lands first. Two overlapping calls silently SWAP results — no throw, no stack, and it cannot
//     reproduce while you are making one call at a time. This is the defect the slice exists to prevent,
//     and `WorkerClient.ts` carries the long version of the argument.
//   - error crossing. A worker-side throw reaches the main thread as an `ErrorEvent`, not an `Error`, and
//     an `Error` posted through `postMessage` arrives with its `stack` and subclass gone. So the wire
//     carries `serializeError`'s JSON-safe projection and the client rebuilds a real `Error` with
//     `toError` — both from `foundation/errors`, the slice's only dependency.
//   - lifetime. A `Worker` is an OS thread and is NOT collected when its last reference drops. Forgetting
//     to terminate leaks a thread per mount.
//   - the leak under the leak. A call whose reply never comes holds its promise's closures forever, so
//     every exit path — reply, timeout, worker death, terminate — removes its pending entry through one
//     shared `settle`, and `pendingCount` is exposed so a test can prove it.
//
// NO `comlink`. Its ergonomics come from a `Proxy` that makes a worker look like a local object, which
// costs a peer dependency and hides where the thread boundary is. An explicit `call('method', ...)` keeps
// the boundary legible — every one of these is a structured clone — for roughly 120 lines and no peer.
//
// TRANSFERABLES ARE A MOVE, NOT A COPY, and the consequence surprises everyone once: a transferred
// `ArrayBuffer` is NEUTERED IN THE SENDER — `byteLength` becomes `0` and reads throw, because the memory
// now belongs to the other thread. Transfer into a call with `callWith({ transfer })`, out of a handler
// with `withTransfer(value, [buffer])`, and only ever with a buffer you are done with.
//
// SSR-SAFE BY CONSTRUCTION: no module here touches the `Worker` constructor at import time. `useWorker`
// creates in `onMounted` (which does not run on a server), `exposeWorkerApi` finds no worker scope on the
// main thread and registers nothing, and `runInWorker` answers `{ status: 'unsupported' }`. Probe directly
// with `isWorkerSupported` / `isBlobWorkerSupported`.

export { isWorkerSupported, isBlobWorkerSupported } from './WorkerSupport';

export {
  WorkerMessageChannel,
  isWorkerRequestMessage,
  isWorkerResponseMessage,
  createRequestMessage,
  createSuccessMessage,
  createFailureMessage,
  createRequestIdAllocator,
  type WorkerRequestMessage,
  type WorkerSuccessMessage,
  type WorkerFailureMessage,
  type WorkerResponseMessage,
} from './WorkerProtocol';

export {
  createWorkerClient,
  type WorkerApiOf,
  type WorkerClient,
  type WorkerCallOptions,
  type WorkerClientOptions,
} from './WorkerClient';

export {
  exposeWorkerApi,
  withTransfer,
  WorkerTransferMarker,
  type WorkerScope,
  type WorkerHandlerMap,
  type WorkerHandlersOf,
  type WorkerTransfer,
} from './WorkerHost';

export { useWorker, type UseWorkerControls } from './UseWorker';

export { runInWorker, type WorkerRunFailure, type WorkerRunResult, type RunInWorkerOptions } from './RunInWorker';

export { WorkerRunFailureCode } from './WorkerRunFailureCode';
