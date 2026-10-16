import { queryPermission, type PermissionQueryState } from '../notifications';

/**
 * The state of a queried permission — re-exported from `foundation/notifications` so a consumer of this slice
 * can name the return type without importing a second subpath.
 */
export type { PermissionQueryState };

/**
 * Reads the camera permission's current state without prompting.
 *
 * A hint, not a gate — see the module header. `unsupported` is the normal Firefox answer and means "cannot
 * tell", never "blocked". Never throws, never rejects.
 *
 * @returns `granted` · `denied` · `prompt` · `unsupported`.
 */
export function getCameraPermission(): Promise<PermissionQueryState> {
  return queryPermission('camera');
}

/**
 * Reads the microphone permission's current state without prompting.
 *
 * Same caveats as {@link getCameraPermission}. Never throws, never rejects.
 *
 * @returns `granted` · `denied` · `prompt` · `unsupported`.
 */
export function getMicrophonePermission(): Promise<PermissionQueryState> {
  return queryPermission('microphone');
}
