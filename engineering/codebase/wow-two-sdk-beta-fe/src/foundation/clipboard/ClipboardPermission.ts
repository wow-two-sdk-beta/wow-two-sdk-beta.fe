import { queryPermission, type PermissionQueryState } from '../notifications/QueryPermission';

/** Which half of the clipboard a permission query is about. */
export const ClipboardPermissionMode = {
  /** Asks about reading the clipboard — the `clipboard-read` permission name. */
  Read: 'read',

  /** Asks about writing the clipboard — the `clipboard-write` permission name. */
  Write: 'write',
} as const;

/** Which half of the clipboard a permission query is about. */
export type ClipboardPermissionMode = (typeof ClipboardPermissionMode)[keyof typeof ClipboardPermissionMode];

/** The Permissions API names, which differ from this slice's vocabulary and are not implemented everywhere. */
const PermissionNames: Readonly<Record<ClipboardPermissionMode, string>> = {
  read: 'clipboard-read',
  write: 'clipboard-write',
};

/**
 * Reads the browser's recorded permission for clipboard reading or writing.
 *
 * Returns `unsupported` when the Permissions API cannot query the name. Treat this as unknown,
 * not denied: clipboard operations may remain available without a supported permission query.
 *
 * A one-shot snapshot; the browser fires no event on this promise.
 *
 * Never throws, never rejects.
 *
 * @param mode `'read'` for `clipboard-read`, `'write'` for `clipboard-write`.
 */
export async function getClipboardPermission(mode: ClipboardPermissionMode): Promise<PermissionQueryState> {
  const name = PermissionNames[mode];
  if (name === undefined) return 'unsupported';
  return queryPermission(name);
}
