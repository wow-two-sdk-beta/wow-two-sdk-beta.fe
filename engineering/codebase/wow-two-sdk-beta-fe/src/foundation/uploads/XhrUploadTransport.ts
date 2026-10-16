// The one built-in transport — a multipart `POST` over `XMLHttpRequest`.
//
// WHY XHR AND NOT `fetch`: `fetch` CANNOT REPORT REQUEST-BODY PROGRESS. Its `ReadableStream` progress story
// covers the RESPONSE body only; there is no upload-side equivalent, and the streaming-request work
// (`duplex: 'half'`) is neither universally shipped nor a progress API. `XMLHttpRequest.upload` fires real
// `progress` events with `loaded` / `total` during the send, so it remains the only portable way to drive an
// upload progress bar. That single fact — not legacy inertia — is why this file exists in 2026.
//
// It is a convenience, never a dependency: `UploadQueue` knows only the `UploadTransport` interface, so a
// consumer who needs S3 multipart, tus, or a presigned PUT (and no progress bar) writes their own with `fetch`
// and loses nothing.
//
// Non-obvious decisions:
// - `Content-Type` is deliberately NOT settable through `headers`. The browser derives it from the `FormData`
//   body, including the multipart boundary; setting it by hand produces a body the server cannot parse. An
//   explicit `content-type` entry is dropped rather than silently corrupting the request.
// - Abort rejects with a plain `AbortError`-named error, not a `DOMException` subclass check: `foundation/errors`'
//   `isAbortError` matches on `name`, which holds across realms (iframe · worker) and in environments without
//   the global. `xhr.abort()` also fires `load`-adjacent events in some engines, so a `settled` latch guarantees
//   exactly one settlement.
// - The abort listener is removed on every exit path. A long-lived `AbortSignal` (one per queue item, reused
//   across a `cancelAll`) would otherwise accumulate one listener per attempt.
// - A non-2xx rejects with `UploadHttpError` carrying the status, which is what makes the queue's retry decision
//   HTTP-aware: `503` retries under the default policy, `413` stops immediately.

import { UploadHttpError, type UploadTransport, type UploadTransportContext } from './UploadTransport';

/** Configures the built-in `XMLHttpRequest` multipart transport. */
export interface XhrUploadTransportOptions {
  /** The endpoint the file is sent to. */
  readonly url: string;

  /** The HTTP method. Defaults to `POST`. */
  readonly method?: string;

  /** Extra request headers. A `Content-Type` entry is ignored — the browser owns it (multipart boundary). */
  readonly headers?: Readonly<Record<string, string>>;

  /** The multipart field name the file is sent under. Defaults to `file`. */
  readonly fieldName?: string;

  /** Whether to send cookies / TLS client certs cross-origin (`XMLHttpRequest.withCredentials`). Defaults `false`. */
  readonly withCredentials?: boolean;
}

/** Creates the `AbortError`-named rejection every cancellation path shares — recognized by `isAbortError`. */
function createAbortError(): Error {
  const error = new Error('The upload was aborted.');
  error.name = 'AbortError';
  return error;
}

/** Parses a response body: JSON when it parses, the raw string when it does not, `undefined` when empty. */
function parseResponseBody(text: string): unknown {
  if (text === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Creates an {@link UploadTransport} that sends each file as a `multipart/form-data` request over
 * `XMLHttpRequest`, forwarding real upload-progress events to the queue.
 *
 * Resolves with the parsed JSON response body (the raw text when it is not JSON, `undefined` when empty), cast
 * to `TResult` — the server's contract is the caller's to declare. Rejects with {@link UploadHttpError} on a
 * non-2xx or a network failure, and with an `AbortError` when the attempt's signal fires.
 */
export function xhrUploadTransport<TResult = unknown>(options: XhrUploadTransportOptions): UploadTransport<TResult> {
  const { url, method = 'POST', headers, fieldName = 'file', withCredentials = false } = options;

  return {
    upload(file: File, context: UploadTransportContext): Promise<TResult> {
      return new Promise<TResult>((resolve, reject) => {
        const { signal, onProgress } = context;
        if (signal.aborted) {
          reject(createAbortError());
          return;
        }

        const request = new XMLHttpRequest();
        const body = new FormData();
        body.append(fieldName, file, file.name);

        let settled = false;

        /** Settles exactly once and detaches the signal listener, whichever event won the race. */
        const settle = (action: () => void): void => {
          if (settled) return;
          settled = true;
          signal.removeEventListener('abort', onAbort);
          action();
        };

        function onAbort(): void {
          settle(() => {
            request.abort();
            reject(createAbortError());
          });
        }

        request.open(method, url, true);
        request.withCredentials = withCredentials;
        for (const [name, value] of Object.entries(headers ?? {})) {
          // Skipped, not overridden: the multipart boundary is generated with the body and cannot be restated.
          if (name.toLowerCase() === 'content-type') continue;
          request.setRequestHeader(name, value);
        }

        request.upload.addEventListener('progress', (event: ProgressEvent) => {
          onProgress(event.loaded, event.lengthComputable ? event.total : undefined);
        });

        request.addEventListener('load', () => {
          settle(() => {
            const { status, responseText } = request;
            if (status >= 200 && status < 300) {
              resolve(parseResponseBody(responseText) as TResult);
              return;
            }
            reject(new UploadHttpError(status, `Upload of "${file.name}" failed with status ${status}.`, responseText));
          });
        });

        request.addEventListener('error', () => {
          // Status `0` — the request never reached a response. The default retry policy treats it as transient.
          settle(() => reject(new UploadHttpError(0, `Upload of "${file.name}" failed: network error.`)));
        });

        request.addEventListener('timeout', () => {
          settle(() => reject(new UploadHttpError(0, `Upload of "${file.name}" timed out.`)));
        });

        request.addEventListener('abort', () => {
          settle(() => reject(createAbortError()));
        });

        signal.addEventListener('abort', onAbort, { once: true });
        try {
          request.send(body);
        } catch (error) {
          settle(() => reject(error));
        }
      });
    },
  };
}
