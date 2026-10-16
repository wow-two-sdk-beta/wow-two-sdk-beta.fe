import { computed, onMounted, onScopeDispose, shallowRef, type ComputedRef, type ShallowRef } from 'vue';

import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from '../NotificationPermission';
import { subscribeToPermissionChange } from '../QueryPermission';

/** What {@link useNotificationPermission} returns. */
export interface NotificationPermissionControls {
  /** The current grant. `unsupported` during SSR and until mount, then the real value. */
  readonly permission: Readonly<ShallowRef<NotificationPermissionState>>;

  /** Convenience for `permission === 'granted'` — the gate a `notify` call sits behind. */
  readonly granted: ComputedRef<boolean>;

  /** Whether the Notification API exists at all: `false` only for `unsupported`. Hide the feature when false. */
  readonly supported: ComputedRef<boolean>;

  /** Whether a prompt is worth offering — `permission === 'default'`. False once the user has decided either way. */
  readonly requestable: ComputedRef<boolean>;

  /** Whether a {@link NotificationPermissionControls.request} call is in flight — the button's disabled flag. */
  readonly requesting: Readonly<ShallowRef<boolean>>;

  /**
   * Prompts for the grant and resolves to the resulting state, which is also written to
   * {@link NotificationPermissionControls.permission}. Never throws, never rejects.
   */
  readonly request: () => Promise<NotificationPermissionState>;
}

/**
 * Exposes the notification grant as reactive state, with a `request()` that prompts for it.
 *
 * Updates when the grant changes — on request, and (where the Permissions API is available) on an external
 * grant or revoke. Inherits the module's never-throws contract: `request` resolves to a state, never rejects.
 */
export function useNotificationPermission(): NotificationPermissionControls {
  const permission = shallowRef<NotificationPermissionState>('unsupported');
  const requesting = shallowRef(false);

  let active = false;
  let unsubscribe: (() => void) | undefined;

  const sync = (): void => {
    if (active) permission.value = getNotificationPermission();
  };

  onMounted(() => {
    active = true;
    sync();
    // The delivered state is ignored on purpose — see the header: this subscription is a change signal, and
    // `Notification.permission` is the value. Its immediate first emission is simply a redundant `sync`.
    unsubscribe = subscribeToPermissionChange('notifications', sync);
  });

  onScopeDispose(() => {
    active = false;
    unsubscribe?.();
    unsubscribe = undefined;
  });

  let pending: Promise<NotificationPermissionState> | undefined;
  const request = (): Promise<NotificationPermissionState> => {
    if (pending !== undefined) return pending;
    if (!active) return Promise.resolve(permission.value);
    requesting.value = true;
    pending = requestNotificationPermission()
      .then((outcome) => {
        if (active) permission.value = outcome;
        return outcome;
      })
      .finally(() => {
        pending = undefined;
        if (active) requesting.value = false;
      });
    return pending;
  };

  return {
    permission,
    granted: computed(() => permission.value === 'granted'),
    supported: computed(() => permission.value !== 'unsupported'),
    requestable: computed(() => permission.value === 'default'),
    requesting,
    request,
  };
}
