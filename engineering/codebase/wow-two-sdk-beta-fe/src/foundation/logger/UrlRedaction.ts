// A URL is the one place a credential hides in plain text: an OAuth `code` in a callback, an `access_token` in
// an implicit-flow fragment, a signed download link, `user:pass@` in a mis-pasted endpoint. `redactContext`
// masks object KEYS, and a URL is a single string value, so it needs its own scrubber — applied before a URL
// lands on a failure, a log line or a report that leaves the device.
//
// Decisions:
//
// - **Text surgery, not `new URL()`.** A relative URL has no base to parse against, and a parse round-trip
//   re-encodes the parts it keeps (`[redacted]` → `%5Bredacted%5D`) — the scrubbed URL should read like the
//   original. Parameter keys are decoded only to compare them.
// - **Fragments are scrubbed too.** The implicit flow puts tokens there, and a hash-routed app carries its
//   query after `#/path?`.
// - **Never throws.** A malformed escape compares by its raw text; any other failure degrades to the path with
//   query and fragment dropped — fail-closed.

import { DefaultRedactionMask } from './Redaction';

/** Provides the query and fragment parameter names masked by default — the credentials seen in URLs. */
export const DefaultRedactUrlParams: ReadonlyArray<string> = Object.freeze([
  'token',
  'access_token',
  'id_token',
  'refresh_token',
  'code',
  'state',
  'password',
  'secret',
  'key',
  'api_key',
  'apikey',
  'signature',
  'sig',
  'session',
  'auth',
  'authorization',
  'jwt',
  'otp',
]);

/** Decodes a parameter key for comparison, falling back to its raw text when the escape is malformed. */
function decodeKey(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/gu, ' ')).toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

/** Masks every `name=value` pair of an `a=1&b=2` string whose name matches. */
function redactParams(raw: string, names: ReadonlySet<string>, mask: string): string {
  return raw
    .split('&')
    .map((pair) => {
      const separator = pair.indexOf('=');
      const key = separator === -1 ? pair : pair.slice(0, separator);
      return separator !== -1 && names.has(decodeKey(key)) ? `${key}=${mask}` : pair;
    })
    .join('&');
}

/** Scrubs a fragment: a hash route's query after `?`, or the whole fragment when it is itself a parameter list. */
function redactFragment(fragment: string, names: ReadonlySet<string>, mask: string): string {
  const query = fragment.indexOf('?');
  if (query !== -1) return `${fragment.slice(0, query + 1)}${redactParams(fragment.slice(query + 1), names, mask)}`;
  return fragment.includes('=') ? redactParams(fragment, names, mask) : fragment;
}

/** Drops `user:pass@` from an absolute or protocol-relative URL's authority. */
function stripUserInfo(url: string): string {
  const authority = /^((?:[a-z][a-z\d+.-]*:)?\/\/)([^/?#]*)/iu.exec(url);
  if (!authority) return url;
  const [whole, prefix = '', host = ''] = authority;
  const at = host.lastIndexOf('@');
  return at === -1 ? url : `${prefix}${host.slice(at + 1)}${url.slice(whole.length)}`;
}

/**
 * Copies a URL with its credentials removed — `user:pass@` dropped, and every query or fragment parameter whose
 * name matches `params` (case-insensitively) masked. Relative URLs stay relative; the rest of the text is kept
 * as written. Never throws.
 */
export function redactUrl(
  url: string,
  params: ReadonlyArray<string> = DefaultRedactUrlParams,
  mask: string = DefaultRedactionMask,
): string {
  try {
    const names = new Set(params.map((name) => name.toLowerCase()));
    const bare = stripUserInfo(url);
    const hash = bare.indexOf('#');
    const beforeHash = hash === -1 ? bare : bare.slice(0, hash);
    const fragment = hash === -1 ? undefined : bare.slice(hash + 1);
    const query = beforeHash.indexOf('?');
    const path = query === -1 ? beforeHash : beforeHash.slice(0, query);
    const search = query === -1 ? '' : `?${redactParams(beforeHash.slice(query + 1), names, mask)}`;
    return `${path}${search}${fragment === undefined ? '' : `#${redactFragment(fragment, names, mask)}`}`;
  } catch {
    return url.split(/[?#]/u)[0] ?? '';
  }
}
