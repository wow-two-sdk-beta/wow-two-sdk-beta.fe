/** Extends return paths with the same-origin rule every sign-in redirect applies. */
export const ReturnUrlExtensions = {
  /** Whether `target` is a same-origin path — rejects `//host`, `\`, control characters and absolute URLs. */
  isLocal(target: string): boolean {
    return (
      target.startsWith('/') &&
      !target.startsWith('//') &&
      ![...target].some((character) => character === '\\' || character.charCodeAt(0) < 32)
    );
  },

  /** Reads the current location as `pathname + search`; a bare `/` without a browser. */
  current(): string {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname + window.location.search;
  },
} as const;
