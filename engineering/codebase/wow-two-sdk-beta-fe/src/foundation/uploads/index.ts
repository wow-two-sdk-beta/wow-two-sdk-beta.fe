// uploads — foundation seam. A headless upload queue: admission (`accept` / `maxSize` via `foundation/files`),
// bounded concurrency, retry, cancellation, and progress aggregation, plus the Vue seam that binds it. The
// scheduler is framework-free — create a queue at module scope, in a provider, or in a plain node test.
//
// The layering that matters: this slice owns SCHEDULING, never TRANSPORT. `UploadTransport` is the seam a
// consumer implements, so S3 multipart, tus, a presigned PUT, or a test fake all drop in unchanged. One built-in
// implementation ships — `xhrUploadTransport` — because `XMLHttpRequest` remains the only portable way to observe
// request-body progress (`fetch` reports response progress only), and a progress bar is the whole point.
//
// Nothing is re-implemented here that another foundation slice already owns: retry timing is `foundation/
// resilience` (`shouldRetry` + `computeRetryDelay` — the same primitives the HTTP client and `/query` use, so an
// upload backs off exactly like every other request), accept-matching and name sanitizing are `foundation/files`,
// failure normalization and cancellation detection are `foundation/errors`, and human-readable sizes are
// `foundation/formatters`.
//
// Contract worth knowing before you wire a UI: NOTHING THROWS AT THE CALLER. A rejecting transport, a cancelled
// attempt, and a file that fails validation are all normal outcomes carried on an item's `status`, and the pool
// keeps running through all three.

// Contract — the vocabulary every other file in the slice speaks
export { UploadRejectionReason, UploadStatus, isUploadActive, isUploadTerminal, type UploadItem } from './UploadItem';

// Transport seam — what a consumer implements, and how a failure carries its HTTP status
export {
  UploadHttpError,
  readUploadErrorStatus,
  type UploadTransport,
  type UploadTransportContext,
} from './UploadTransport';

// The one built-in transport — multipart over `XMLHttpRequest`, for real upload progress
export { xhrUploadTransport, type XhrUploadTransportOptions } from './XhrUploadTransport';

// Queue — the headless scheduler
export {
  DefaultUploadConcurrency,
  createUploadQueue,
  type UploadQueue,
  type UploadQueueListener,
  type UploadQueueOptions,
  type UploadQueueState,
} from './UploadQueue';

// Vue — queue subscription primitives (explicit queue) + the component-scoped convenience
export {
  useUploadQueue,
  useUploadQueueSnapshot,
  useUploadQueueVersion,
  type UseUploadQueueControls,
} from './UseUploadQueue';
