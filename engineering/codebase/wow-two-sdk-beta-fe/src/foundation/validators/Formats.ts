// Format validators for the four string shapes that show up at almost every boundary. Each returns a
// `StringValidator`, so the type check, the format check, and any further refinement compose in one
// chain: `email().max(254)`.
//
// THE REGEXES ARE DELIBERATELY CONSERVATIVE, AND THEY ARE NOT SPECIFICATIONS:
//
// - `email()` IS A PRAGMATIC CHECK, NOT RFC 5322. The real grammar admits quoted local parts, comments,
//   and bracketed IP literals; the widely-cited "RFC-compliant" regex runs thousands of characters and
//   still accepts addresses no mail server will deliver to. This checks the shape that catches real
//   typos — one `@`, no whitespace, a dotted domain — and nothing more. The only true validation of an
//   email address is sending mail to it, so anything stricter here buys false rejections, not safety.
// - `url()` uses the `URL` constructor instead of a regex, because a hand-written URL regex is wrong in
//   ways that matter. It accepts ANY scheme, `mailto:` and `javascript:` included — restrict with
//   `.refine()` when the value reaches an `href`.
// - `uuid()` requires the RFC 4122 layout with a version nibble of 1–8 and a variant nibble of 8/9/a/b.
//   NOTE: this REJECTS the nil UUID (`000…0`), which some systems use as a sentinel — chain a `union`
//   with `literal()` if a nil is meaningful in that field.
// - `isoDate()` accepts a calendar date (`YYYY-MM-DD`) ONLY, not a full ISO 8601 timestamp, and confirms
//   the date exists by round-tripping it — `2025-02-30` matches the pattern but is not a day. Years are
//   compared after the round trip, including the four-digit years below 0100.

import { string, type StringValidator } from './Primitives';

/** One `@`, no whitespace, and a dotted domain. See the header — pragmatic, not RFC 5322. */
const EmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** RFC 4122 layout: 8-4-4-4-12 hex, version nibble 1–8, variant nibble 8/9/a/b. */
const UuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$(?![\s\S])/i;

/** Calendar date only — four-digit year, two-digit month, two-digit day. */
const IsoDatePattern = /^\d{4}-\d{2}-\d{2}$(?![\s\S])/;

/** Accepts an email-shaped string. Pragmatic check — see the header for what it deliberately does not do. */
export function email(message = 'must be a valid email address'): StringValidator {
  return string().pattern(EmailPattern, message, 'email');
}

/** Accepts any string the `URL` constructor parses. Any scheme passes — restrict further if it reaches an `href`. */
export function url(message = 'must be a valid URL'): StringValidator {
  return string().refine(
    (value) => {
      try {
        // Construct-and-discard: `URL` throws on a malformed value, and the caller keeps their string.
        void new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
    'url',
  );
}

/** Accepts a canonical RFC 4122 UUID, any case. Rejects the nil UUID — see the header. */
export function uuid(message = 'must be a valid UUID'): StringValidator {
  return string().pattern(UuidPattern, message, 'uuid');
}

/** Accepts a `YYYY-MM-DD` calendar date that actually exists. Not a full ISO 8601 timestamp. */
export function isoDate(message = 'must be a valid ISO date (YYYY-MM-DD)'): StringValidator {
  return string()
    .pattern(IsoDatePattern, message, 'isoDate')
    .refine(
      (value) => {
        const parts = value.split('-');
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);

        // Round-trip through UTC: an overflowing day (`2025-02-30`) lands on a different date, so
        // comparing the parts back out is what proves the calendar date is real.
        const parsed = new Date(0);
        parsed.setUTCFullYear(year, month - 1, day);
        return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
      },
      message,
      'isoDate',
    );
}
