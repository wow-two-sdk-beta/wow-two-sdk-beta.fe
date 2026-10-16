// `accept`-attribute matching — the rule an `<input type="file" accept="...">` implies, applied in JS. An accept
// string is a comma-separated list of extension tokens (`.png`), wildcard MIME tokens (`image/*`), and exact MIME
// tokens (`application/pdf`). Two entry points because the browser exposes different information at different
// moments: on drop / change a real `File` carries both name and type; at `dragenter` only the MIME type exists,
// so extension tokens are unverifiable and the check is advisory.

/** The subset of `File` accept-matching reads — lets a caller match a plain `{name, type}` without a real `File`. */
export interface FileLike {
  /** The file name, including extension. */
  readonly name: string;

  /** The MIME type, possibly empty (browsers leave it blank for unknown types). */
  readonly type: string;
}

/** Splits an `accept` string into normalized, lower-cased tokens. Returns `[]` for an absent or blank list. */
export function parseAcceptTokens(accept?: string): string[] {
  if (accept === undefined || accept === '') return [];
  return accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
}

/** Tests one already-normalized token against a name/type pair. `name` empty ⇒ extension tokens can't be judged. */
function tokenMatches(token: string, name: string, type: string): boolean | 'unverifiable' {
  if (token.startsWith('.')) {
    if (name === '') return 'unverifiable';
    return name.endsWith(token);
  }
  if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
  return type === token;
}

/**
 * Tests whether a file satisfies an `accept` list. An absent / blank / token-less list accepts everything.
 * Matching is case-insensitive: extension tokens compare against the file name, `type/*` against the MIME
 * prefix, and any other token against the exact MIME type.
 */
export function matchesAccept(file: FileLike, accept?: string): boolean {
  const tokens = parseAcceptTokens(accept);
  if (tokens.length === 0) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => tokenMatches(token, name, type) === true);
}

/** Tunes the advisory, type-only accept check. */
export interface MatchesAcceptTypeOptions {
  /**
   * How to treat extension tokens (`.png`) when no file name is available (a `dragenter`, where only the MIME
   * type is exposed). `allow` (default) keeps the drag optimistic and defers the real verdict to the drop;
   * `reject` fails closed.
   */
  readonly extensionTokens?: 'allow' | 'reject';
}

/**
 * Advisory accept check for the pre-drop phase, where only a MIME type is known (`DataTransferItem.type`).
 * Wildcard and exact MIME tokens are judged normally; extension tokens are unverifiable without a file name and
 * resolve per `extensionTokens` (default `allow`). Re-check with {@link matchesAccept} once the real `File` lands.
 */
export function matchesAcceptType(mimeType: string, accept?: string, options?: MatchesAcceptTypeOptions): boolean {
  const tokens = parseAcceptTokens(accept);
  if (tokens.length === 0) return true;

  const allowUnverifiable = (options?.extensionTokens ?? 'allow') === 'allow';
  const type = mimeType.toLowerCase();

  return tokens.some((token) => {
    const verdict = tokenMatches(token, '', type);
    return verdict === 'unverifiable' ? allowUnverifiable : verdict;
  });
}
