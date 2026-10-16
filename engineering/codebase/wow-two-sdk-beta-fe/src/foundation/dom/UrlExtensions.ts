const NavigationProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const ResourceProtocols = new Set(['http:', 'https:', 'blob:']);
const ParserBase = 'https://url-validation.invalid/';

/** Decodes scheme-relevant HTML references before URL policy checks. */
function decodeReferences(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|colon|tab|newline|amp);?/gi, (match, reference: string) => {
    const name = reference.toLowerCase();
    if (name === 'colon') return ':';
    if (name === 'tab') return '\t';
    if (name === 'newline') return '\n';
    if (name === 'amp') return '&';
    const point = name.startsWith('#x') ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10);
    return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
  });
}

function selectSafeUrl(value: unknown, protocols: ReadonlySet<string>): string | undefined {
  if (typeof value !== 'string') return undefined;
  if ([...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return undefined;
  let candidate = value.trim();
  // A Markdown/HTML pipeline may have decoded one layer already. Normalize a bounded number;
  // unresolved references are rejected so additional downstream decoding cannot alter the scheme.
  for (let pass = 0; pass < 4; pass += 1) {
    const decoded = decodeReferences(candidate);
    if (decoded === candidate) break;
    candidate = decoded;
  }
  if (/&(?:#|colon|tab|newline|amp)/i.test(candidate)) return undefined;
  if ([...candidate].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
    return undefined;
  }
  try {
    const parsed = new URL(candidate, ParserBase);
    return protocols.has(parsed.protocol) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

/** Selects a URL only when its parsed scheme is allowed at the corresponding DOM boundary. */
export const UrlExtensions = {
  safeNavigation(value: unknown): string | undefined {
    return selectSafeUrl(value, NavigationProtocols);
  },
  safeResource(value: unknown): string | undefined {
    return selectSafeUrl(value, ResourceProtocols);
  },
} as const;
