import type { ClipboardFailure } from './models/ClipboardFailure';
import type { Result } from '../results';

import { toError } from '../errors';
export type { ClipboardFailure } from './models/ClipboardFailure';
export type { ClipboardWriteResult } from './models/ClipboardWriteResult';

/** The `status` discriminant of a {@link ClipboardWriteResult} — for a consumer's own switch or status→copy map. */
export type ClipboardWriteStatus = 'copied' | ClipboardFailure['status'];

/** One MIME-typed payload read off the system clipboard. */
export interface ClipboardReadItem {
  /** The MIME type the platform reported — `text/plain`, `text/html`, `image/png`, … */
  readonly type: string;

  /** The payload itself. Read it with `blob.text()` for textual types, or hand it to `URL.createObjectURL`. */
  readonly blob: Blob;
}
export type { ClipboardReadTextResult } from './models/ClipboardReadTextResult';
export type { ClipboardReadItemsResult } from './models/ClipboardReadItemsResult';

/** The `status` discriminant shared by both read results. */
export type ClipboardReadStatus = 'read' | ClipboardFailure['status'];

/** Tunes a clipboard read. */
export interface ClipboardReadOptions {
  /**
   * Called with the normalized error on a `denied` or `failed` result — the seam for a toast or telemetry hook.
   * Never called for `unsupported`, which is a capability fact rather than a failure. A throw from this callback
   * is swallowed. Called at most once per operation, on the final result.
   */
  readonly onError?: (error: Error) => void;
}

/** Tunes a clipboard write. */
export interface ClipboardCopyOptions extends ClipboardReadOptions {
  /**
   * Whether a write the Clipboard API cannot complete retries through the deprecated
   * `document.execCommand('copy')` path. Defaults to `false`.
   *
   * Opt in for reach — older Safari and any non-secure context have no `navigator.clipboard` at all, and
   * `execCommand` is the only write available there. Leave it off to stay on standards-track APIs only. See
   * `LegacyCopy.ts` for the deprecation caveats and for exactly when the retry runs.
   */
  readonly legacyFallback?: boolean;
}

/** The shape every result family shares, so one reporter can serve every entry point. */
type ClipboardOutcome = Result<unknown, ClipboardFailure>;

/** Reads a caught value's `name` as a string. Guarded, so a throwing getter reads as absent. */
function nameOf(value: unknown): string | undefined {
  try {
    if (typeof value !== 'object' || value === null) return undefined;
    const name: unknown = (value as { name?: unknown }).name;
    return typeof name === 'string' ? name : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Checks whether a caught value is the platform refusing rather than breaking — the split behind `denied`.
 * Exported for the sibling modules; absent from the barrel, where the statuses are the answer callers want.
 *
 * @param value The caught value.
 */
export function isPermissionRefusal(value: unknown): boolean {
  const name = nameOf(value);
  return name === 'NotAllowedError' || name === 'SecurityError';
}

/**
 * Turns a caught value into the `denied` or `failed` arm it belongs in. Serves reads and writes alike — the
 * returned {@link ClipboardFailure} is assignable to every result union in the slice. Exported for the sibling
 * modules; absent from the barrel. Never throws: `toError` is total.
 *
 * @param error The caught value.
 */
export function toClipboardFailure(error: unknown): ClipboardFailure {
  const failure = toError(error);
  return isPermissionRefusal(error) ? { status: 'denied', error: failure } : { status: 'failed', error: failure };
}

/**
 * Hands a consumer's callback the failure carried by `result`, absorbing a throw from the callback itself. A
 * reporter that throws must not convert a typed result into an unhandled rejection.
 *
 * Called once per entry point, on the FINAL result — so a write that degrades through the legacy fallback
 * reports the outcome the caller receives, not each intermediate attempt. Exported for the sibling modules;
 * absent from the barrel.
 *
 * @param result The outcome about to be returned.
 * @param onError The consumer's reporter, if they supplied one.
 * @returns `result`, unchanged — so a call site can `return reportClipboardOutcome(...)`.
 */
export function reportClipboardOutcome<TResult extends ClipboardOutcome>(
  result: TResult,
  onError: ((error: Error) => void) | undefined,
): TResult {
  if (onError === undefined) return result;
  if (result.ok || !('error' in result.failure)) return result;

  try {
    onError(result.failure.error);
  } catch {
    // The consumer's own reporter failed. There is nothing useful left to do with that — the result still
    // reaches the caller, which is the guarantee that matters.
  }
  return result;
}
