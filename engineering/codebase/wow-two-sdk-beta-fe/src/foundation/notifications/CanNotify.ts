import { getNotificationPermission } from './NotificationPermission';

/**
 * Whether `notify` would actually show something right now: the Notification API exists and this origin holds
 * the grant.
 *
 * Returns `false` under SSR, on a non-supporting browser, and — importantly — on a supporting browser that has
 * simply not been asked yet. A `false` here is therefore not a reason to hide the feature; check
 * `getNotificationPermission() === 'default'` first and offer the prompt.
 *
 * Never throws.
 */
export function canNotify(): boolean {
  return getNotificationPermission() === 'granted';
}
