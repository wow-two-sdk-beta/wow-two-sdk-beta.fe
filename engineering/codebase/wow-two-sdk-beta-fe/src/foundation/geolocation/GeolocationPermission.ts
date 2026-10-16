import { queryPermission, type PermissionQueryState } from '../notifications';

export type { PermissionQueryState };

/**
 * Reads the current geolocation grant without prompting for it.
 *
 * A snapshot — the returned promise fires no event on a later change. Use `usePermissionState('geolocation')`
 * from `foundation/notifications` to follow changes (a revoke from site settings, a grant given in another tab).
 *
 * Never throws, never rejects.
 *
 * @returns `granted` / `denied` / `prompt`, or `unsupported` where the Permissions API cannot answer.
 */
export function getGeolocationPermission(): Promise<PermissionQueryState> {
  return queryPermission('geolocation');
}
