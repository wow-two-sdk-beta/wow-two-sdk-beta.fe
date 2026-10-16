/** Defines a bearer credential store. Use isolated memory by default; persistence needs explicit app policy. */
export interface TokenStorage {
  /** Reads the stored token, or `null` when signed out. */
  get(): string | null;

  /** Stores a new token, or clears it with `null`. */
  set(token: string | null): void;
}

/** Creates the default in-memory token storage — never persisted, so a reload requires re-login. */
export function createMemoryTokenStorage(): TokenStorage {
  let token: string | null = null;
  return {
    get: () => token,
    set: (next) => {
      token = next;
    },
  };
}
