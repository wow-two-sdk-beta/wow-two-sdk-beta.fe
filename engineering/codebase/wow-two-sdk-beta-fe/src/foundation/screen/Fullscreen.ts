import { toError } from '../errors';

import { getDocument, isFunction, readMember } from './ScreenEnvironment';
import type { ScreenFailure, ScreenRequestResult } from './ScreenOutcome';

/** Matches how browsers word an activation failure — checked before the error's type, which browsers vary on. */
const GestureRejectionPattern = /user (?:gesture|activation)|transient activation|user-activation/i;

/** A fullscreen request or exit. Safari's prefixed form returns `undefined` rather than a promise. */
type FullscreenCall = (this: unknown) => Promise<void> | void;

/** Classifies explicit platform evidence; ambiguous TypeError failures retain their diagnostics. */
function classifyFullscreenRejection(cause: unknown): ScreenFailure {
  const error = toError(cause);

  if (GestureRejectionPattern.test(error.message)) return { status: 'requires-gesture', error };
  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return { status: 'denied', error };

  return { status: 'failed', error };
}

/** Picks the standard member off `source`, falling back to its WebKit-prefixed twin. */
function pickPrefixed(source: unknown, standard: string, prefixed: string): FullscreenCall | undefined {
  const method = readMember(source, standard) ?? readMember(source, prefixed);
  return isFunction(method) ? (method as FullscreenCall) : undefined;
}

/**
 * The element currently presented fullscreen, or `null` when nothing is.
 *
 * Reads the standard `document.fullscreenElement` first and Safari's `webkitFullscreenElement` second. Returns
 * `null` under SSR.
 *
 * @returns The fullscreen element, or `null`.
 */
export function getFullscreenElement(): Element | null {
  const doc = getDocument();
  if (doc === undefined) return null;

  const standard = readMember(doc, 'fullscreenElement');
  if (standard !== null && standard !== undefined) return standard as Element;

  const prefixed = readMember(doc, 'webkitFullscreenElement');
  if (prefixed !== null && prefixed !== undefined) return prefixed as Element;

  return null;
}

/**
 * Whether anything is currently presented fullscreen.
 *
 * A point-in-time read, not a subscription — `useFullscreen` is the reactive form. Returns `false` under SSR.
 *
 * @returns `true` when a fullscreen element is present.
 */
export function isFullscreen(): boolean {
  return getFullscreenElement() !== null;
}

/**
 * Whether the Fullscreen API is present at all.
 *
 * Answers presence, not permission: an iframe lacking `allow="fullscreen"` still reports `true` here, and its
 * request resolves to a non-`ok` status instead. Returns `false` under SSR. See this file's header for why
 * `document.fullscreenEnabled` is not consulted.
 *
 * @returns `true` when a fullscreen request could be attempted.
 */
export function isFullscreenSupported(): boolean {
  const doc = getDocument();
  if (doc === undefined) return false;

  const root = readMember(doc, 'documentElement');
  return isFunction(readMember(root, 'requestFullscreen')) || isFunction(readMember(root, 'webkitRequestFullscreen'));
}

/**
 * Presents `element` fullscreen, defaulting to the document root.
 *
 * Call while transient user activation remains active. Failure diagnostics distinguish an explicit
 * activation rejection from permission refusals and ambiguous platform errors.
 *
 * Never throws, never rejects.
 *
 * @param element The element to present. Defaults to `document.documentElement`.
 * @returns `ok` once the platform accepts the request, or the classified failure.
 */
export async function enterFullscreen(element?: Element): Promise<ScreenRequestResult> {
  const doc = getDocument();
  if (doc === undefined) return { ok: false, failure: { status: 'unsupported' } };

  const target = element ?? (readMember(doc, 'documentElement') as Element | null | undefined);
  if (target === null || target === undefined) return { ok: false, failure: { status: 'unsupported' } };

  const request = pickPrefixed(target, 'requestFullscreen', 'webkitRequestFullscreen');
  if (request === undefined) return { ok: false, failure: { status: 'unsupported' } };

  try {
    // `await` on Safari's `undefined` return is a no-op, which is exactly the intended "already done" semantic.
    await request.call(target);
    return { ok: true, value: undefined };
  } catch (error) {
    return { ok: false, failure: classifyFullscreenRejection(error) };
  }
}

/**
 * Leaves fullscreen.
 *
 * Idempotent: exiting when nothing is fullscreen resolves to `ok` rather than surfacing the `TypeError` browsers
 * reject that call with. A caller unwinding its own state should not have to check first.
 *
 * Never throws, never rejects.
 *
 * @returns `ok` once the document is out of fullscreen, or the classified failure.
 */
export async function exitFullscreen(): Promise<ScreenRequestResult> {
  const doc = getDocument();
  if (doc === undefined) return { ok: false, failure: { status: 'unsupported' } };

  const exit = pickPrefixed(doc, 'exitFullscreen', 'webkitExitFullscreen');
  if (exit === undefined) return { ok: false, failure: { status: 'unsupported' } };

  if (getFullscreenElement() === null) return { ok: true, value: undefined };

  try {
    await exit.call(doc);
    return { ok: true, value: undefined };
  } catch (error) {
    return { ok: false, failure: classifyFullscreenRejection(error) };
  }
}

/**
 * Exits fullscreen when something is presented, enters with `element` otherwise.
 *
 * Inherits {@link enterFullscreen}'s gesture requirement on the entering leg. Never throws, never rejects.
 *
 * @param element The element to present when entering. Defaults to `document.documentElement`.
 * @returns The result of whichever leg ran.
 */
export function toggleFullscreen(element?: Element): Promise<ScreenRequestResult> {
  return isFullscreen() ? exitFullscreen() : enterFullscreen(element);
}

/**
 * Subscribes `listener` to fullscreen transitions, returning an unsubscribe.
 *
 * Listens on both `fullscreenchange` and `webkitfullscreenchange`, so a browser on either spelling is covered.
 * A browser firing both invokes `listener` twice per transition — harmless for the snapshot reads this exists to
 * drive, but do not use it to count transitions.
 *
 * Returns a no-op unsubscribe under SSR, so a caller never needs to branch on the environment.
 *
 * @param listener Invoked after every fullscreen transition.
 * @returns A function that removes both listeners.
 */
export function onFullscreenChange(listener: () => void): () => void {
  const doc = getDocument();
  if (doc === undefined || !isFunction(readMember(doc, 'addEventListener'))) {
    return () => {
      // No DOM to unsubscribe from. A no-op keeps the caller's teardown path uniform.
    };
  }

  const handler = (): void => {
    listener();
  };

  doc.addEventListener('fullscreenchange', handler);
  doc.addEventListener('webkitfullscreenchange', handler);

  return () => {
    doc.removeEventListener('fullscreenchange', handler);
    doc.removeEventListener('webkitfullscreenchange', handler);
  };
}
