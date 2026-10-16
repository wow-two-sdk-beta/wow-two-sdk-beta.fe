// Client-side "save as" — the object-URL + synthetic-anchor dance, done once and correctly. The easy leak here is
// a forgotten `revokeObjectURL`, which pins the whole blob in memory for the page's lifetime; every helper below
// revokes on the next tick (after the click has been dispatched). SSR-safe: with no `document`, each is a no-op,
// since a download is only ever user-initiated.

import { LosslessJson } from '../json';
import { safeFileName } from './FileName';

/** Whether a DOM is present to drive the download (false during SSR / node). */
function hasDocument(): boolean {
  return typeof document !== 'undefined';
}

/**
 * Triggers a browser download of `blob` under `filename` (sanitized via {@link safeFileName}). Creates an object
 * URL, clicks a detached anchor, then revokes the URL on the next tick so the blob is released. No-ops when
 * there is no `document`. Returns whether the download was dispatched.
 */
export function downloadBlob(blob: Blob, filename: string): boolean {
  if (!hasDocument()) return false;

  const url = URL.createObjectURL(blob);
  let anchor: HTMLAnchorElement | undefined;
  try {
    anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeFileName(filename);
    // Firefox requires a connected anchor for programmatic downloads.
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    return true;
  } finally {
    anchor?.remove();
    // Delayed cleanup also runs when preparation or dispatch throws.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Downloads a string as a file. `mimeType` defaults to UTF-8 plain text. */
export function downloadText(text: string, filename: string, mimeType = 'text/plain;charset=utf-8'): boolean {
  if (!hasDocument()) return false;
  return downloadBlob(new Blob([text], { type: mimeType }), filename);
}

/** Downloads lossless JSON (`space` defaults to 2). ExactNumber values stay numeric; unsupported values throw. */
export function downloadJson(value: unknown, filename: string, space: number = 2): boolean {
  if (!hasDocument()) return false;
  const encoded = LosslessJson.stringify(value, { space });
  if (!encoded.ok) throw new TypeError(encoded.failure.message);
  return downloadText(encoded.value, filename, 'application/json;charset=utf-8');
}
