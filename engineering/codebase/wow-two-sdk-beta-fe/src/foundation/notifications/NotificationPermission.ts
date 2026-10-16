/**
 * The state of this origin's notification grant.
 *
 * - `granted` — notifications will be shown.
 * - `denied` — the user refused. The prompt will not reappear; only browser settings can undo it.
 * - `default` — not decided yet. The only state where {@link requestNotificationPermission} shows a prompt.
 * - `unsupported` — no Notification API here: SSR, a non-supporting browser, or an unreadable implementation.
 */
export const NotificationPermissionState = {
  /** Notifications will be shown. */
  Granted: 'granted',

  /** The user refused. The prompt will not reappear; only browser settings can undo it. */
  Denied: 'denied',

  /** Not decided yet — the only state where {@link requestNotificationPermission} shows a prompt. */
  Default: 'default',

  /** No Notification API here: SSR, a non-supporting browser, or an unreadable implementation. */
  Unsupported: 'unsupported',
} as const;

/** The state of this origin's notification grant. */
export type NotificationPermissionState =
  (typeof NotificationPermissionState)[keyof typeof NotificationPermissionState];

/**
 * Whether the environment exposes a constructible `Notification`. False under SSR and on non-supporting
 * browsers. Exported for the sibling modules; absent from the barrel — callers ask
 * {@link getNotificationPermission} instead, whose `unsupported` answer carries the same information.
 */
export function isNotificationSupported(): boolean {
  try {
    // `typeof` on an undeclared identifier is safe, but a defined-with-a-throwing-getter global is not — hence
    // the guard around what looks like it cannot fail.
    return typeof Notification === 'function';
  } catch {
    return false;
  }
}

/** Whether the platform's `requestPermission` static is callable at all. */
function hasRequestPermission(): boolean {
  try {
    return isNotificationSupported() && typeof Notification.requestPermission === 'function';
  } catch {
    return false;
  }
}

/** Maps whatever the platform answered onto the union, tolerating an off-spec implementation. */
function normalizePermission(value: unknown): NotificationPermissionState {
  if (
    value === NotificationPermissionState.Granted ||
    value === NotificationPermissionState.Denied ||
    value === NotificationPermissionState.Default
  ) {
    return value;
  }
  // An answer we don't recognize tells us nothing about the grant. `default` is the one state where asking
  // again is both harmless and useful, so an unreadable answer degrades to "not decided yet".
  return NotificationPermissionState.Default;
}

/** Narrows a value to something awaitable — the modern `requestPermission` return, or any thenable polyfill. */
function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  try {
    return typeof (value as { then?: unknown }).then === 'function';
  } catch {
    return false;
  }
}

/**
 * Calls `Notification.requestPermission` in whichever shape the browser implements and resolves to its raw
 * answer. Rejects only when the platform call itself fails — the caller turns that into a state.
 */
function requestRawPermission(): Promise<unknown> {
  return new Promise<unknown>((resolve, reject) => {
    let settled = false;
    const settle = (value: unknown): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    // The callback argument is what legacy Safari answers through; modern engines accept it too (deprecated,
    // not removed) and additionally return a promise. Whichever arrives first wins.
    const returned: unknown = Notification.requestPermission(settle);

    if (isPromiseLike(returned)) {
      returned.then(settle, reject);
      return;
    }
    // A synchronous implementation that answers by return value rather than by callback.
    if (returned !== undefined) settle(returned);
    // Otherwise the callback is the only channel left: legacy Safari resolves this promise whenever the user
    // decides. Deliberately un-timed — a prompt stays open as long as the user ignores it, and inventing a
    // deadline would report `default` for a grant the user is about to give.
  });
}

/**
 * Reads the current notification grant. Synchronous, SSR-safe, never throws.
 *
 * This is a static read, not a subscription — the platform fires no event when a grant changes. To re-render on
 * an external change, use `useNotificationPermission`, which pairs this read with a Permissions API signal.
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return NotificationPermissionState.Unsupported;

  try {
    return normalizePermission(Notification.permission);
  } catch {
    // A throwing `permission` getter means the API is nominally present but unusable. Reported as `unsupported`
    // so a consumer hides the enable affordance rather than offering one that cannot work.
    return NotificationPermissionState.Unsupported;
  }
}

/**
 * Prompts for the notification grant and resolves to the resulting state. Never throws, never rejects.
 *
 * Call it from a user gesture — browsers increasingly refuse a prompt without one. Already-decided origins
 * resolve immediately with the standing answer instead of re-prompting; that is the platform's behaviour, not
 * a short-circuit here. When the platform call itself fails, the standing grant is read back and returned,
 * since that remains the truth of the matter.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!hasRequestPermission()) return NotificationPermissionState.Unsupported;

  try {
    return normalizePermission(await requestRawPermission());
  } catch {
    return getNotificationPermission();
  }
}
