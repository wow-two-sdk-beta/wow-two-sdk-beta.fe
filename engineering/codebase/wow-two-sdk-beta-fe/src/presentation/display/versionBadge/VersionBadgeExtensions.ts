/** Reads and compares the version strings a `VersionBadge` shows. */
export const VersionBadgeExtensions = {
  /** The release part of a version — `0.15.4+abc1234` gives `0.15.4`; build metadata never reaches the badge. */
  release(version: string): string {
    return version.trim().split('+')[0] ?? '';
  },

  /** The badge text — a numbered release shows as `v0.15.4`; a named build (`dev`) shows as it is. */
  display(version: string): string {
    const release = VersionBadgeExtensions.release(version).replace(/^v(?=\d)/u, '');
    return /^\d/u.test(release) ? `v${release}` : release;
  },

  /** Whether the host serves another release than the one this tab loaded. Without a running version, never. */
  isStale(version: string, runningVersion: string | null | undefined): boolean {
    if (runningVersion === null || runningVersion === undefined) return false;
    const running = VersionBadgeExtensions.display(runningVersion);
    return running !== '' && running !== VersionBadgeExtensions.display(version);
  },
} as const;
