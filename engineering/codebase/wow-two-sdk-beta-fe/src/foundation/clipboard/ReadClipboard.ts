import {
  reportClipboardOutcome,
  toClipboardFailure,
  type ClipboardReadItem,
  type ClipboardReadItemsResult,
  type ClipboardReadOptions,
  type ClipboardReadTextResult,
} from './ClipboardResult';
import { clipboardMethod } from './ClipboardSupport';

/**
 * Turns one platform `ClipboardItem` into its flat `{ type, blob }` representations.
 *
 * Each type is resolved independently and a type that fails to resolve is SKIPPED rather than failing the read:
 * a clipboard entry carrying `text/plain` plus an exotic type the engine cannot materialize should still yield
 * its text. Never throws.
 */
async function flattenItem(item: ClipboardItem): Promise<ClipboardReadItem[]> {
  const flattened: ClipboardReadItem[] = [];

  let types: ReadonlyArray<string>;
  try {
    const declared: unknown = item.types;
    if (!Array.isArray(declared)) return flattened;
    types = declared as readonly string[];
  } catch {
    return flattened;
  }

  for (const type of types) {
    if (typeof type !== 'string') continue;
    try {
      const blob = await item.getType(type);
      if (typeof blob === 'object' && blob !== null) flattened.push({ type, blob });
    } catch {
      // This representation could not be materialized. The others still can.
    }
  }

  return flattened;
}

/**
 * Reads the clipboard's plain text.
 *
 * Requires a user gesture and, in Chromium, an explicit permission prompt the user can dismiss — a dismissal is
 * `denied`. Resolves to `unsupported` when the runtime lacks the method, including under SSR.
 *
 * Prefer `getPasteItems` on a `paste` event wherever the flow is "the user pastes something": that path needs no
 * permission and works everywhere.
 *
 * Never throws, never rejects.
 *
 * @param options Error reporting.
 */
export async function readText(options?: ClipboardReadOptions): Promise<ClipboardReadTextResult> {
  try {
    const read = clipboardMethod('readText');
    if (read === undefined) return { ok: false, failure: { status: 'unsupported' } };

    const text = await read();
    return typeof text === 'string'
      ? { ok: true, value: text }
      : reportClipboardOutcome(
          {
            ok: false,
            failure: {
              status: 'failed',
              error: new TypeError('navigator.clipboard.readText resolved with a non-string.'),
            },
          } as const,
          options?.onError,
        );
  } catch (error) {
    return reportClipboardOutcome({ ok: false, failure: toClipboardFailure(error) }, options?.onError);
  }
}

/**
 * Reads every representation currently on the clipboard — the multi-format counterpart of {@link readText}, and
 * the only way to pull a copied image.
 *
 * Same gating as {@link readText}, and narrower support still: `navigator.clipboard.read` postdates `readText`
 * in every engine that has it. Representations the platform cannot materialize are dropped from the result
 * rather than failing the whole read.
 *
 * Never throws, never rejects.
 *
 * @param options Error reporting.
 */
export async function readItems(options?: ClipboardReadOptions): Promise<ClipboardReadItemsResult> {
  try {
    const read = clipboardMethod('read');
    if (read === undefined) return { ok: false, failure: { status: 'unsupported' } };

    const raw: unknown = await read();
    if (!Array.isArray(raw)) {
      return reportClipboardOutcome(
        {
          ok: false,
          failure: { status: 'failed', error: new TypeError('navigator.clipboard.read resolved with a non-array.') },
        } as const,
        options?.onError,
      );
    }

    const items: ClipboardReadItem[] = [];
    for (const entry of raw as readonly ClipboardItem[]) {
      if (typeof entry !== 'object' || entry === null) continue;
      items.push(...(await flattenItem(entry)));
    }

    return { ok: true, value: items };
  } catch (error) {
    return reportClipboardOutcome({ ok: false, failure: toClipboardFailure(error) }, options?.onError);
  }
}
