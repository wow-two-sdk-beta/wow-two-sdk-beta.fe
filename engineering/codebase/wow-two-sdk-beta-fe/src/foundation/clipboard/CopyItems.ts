import {
  reportClipboardOutcome,
  toClipboardFailure,
  type ClipboardCopyOptions,
  type ClipboardWriteResult,
} from './ClipboardResult';
import { clipboardItemConstructor, clipboardMethod } from './ClipboardSupport';
import { withLegacyFallback } from './LegacyCopy';

/**
 * The representations of one clipboard entry, keyed by MIME type.
 *
 * A `string` value is wrapped in a `Blob` of that same type before it reaches the platform. Engines accept only
 * a small set of types — `text/plain`, `text/html`, `image/png` are the portable ones; anything else may be
 * refused with a `failed` result.
 *
 * @example
 * copyItems({ 'text/plain': 'Total: 42', 'text/html': '<b>Total:</b> 42' });
 */
export type ClipboardWriteItems = Readonly<Record<string, Blob | string>>;

/** The MIME type a blob with no type of its own is written under — deliberately generic, and often refused. */
const FallbackMimeType = 'application/octet-stream';

/** The representation the legacy path can degrade to. */
const PlainTextMimeType = 'text/plain';

/** Pulls the plain-text arm out, for the legacy fallback only. `undefined` unless it is a literal string. */
function plainTextArm(items: ClipboardWriteItems): string | undefined {
  try {
    const value = items[PlainTextMimeType];
    return typeof value === 'string' ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Normalizes every representation to a `Blob` typed with its own key. Throws only if `Blob` itself does. */
function toBlobRecord(items: ClipboardWriteItems): Record<string, Blob> {
  const record: Record<string, Blob> = {};
  for (const [type, value] of Object.entries(items)) {
    record[type] = typeof value === 'string' ? new Blob([value], { type }) : value;
  }
  return record;
}

/** Runs the Clipboard API multi-format write, mapping every outcome onto the result union. Never throws. */
async function writeItemsThroughApi(items: ClipboardWriteItems): Promise<ClipboardWriteResult> {
  const write = clipboardMethod('write');
  const ClipboardItemConstructor = clipboardItemConstructor();
  if (write === undefined || ClipboardItemConstructor === undefined)
    return { ok: false, failure: { status: 'unsupported' } };

  try {
    await write([new ClipboardItemConstructor(toBlobRecord(items))]);
    return { ok: true, value: undefined };
  } catch (error) {
    return { ok: false, failure: toClipboardFailure(error) };
  }
}

/**
 * Writes several representations of one payload to the clipboard in a single entry, so the paste target can pick
 * the richest format it understands.
 *
 * Needs `navigator.clipboard.write` and a `ClipboardItem` constructor — strictly newer than the `writeText`
 * behind `copyText`, so `unsupported` is more likely here. With `legacyFallback: true` an unsupported or refused
 * write degrades to the `text/plain` arm alone, and only when that arm is a literal string.
 *
 * Call it from a user gesture. Never throws, never rejects.
 *
 * @param items The representations, keyed by MIME type. An empty object resolves to `failed` — a write with no
 *   payload is a caller mistake, and reporting it as `copied` would claim something reached the clipboard.
 * @param options Error reporting and the legacy-fallback opt-in.
 */
export async function copyItems(
  items: ClipboardWriteItems,
  options?: ClipboardCopyOptions,
): Promise<ClipboardWriteResult> {
  try {
    if (typeof items !== 'object' || items === null) {
      return reportClipboardOutcome(
        {
          ok: false,
          failure: { status: 'failed', error: new TypeError('copyItems expects an object keyed by MIME type.') },
        } as const,
        options?.onError,
      );
    }

    if (Object.keys(items).length === 0) {
      return reportClipboardOutcome(
        {
          ok: false,
          failure: { status: 'failed', error: new Error('copyItems was given no representations to write.') },
        } as const,
        options?.onError,
      );
    }

    const result = withLegacyFallback(await writeItemsThroughApi(items), plainTextArm(items), options);
    return reportClipboardOutcome(result, options?.onError);
  } catch (error) {
    return reportClipboardOutcome({ ok: false, failure: toClipboardFailure(error) }, options?.onError);
  }
}

/**
 * Writes a single binary payload — a generated image, a canvas export, a downloaded file — to the clipboard.
 *
 * The single-format case of {@link copyItems}, and subject to the same support: it needs
 * `navigator.clipboard.write`, and the legacy fallback cannot serve it (`execCommand` writes text only).
 *
 * Engines accept a narrow set of types for binary payloads; `image/png` is the portable one. A type the platform
 * refuses comes back `failed`.
 *
 * Never throws, never rejects.
 *
 * @param blob The payload.
 * @param mimeType The type to write it under. Defaults to the blob's own `type`, then to
 *   `application/octet-stream` — which most engines refuse, so pass a real type for a typeless blob.
 * @param options Error reporting. `legacyFallback` has no effect here.
 */
export async function copyBlob(
  blob: Blob,
  mimeType?: string,
  options?: ClipboardCopyOptions,
): Promise<ClipboardWriteResult> {
  try {
    if (typeof blob !== 'object' || blob === null) {
      return reportClipboardOutcome(
        { ok: false, failure: { status: 'failed', error: new TypeError('copyBlob expects a Blob.') } } as const,
        options?.onError,
      );
    }

    const ownType: unknown = (blob as { type?: unknown }).type;
    const type = mimeType ?? (typeof ownType === 'string' && ownType.length > 0 ? ownType : FallbackMimeType);

    return await copyItems({ [type]: blob }, options);
  } catch (error) {
    return reportClipboardOutcome({ ok: false, failure: toClipboardFailure(error) }, options?.onError);
  }
}
