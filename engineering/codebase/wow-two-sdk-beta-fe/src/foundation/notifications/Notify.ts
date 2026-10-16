import type { NotificationShowResult } from './models/NotificationShowResult';
import type { NotificationFailure } from './models/NotificationFailure';

import { toError } from '../errors';

import { getNotificationPermission } from './NotificationPermission';
export type { NotificationFailure } from './models/NotificationFailure';
export type { NotificationShowResult } from './models/NotificationShowResult';
export type NotifyStatus = 'shown' | NotificationFailure['status'];

/** Tunes a notification. Every member is optional; a bare `notify(title)` is valid. */
export interface NotifyOptions {
  /** Body text rendered under the title. */
  readonly body?: string;

  /** URL of an image to show as the notification's icon. */
  readonly icon?: string;

  /**
   * Groups notifications: a new one carrying a `tag` replaces the visible one with the same `tag` instead of
   * stacking. The way to update a progress or unread-count notification without spamming the OS.
   */
  readonly tag?: string;

  /** Arbitrary payload carried on the notification and readable from the click handler via `notification.data`. */
  readonly data?: unknown;

  /** Suppresses sound and vibration. Some platforms require an explicit `false` to make noise at all. */
  readonly silent?: boolean;

  /** Keeps the notification on screen until the user acts on it. Honoured on desktop; widely ignored on mobile. */
  readonly requireInteraction?: boolean;

  /**
   * Closes the notification this many milliseconds after it is shown. The timer is cancelled if the
   * notification closes or is clicked first, so no pending timeout outlives it. Ignored when not a finite,
   * non-negative number, and ignored by design alongside `requireInteraction` — the two contradict each other,
   * and the platform decides which wins.
   */
  readonly autoCloseMs?: number;

  /**
   * Called when the user clicks the notification. The window is focused first — the reason a click handler is
   * wanted at all is almost always "bring me back to the app" — so this callback only has to do the routing.
   * A throw from it is swallowed. Note the notification is left open: most platforms dismiss it on click, and
   * the caller holds the handle to `close()` it where they don't.
   */
  readonly onClick?: (event: Event) => void;
}

/**
 * Copies the caller's options into the mutable, defined-keys-only dictionary the constructor accepts. Members
 * the caller left unset never reach the platform as present-but-`undefined` keys — the same discipline as
 * `foundation/share`'s `toNativeSharePayload`. `autoCloseMs` and `onClick` are ours, not the platform's, and
 * are deliberately not forwarded.
 */
function toNativeNotificationOptions(options: NotifyOptions): NotificationOptions {
  const native: NotificationOptions = {};
  if (options.body !== undefined) native.body = options.body;
  if (options.icon !== undefined) native.icon = options.icon;
  if (options.tag !== undefined) native.tag = options.tag;
  if (options.data !== undefined) native.data = options.data;
  if (options.silent !== undefined) native.silent = options.silent;
  if (options.requireInteraction !== undefined) native.requireInteraction = options.requireInteraction;
  return native;
}

/** Brings the app's window forward on a notification click. A refused focus is not an error worth raising. */
function focusWindow(): void {
  try {
    if (typeof window === 'undefined' || typeof window.focus !== 'function') return;
    window.focus();
  } catch {
    // Focus is a courtesy: a browser may refuse it without transient activation, or across origins. A refusal
    // must not turn a delivered click into an exception.
  }
}

/** Attaches a listener, tolerating a stand-in without a usable `EventTarget` surface. */
function addListener(target: Notification, type: 'click' | 'close', listener: (event: Event) => void): void {
  try {
    target.addEventListener(type, listener);
  } catch {
    // A partial implementation or test double simply gets no wiring — never a throw out of `notify`.
  }
}

/**
 * Wires the click convenience and the auto-close timer onto a freshly constructed notification.
 *
 * Guarded end-to-end, and deliberately not part of the caller's `try`: the notification is already on screen by
 * the time this runs, so a hostile `options` getter must not downgrade a `shown` result to `failed` and throw
 * away the handle. Listeners are added rather than assigned to `onclick` / `onclose`, so a consumer's own
 * handler on the returned notification survives.
 */
function wireLifecycle(notification: Notification, options: NotifyOptions): void {
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancelAutoClose = (): void => {
      if (timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
    };

    addListener(notification, 'close', cancelAutoClose);

    addListener(notification, 'click', (event) => {
      cancelAutoClose();
      focusWindow();
      const { onClick } = options;
      if (onClick === undefined) return;
      try {
        onClick(event);
      } catch {
        // The consumer's own handler failed. There is nothing useful left to do with that — and an
        // `EventTarget` would otherwise surface it as an uncaught error at the dispatch site.
      }
    });

    const { autoCloseMs } = options;
    if (typeof autoCloseMs !== 'number' || !Number.isFinite(autoCloseMs) || autoCloseMs < 0) return;

    timer = setTimeout(() => {
      timer = undefined;
      try {
        notification.close();
      } catch {
        // Closing an already-gone notification is a no-op everywhere real; a stand-in may disagree.
      }
    }, autoCloseMs);
  } catch {
    // A throwing member on the caller's `options` object. The notification stays shown and unwired.
  }
}

/**
 * Shows an OS-level notification and returns a {@link NotificationShowResult}. Never throws.
 *
 * Requires a granted permission — this call never prompts. Pair it with `getNotificationPermission` /
 * `requestNotificationPermission` (or the `useNotificationPermission` hook) and treat `denied` as "ask first",
 * not "retry".
 *
 * @param title The notification's headline. Some platforms truncate it aggressively.
 * @param options Body, icon, tag, and the {@link NotifyOptions.autoCloseMs} / {@link NotifyOptions.onClick}
 *   conveniences this module adds on top of the platform dictionary.
 */
export function notify(title: string, options?: NotifyOptions): NotificationShowResult {
  const permission = getNotificationPermission();
  if (permission === 'unsupported') return { ok: false, failure: { status: 'unsupported' } };
  if (permission !== 'granted') return { ok: false, failure: { status: 'denied' } };

  const settings = options ?? {};

  let notification: Notification;
  try {
    notification = new Notification(title, toNativeNotificationOptions(settings));
  } catch (error) {
    // Construction is where the platform vetoes: a payload it rejects, a browser that only allows notifications
    // from a service worker (mobile Chrome), a document that lost its permission mid-session.
    return { ok: false, failure: { status: 'failed', error: toError(error) } };
  }

  wireLifecycle(notification, settings);
  return { ok: true, value: notification };
}
