import { AriaAttribute } from '../dom';
import { toClipboardFailure, type ClipboardCopyOptions, type ClipboardWriteResult } from './ClipboardResult';
import { canLegacyCopy } from './ClipboardSupport';

/** Off-screen but laid out — selection requires a rendered element, so `display: none` would copy nothing. */
const HiddenTextareaCss =
  'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;margin:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0;pointer-events:none;';

/**
 * The element the temporary textarea mounts in: the trigger's (else the focused element's) open dialog when there is
 * one, else the body.
 * A modal's focus trap pulls focus back from anything mounted outside it, which would empty the selection before
 * `execCommand` reads it — so inside a dialog the textarea has to live there too.
 */
function mountPoint(active: Element | null): HTMLElement {
  try {
    const dialog = active?.closest('dialog[open], [role="dialog"], [role="alertdialog"]');
    if (dialog instanceof HTMLElement) return dialog;
  } catch {
    // `closest` is missing on a stand-in, or the selector is refused. The body is always a valid mount point.
  }
  return document.body;
}

/** Captures the user's current selection ranges so the copy does not clobber them. Never throws. */
function saveSelection(): Range[] {
  try {
    const selection = document.getSelection();
    if (selection === null) return [];
    return Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index));
  } catch {
    return [];
  }
}

/** Puts the captured ranges back. Guarded — the nodes they held may be gone. */
function restoreSelection(ranges: readonly Range[]): void {
  try {
    const selection = document.getSelection();
    if (selection === null) return;
    selection.removeAllRanges();
    for (const range of ranges) selection.addRange(range);
  } catch {
    // The selection is cosmetic next to a completed copy.
  }
}

/** Restores focus to whatever held it before the textarea took it. Guarded — a stand-in may have no `focus`. */
function restoreFocus(previous: Element | null): void {
  try {
    if (previous === null) return;
    const focus = (previous as { focus?: unknown }).focus;
    if (typeof focus !== 'function') return;
    (previous as HTMLElement).focus({ preventScroll: true });
  } catch {
    // The previously focused element is gone or refuses focus. Not worth failing a completed copy over.
  }
}

/** Detaches the temporary textarea, preferring `remove()` and falling back to the parent. Never throws. */
function detach(element: HTMLTextAreaElement): void {
  try {
    if (typeof element.remove === 'function') {
      element.remove();
      return;
    }
    element.parentNode?.removeChild(element);
  } catch {
    // Nothing further to try. The failure to detach must not mask the copy's own result.
  }
}

/**
 * Copies `text` through the deprecated `document.execCommand('copy')` path.
 *
 * Synchronous, unlike every other write in this slice — `execCommand` is. Requires a user gesture: outside one
 * the command reports its own refusal by returning `false`, which surfaces here as `failed` (the legacy API has
 * no way to say "denied" specifically). Returns `unsupported` under SSR or where `execCommand` is gone.
 *
 * Exported for the sibling modules and for a consumer that wants the legacy path explicitly; the temporary
 * element is removed on every path, including a throw from `execCommand` itself. It mounts inside the focused
 * element's open dialog, so a modal's focus trap does not empty the selection, and it restores the user's own
 * selection and focus afterwards.
 *
 * Never throws.
 *
 * @param text The text to place on the clipboard.
 * @param anchor The element the copy was triggered from; the textarea mounts in its open dialog. Defaults to the
 *   focused element.
 * @deprecated Prefer `copyText`, which uses the Clipboard API and falls back here only on `legacyFallback: true`.
 */
export function legacyCopyText(text: string, anchor?: Element | null): ClipboardWriteResult {
  if (!canLegacyCopy()) return { ok: false, failure: { status: 'unsupported' } };

  let element: HTMLTextAreaElement | undefined;
  let previouslyFocused: Element | null = null;
  let previousSelection: Range[] = [];

  try {
    const body: unknown = document.body;
    if (typeof body !== 'object' || body === null) return { ok: false, failure: { status: 'unsupported' } };

    previouslyFocused = document.activeElement;
    previousSelection = saveSelection();

    element = document.createElement('textarea');
    element.value = text;
    element.setAttribute(AriaAttribute.Hidden, 'true');
    element.setAttribute('tabindex', '-1');
    element.setAttribute('readonly', 'readonly');
    element.style.cssText = HiddenTextareaCss;

    mountPoint(anchor ?? previouslyFocused).appendChild(element);

    element.focus({ preventScroll: true });
    element.select();
    element.setSelectionRange(0, text.length);

    const copied = document.execCommand('copy');
    return copied
      ? { ok: true, value: undefined }
      : {
          ok: false,
          failure: { status: 'failed', error: new Error('document.execCommand("copy") reported failure.') },
        };
  } catch (error) {
    return { ok: false, failure: toClipboardFailure(error) };
  } finally {
    if (element !== undefined) detach(element);
    restoreSelection(previousSelection);
    restoreFocus(previouslyFocused);
  }
}

/**
 * Retries a write that the Clipboard API could not complete through the legacy path, when the caller opted in.
 *
 * The retry runs whenever `modern` is not `copied` — not only on `unsupported`. A `denied` from
 * `navigator.clipboard` is exactly the case `execCommand` can still serve: the legacy command is gated on the
 * user gesture the call already sits in, not on the Clipboard API's permission.
 *
 * Which result wins:
 *  - the legacy attempt, when it copied — a success outranks any diagnosis;
 *  - otherwise `modern`, when the Clipboard API was actually present (its `denied` / `failed` is the more
 *    specific account of what went wrong);
 *  - otherwise the legacy attempt's own result — with no Clipboard API at all, `modern` is a bare `unsupported`
 *    and the legacy failure says more.
 *
 * Exported for the sibling write modules; absent from the barrel. Never throws.
 *
 * @param modern The result the Clipboard API path produced.
 * @param text The plain-text payload, or `undefined` when the write has no text arm to degrade to.
 * @param options The caller's options — the retry runs only on `legacyFallback: true`.
 */
export function withLegacyFallback(
  modern: ClipboardWriteResult,
  text: string | undefined,
  options: ClipboardCopyOptions | undefined,
): ClipboardWriteResult {
  if (modern.ok) return modern;
  if (options?.legacyFallback !== true) return modern;
  if (text === undefined) return modern;

  const legacy = legacyCopyText(text, options.anchor);
  if (legacy.ok) return legacy;
  return modern.failure.status === 'unsupported' ? legacy : modern;
}
