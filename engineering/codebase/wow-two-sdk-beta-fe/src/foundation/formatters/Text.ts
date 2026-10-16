// String humanizers — truncation, casing, slugs, initials, and masking. All pure and locale-light (casing uses
// the default locale's `toUpperCase`/`toLowerCase`); no `Intl` dependency.

/** Tunes truncation. */
export interface TruncateOptions {
  /** The overflow indicator appended when the text is cut. Defaults to `…`. */
  readonly ellipsis?: string;

  /** Cut back to the last word boundary so a word is never split mid-way. Defaults to `false`. */
  readonly wordBoundary?: boolean;
}

/**
 * Truncates `text` to at most `maxLength` characters *including* the ellipsis. Returns the text unchanged when it
 * already fits. With `wordBoundary`, trims back to the last space before the cut so no word is split.
 */
export function truncate(text: string, maxLength: number, options?: TruncateOptions): string {
  if (maxLength < 0) throw new RangeError(`truncate: maxLength must be ≥ 0, got ${maxLength}`);
  if (text.length <= maxLength) return text;

  const ellipsis = options?.ellipsis ?? '…';
  if (maxLength <= ellipsis.length) return ellipsis.slice(0, maxLength);

  let end = maxLength - ellipsis.length;
  let head = text.slice(0, end);
  if (options?.wordBoundary === true) {
    const lastSpace = head.lastIndexOf(' ');
    if (lastSpace > 0) {
      end = lastSpace;
      head = text.slice(0, end);
    }
  }
  return head.trimEnd() + ellipsis;
}

/** Upper-cases the first character, leaving the rest untouched (`"hi there"` → `"Hi there"`). */
export function capitalize(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

/** Upper-cases the first letter of each whitespace-separated word (rest of each word lowercased). */
export function titleCase(text: string): string {
  return text
    .split(/(\s+)/)
    .map((part) =>
      /\s/.test(part) || part.length === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join('');
}

/** Tunes slug generation. */
export interface SlugifyOptions {
  /** The literal word separator; empty joins words without a separator. Defaults to `-`. */
  readonly separator?: string;
}

/**
 * Builds a URL-safe slug: strips diacritics (NFKD normalize + drop combining marks), lower-cases, replaces every
 * interior run of non-alphanumeric characters with the literal separator, and removes edge punctuation.
 * `"Héllo, World!"` → `"hello-world"`.
 */
export function slugify(text: string, options?: SlugifyOptions): string {
  const separator = options?.separator ?? '-';
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks split off by NFKD
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .replace(/[^a-z0-9]+/g, () => separator);
}

/** Tunes initials extraction. */
export interface InitialsOptions {
  /** Maximum number of initials to take. Defaults to `2`. */
  readonly max?: number;
}

/**
 * Extracts up-to-`max` upper-cased initials from a name — the first letter of the first and last significant
 * words. `"John Ronald Reuel Tolkien"` → `"JT"`. Returns `""` for a blank name.
 */
export function initials(name: string, options?: InitialsOptions): string {
  const max = Math.max(1, options?.max ?? 2);
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) return '';

  // First `max-1` words plus the last word — so a long name yields "first…last" initials, not the first N.
  // `words` is non-empty here, so the last element is present (the cast satisfies `noUncheckedIndexedAccess`).
  const last = words[words.length - 1] as string;
  const picked = words.length <= max ? words : [...words.slice(0, max - 1), last];
  return picked
    .slice(0, max)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/** Tunes masking. */
export interface MaskOptions {
  /** Number of characters left visible. Defaults to `4`; invalid counts mask every character. */
  readonly visible?: number;

  /** The mask character. Defaults to `•`. */
  readonly mask?: string;

  /** Which end stays visible — `end` shows the suffix, `start` the prefix. Defaults to `end`. */
  readonly side?: 'start' | 'end';
}

/**
 * Masks all but the last (or first) `visible` characters — for rendering partial secrets / PII (`"4242…4242"` →
 * `"••••••••••••4242"`). When the text is no longer than `visible`, every character is masked.
 * Nonfinite, fractional and negative visibility counts also mask every character.
 */
export function maskString(text: string, options?: MaskOptions): string {
  const requestedVisible = options?.visible ?? 4;
  const visible = Number.isInteger(requestedVisible) && requestedVisible >= 0 ? requestedVisible : 0;
  const maskChar = options?.mask ?? '•';
  const side = options?.side ?? 'end';

  if (text.length <= visible) return maskChar.repeat(text.length);

  const masked = maskChar.repeat(text.length - visible);
  return side === 'start' ? text.slice(0, visible) + masked : masked + text.slice(text.length - visible);
}
