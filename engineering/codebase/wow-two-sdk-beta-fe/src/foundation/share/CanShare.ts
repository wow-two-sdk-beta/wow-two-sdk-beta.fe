import { toNativeSharePayload, type ShareData } from './ShareData';

/** Whether `navigator.share` exists. False under SSR (no `navigator`) and on non-supporting browsers. */
function hasNativeShare(): boolean {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  } catch {
    // A throwing `navigator` / `share` getter reads as absent — same posture as `foundation/errors`' guarded reads.
    return false;
  }
}

/**
 * Reports whether `share` can hand `data` to a native share sheet.
 *
 * With no argument — or a file-free payload — this is pure availability: does `navigator.share` exist. When
 * `data.files` is present the platform is asked directly via `navigator.canShare`, and a missing `canShare` is
 * treated as a no: a browser that cannot answer the file question is not one to hand files to.
 *
 * Never throws. Returns `false` under SSR.
 */
export function canShare(data?: ShareData): boolean {
  if (!hasNativeShare()) return false;
  if (data?.files === undefined) return true;

  try {
    if (typeof navigator.canShare !== 'function') return false;
    return navigator.canShare(toNativeSharePayload(data)) === true;
  } catch {
    // `canShare` is specified not to throw, but a partial implementation may. Unverifiable reads as unsupported.
    return false;
  }
}
