// The transport seam — the one thing this slice does NOT own. The queue solves scheduling (concurrency, retry,
// cancellation, progress aggregation); how a byte actually reaches a server is the consumer's decision, so
// `UploadTransport` is an interface they implement and `createUploadQueue` requires. Nothing in the queue
// references `fetch`, `XMLHttpRequest`, a URL, or a header — swap in S3 multipart, tus, a presigned PUT, or an
// in-memory fake without touching the scheduler. `XhrUploadTransport.ts` ships one implementation as a
// convenience, not as the contract.
//
// Non-obvious decisions:
// - `onProgress` reports the TRANSPORT's numbers (`loaded` / `total`), not the file's. A multipart body carries
//   boundary + header overhead, so `total` legitimately exceeds `file.size` and `loaded` can too. The queue
//   normalizes on the ratio; a transport must not pre-scale, it just forwards what it observes.
// - Retry eligibility is status-driven because `foundation/resilience`'s `shouldRetry` is status-driven. A
//   transport signals "this is a 413, don't bother retrying" by throwing an error with a numeric `status` —
//   `UploadHttpError` is the ready-made carrier. `readUploadErrorStatus` reads that field STRUCTURALLY, so an
//   `ApiError` from `foundation/http`, or any custom error with a `status`, interoperates without this slice
//   depending on the HTTP layer.
// - No status ⇒ `0`, which `DefaultTransientStatuses` treats as transient. A thrown `TypeError` from a dropped
//   connection is therefore retryable by default, which is the behaviour you want; a `4xx` you deliberately
//   surfaced is not.

/** Provides the per-attempt handles a transport receives — cancellation in, progress out. */
export interface UploadTransportContext {
  /** Aborts this attempt. A transport MUST honour it and reject with an `AbortError` (or let `fetch`/`xhr` do so). */
  readonly signal: AbortSignal;

  /**
   * Reports bytes sent so far. `totalBytes` is the transport's own total (multipart overhead included) and is
   * used only as the denominator — omit it when the length is not computable.
   */
  readonly onProgress: (bytesUploaded: number, totalBytes?: number) => void;
}

/** Defines how a file is sent. The single seam a consumer implements to plug any backend into the queue. */
export interface UploadTransport<TResult = unknown> {
  /**
   * Sends one file, resolving with whatever the caller wants to keep (an id, a URL, the parsed body). Reject to
   * signal failure; reject with an `AbortError` when `context.signal` fires. Called once per attempt — a retry
   * calls it again with a fresh `signal`.
   */
  readonly upload: (file: File, context: UploadTransportContext) => Promise<TResult>;
}

/**
 * Defines a transport failure that carries an HTTP status, so the queue's retry decision can respect HTTP
 * semantics (`503` retries, `413` does not). Throw this from a custom transport, or throw anything with a
 * numeric `status` — {@link readUploadErrorStatus} is structural.
 */
export class UploadHttpError extends Error {
  /** The HTTP status of the failed response (`0` when the request never got one). */
  readonly status: number;

  /** The raw response body, when the transport captured one — useful for surfacing a server-side reason. */
  readonly body?: string;

  /** Creates an error for a non-2xx (or network-level) upload response. */
  constructor(status: number, message?: string, body?: string) {
    super(message ?? `Upload failed with status ${status}`);
    this.name = 'UploadHttpError';
    this.status = status;
    if (body !== undefined) this.body = body;
  }
}

/**
 * Reads the HTTP status a caught transport failure carries, for `shouldRetry`. Returns `0` — the "network /
 * unknown" status that the default policy treats as transient — when the value has no numeric `status`.
 *
 * Structural on purpose: `UploadHttpError`, `foundation/http`'s `ApiError`, and a hand-rolled
 * `Object.assign(new Error(), { status })` all read the same, so no error class is privileged and this slice
 * stays free of an HTTP-layer import. Guarded against a throwing getter — it runs inside a `catch`.
 */
export function readUploadErrorStatus(error: unknown): number {
  if (typeof error !== 'object' || error === null) return 0;
  try {
    const status: unknown = (error as { status?: unknown }).status;
    return typeof status === 'number' && Number.isFinite(status) ? status : 0;
  } catch {
    return 0;
  }
}
