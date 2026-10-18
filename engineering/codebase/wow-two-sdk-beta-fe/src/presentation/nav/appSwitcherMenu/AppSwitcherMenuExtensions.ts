// Folder-internal helpers for `appSwitcherMenu/`. Not exported from the group barrel —
// the "internal" signal is absence from `index.ts`, not the file name.

/** Extends `appSwitcherMenu/` with the destination check its menu applies to every href. */
export const AppSwitcherMenuExtensions = {
  /**
   * The href as a plain absolute HTTPS URL, else `null`. Credentials, a query or a fragment could carry a token
   * from configuration into another app's address bar and history, so each one rejects the href.
   */
  toSafeHref(href: string): string | null {
    try {
      const url = new URL(href);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
      return `${url.origin}${url.pathname}`;
    } catch {
      return null;
    }
  },
} as const;
