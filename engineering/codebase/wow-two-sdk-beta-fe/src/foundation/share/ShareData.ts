/**
 * A Web Share payload — a structural mirror of the browser's `ShareData` dictionary. Every member is optional,
 * but the platform rejects a payload with none of them set.
 */
export interface ShareData {
  /** Title of the shared content. Targets may ignore it — many render `text` / `url` only. */
  readonly title?: string;

  /** Body text of the share. */
  readonly text?: string;

  /** URL of the shared content — the member most targets render, and the one the clipboard fallback prefers. */
  readonly url?: string;

  /** Files to share. Support is far narrower than the rest of the payload — always gate on `canShare`. */
  readonly files?: ReadonlyArray<File>;
}

/**
 * The mutable, defined-keys-only object handed to `navigator.share` / `navigator.canShare`. Exported for the
 * sibling modules (and for declaration emit) but deliberately absent from the barrel — callers pass
 * {@link ShareData}.
 */
export interface NativeSharePayload {
  /** See {@link ShareData.title}. */
  title?: string;

  /** See {@link ShareData.text}. */
  text?: string;

  /** See {@link ShareData.url}. */
  url?: string;

  /** See {@link ShareData.files} — copied into a mutable array, which is what the DOM dictionary requires. */
  files?: File[];
}

/**
 * Copies a {@link ShareData} into the mutable payload the native API accepts, omitting members the caller left
 * unset. Pure; never throws.
 */
export function toNativeSharePayload(data: ShareData): NativeSharePayload {
  const payload: NativeSharePayload = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.text !== undefined) payload.text = data.text;
  if (data.url !== undefined) payload.url = data.url;
  if (data.files !== undefined) payload.files = [...data.files];
  return payload;
}

/**
 * Picks the one string that best represents a payload as plain text — `url`, else `text`, else `title` — for the
 * clipboard fallback.
 *
 * Blank / whitespace-only members are skipped: copying `''` would report a successful share while putting
 * nothing on the user's clipboard (and clobbering what was there). Returns `undefined` when nothing is copyable,
 * which is the files-only payload. Pure; never throws.
 */
export function shareFallbackText(data: ShareData): string | undefined {
  for (const candidate of [data.url, data.text, data.title]) {
    if (candidate !== undefined && candidate.trim() !== '') return candidate;
  }
  return undefined;
}
