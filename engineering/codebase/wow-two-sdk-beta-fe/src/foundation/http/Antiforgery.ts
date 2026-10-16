import type { ApiFailure } from './ApiFailure';

/**
 * Configures the antiforgery token a cookie-authenticated client echoes on unsafe requests — the browser half of
 * the backend SDK's SPA antiforgery, which issues the token in a readable cookie on every safe request.
 */
export interface ApiAntiforgeryOptions {
  /** The readable cookie the server issues the token in. Default `XSRF-TOKEN`. */
  readonly cookieName?: string;
  /** The request header the token is echoed in. Default `X-XSRF-TOKEN`. */
  readonly headerName?: string;
  /**
   * A safe path whose response reissues the token. A write rejected for a stale token — one issued before a
   * sign-in or sign-out — reads it once, then retries with the fresh token. Omitted, a rejection is returned.
   */
  readonly refreshPath?: string;
  /** Recognizes the server's antiforgery rejection; default: a 400 whose problem `code` names it. */
  readonly isRejection?: (failure: ApiFailure) => boolean;
}

/** Holds the defaults the backend SDK's SPA antiforgery uses. */
export const AntiforgeryDefaults = {
  cookieName: 'XSRF-TOKEN',
  headerName: 'X-XSRF-TOKEN',
  rejectionCode: 'AntiforgeryValidationFailed',
} as const;

/** Holds the request methods that carry an antiforgery token. */
const UnsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Extends requests with the antiforgery token echo. */
export const AntiforgeryExtensions = {
  /** Whether a request method changes state and must echo the token. */
  isUnsafe(method: string | undefined): boolean {
    return UnsafeMethods.has((method ?? 'GET').toUpperCase());
  },

  /** Reads the current token from the readable cookie; `null` without a document or before the server issued one. */
  readToken(cookieName: string = AntiforgeryDefaults.cookieName): string | null {
    if (typeof document === 'undefined') return null;
    for (const part of document.cookie.split(';')) {
      const separator = part.indexOf('=');
      if (separator < 0 || part.slice(0, separator).trim() !== cookieName) continue;
      const value = part.slice(separator + 1).trim();
      try {
        return value ? decodeURIComponent(value) : null;
      } catch {
        return value || null;
      }
    }
    return null;
  },

  /** Recognizes the backend SDK's antiforgery rejection: a 400 whose problem `code` names it. */
  isRejection(failure: ApiFailure): boolean {
    return failure.status === 400 && failure.problem?.['code'] === AntiforgeryDefaults.rejectionCode;
  },
} as const;
