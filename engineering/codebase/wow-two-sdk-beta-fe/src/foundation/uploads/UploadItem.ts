// The item contract — the vocabulary the queue, the composable, and any UI row all speak. Split from the queue so a
// consumer can type a prop (`item: UploadItem<MyResponse>`) without importing the store.
//
// Non-obvious decisions:
// - `status` is a const-object union, not a TS `enum` — matches `BackoffStrategy` / `CommandRunOutcome` and stays
//   erasable under `isolatedModules` + `verbatimModuleSyntax`.
// - An item is IMMUTABLE: the queue replaces the whole object on every change rather than mutating in place, so a
//   UI row can key on item identity and a listener can diff snapshots. Nothing here is ever written twice.
// - A file rejected up front (wrong type / too big) still becomes an item — status `failed` plus a `rejection`
//   reason. Dropping it silently would leave the user staring at a picker that "did nothing"; making it an item
//   means the same list renders the reason. `rejection` is what separates "never attempted" from "the transport
//   failed", which is why `retry()` refuses the former: a 20 MB file stays 20 MB no matter how often it is sent.
// - `attempt` counts attempts STARTED over the item's lifetime, not retries: `0` while queued, `1` on the first
//   upload, `2` after one retry. A manual `retry()` continues the count rather than resetting it, so the number
//   always answers "how many times has this file been put on the wire".

/** Defines the lifecycle state of a queued upload. */
export const UploadStatus = {
  /** Refers to an accepted file waiting for a free concurrency slot. */
  Queued: 'queued',
  /** Refers to an upload on the wire — including the backoff wait between retries, which still holds its slot. */
  Uploading: 'uploading',
  /** Refers to an upload the transport completed; `result` carries its value. */
  Succeeded: 'succeeded',
  /** Refers to an upload that exhausted its retries, or a file rejected before it was ever sent (see `rejection`). */
  Failed: 'failed',
  /** Refers to an upload aborted by `cancel` / `cancelAll` / `clear`. Never retried automatically. */
  Cancelled: 'cancelled',
} as const;

export type UploadStatus = (typeof UploadStatus)[keyof typeof UploadStatus];

/** Defines why a file was rejected before any upload attempt — set on `rejection`, never on a transport failure. */
export const UploadRejectionReason = {
  /** Refers to a file that failed the queue's `accept` list. */
  Type: 'type',
  /** Refers to a file larger than the queue's `maxSize`. */
  Size: 'size',
} as const;

export type UploadRejectionReason = (typeof UploadRejectionReason)[keyof typeof UploadRejectionReason];

/** Describes one file's journey through the queue. Immutable — the queue swaps the object rather than mutating it. */
export interface UploadItem<TResult = unknown> {
  /** The stable id assigned at `add`; the handle every queue action takes. Survives retries and status changes. */
  readonly id: string;

  /** The file being uploaded. Identity is preserved across retries. */
  readonly file: File;

  /** The current lifecycle state. */
  readonly status: UploadStatus;

  /** Upload progress as a fraction `0`–`1`, normalized against `file.size` (see `bytesUploaded`). */
  readonly progress: number;

  /** Bytes of `file` uploaded so far. Resets to `0` at the start of each attempt — a retry re-sends from scratch. */
  readonly bytesUploaded: number;

  /** How many attempts have been STARTED: `0` while queued, `1` on the first upload, `2` after one retry. */
  readonly attempt: number;

  /** The normalized failure (via `foundation/errors`' `toError`) for a `failed` item; absent otherwise. */
  readonly error?: Error;

  /** Why the file was rejected up front. Present only on a `failed` item never sent — a retry cannot help it. */
  readonly rejection?: UploadRejectionReason;

  /** The transport's return value for a `succeeded` item; absent otherwise. */
  readonly result?: TResult;
}

/** Checks whether a status is terminal — the queue will not move it again on its own. */
export function isUploadTerminal(status: UploadStatus): boolean {
  return status === UploadStatus.Succeeded || status === UploadStatus.Failed || status === UploadStatus.Cancelled;
}

/** Checks whether an item currently holds a concurrency slot (on the wire, or waiting out a retry backoff). */
export function isUploadActive(status: UploadStatus): boolean {
  return status === UploadStatus.Uploading;
}
