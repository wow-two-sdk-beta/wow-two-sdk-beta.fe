import { PhoneCountries, type PhoneCountry } from './PhoneCountries';
import { PhoneFormats, type PhoneFormat } from './PhoneFormats';

/** Holds a value's country and national digits. */
export interface PhoneNumberParts {
  /** The ISO code the value's dial prefix names, or the fallback when none of the countries matches. */
  readonly iso: string;
  /** The national digits: everything after the matched dial code, or every digit when none matched. */
  readonly national: string;
}

/** Holds the national digits a country's numbering plan accepts. */
export interface PhoneLengthRange {
  /** The fewest national digits. */
  readonly min: number;
  /** The most national digits. Equals `min` for a fixed-length plan. */
  readonly max: number;
}

/** Describes one edit of the national-number field, as the browser left it. */
export interface PhoneNationalEditInput {
  /** The field text after the browser applied the edit, separators and stray characters included. */
  readonly text: string;
  /** The caret offset in `text`. */
  readonly caret: number;
  /** The national digits before the edit. */
  readonly previousDigits: string;
  /** The `InputEvent.inputType`; `deleteContentBackward` / `deleteContentForward` step over a separator. */
  readonly inputType?: string;
  /** The country's format; its `length` caps the digits. */
  readonly format: PhoneFormat;
}

/** Holds the result of one national-number edit. */
export interface PhoneNationalEdit {
  /** The national digits after the edit. */
  readonly digits: string;
  /** The display text: the digits through the mask. */
  readonly text: string;
  /** The caret offset in `text`, after the same digits it followed before the edit. */
  readonly caret: number;
}

/** Holds an international number read from pasted or autofilled text. */
export interface PhoneInternationalNumber {
  /** The allowed country its dial prefix names, or `null` when none does. */
  readonly country: PhoneCountry | null;
  /** The E.164 value: `+` and every digit of the text. */
  readonly e164: string;
}

/** Extends E.164 phone values and their national digits: country lookup, length rules, display and editing. */
export const PhoneNumberExtensions = {
  /** @internal E.164 caps a number, dial code included, at 15 digits. */
  MaxDigits: 15,
  /** @internal The fewest national digits a plan outside `PhoneFormats` accepts — Austria's shortest. */
  MinNationalDigits: 4,
  /** @internal The group size of the fallback mask. */
  GroupSize: 3,
  /** @internal The mask character that takes one digit. */
  DigitSlot: 'X',
  /** @internal Every non-digit. */
  NonDigit: /\D/g,
  /** @internal An E.164 value: `+`, then digits, the first not `0`. */
  E164Pattern: /^\+[1-9]\d*$/,

  /** Removes every non-digit. */
  digitsOf(text: string): string {
    return text.replace(PhoneNumberExtensions.NonDigit, '');
  },

  /**
   * Resolves ISO codes to known countries in the order given; unknown and repeated codes are dropped. A list with no
   * known code reads as absent — every country — since a phone control with no country could hold no value.
   */
  resolveCountries(isos: ReadonlyArray<string> | undefined): ReadonlyArray<PhoneCountry> {
    if (!isos) return PhoneCountries;

    const known = [...new Set(isos)]
      .map((iso) => PhoneCountries.find((c) => c.iso === iso))
      .filter((c): c is PhoneCountry => c !== undefined);
    return known.length > 0 ? known : PhoneCountries;
  },

  /** Resolves the national digits a country accepts: its fixed length, else up to the E.164 cap. */
  lengthOf(country: PhoneCountry): PhoneLengthRange {
    const format = PhoneFormats[country.iso];
    if (format) return { min: format.length, max: format.length };

    return {
      min: PhoneNumberExtensions.MinNationalDigits,
      max: PhoneNumberExtensions.MaxDigits - PhoneNumberExtensions.digitsOf(country.dial).length,
    };
  },

  /** Resolves a country's format: its `PhoneFormats` entry, else three-digit groups up to the E.164 cap. */
  formatOf(country: PhoneCountry): PhoneFormat {
    const format = PhoneFormats[country.iso];
    if (format) return format;

    const length = PhoneNumberExtensions.lengthOf(country).max;
    const slots = Array.from({ length }, (_, index) =>
      index > 0 && index % PhoneNumberExtensions.GroupSize === 0
        ? ` ${PhoneNumberExtensions.DigitSlot}`
        : PhoneNumberExtensions.DigitSlot,
    );
    return { mask: slots.join(''), length };
  },

  /** Lays national digits into a mask; a separator shows only once a digit follows it, extra digits trail unmasked. */
  formatNational(digits: string, format: PhoneFormat): string {
    let text = '';
    let next = 0;
    for (const slot of format.mask) {
      if (next >= digits.length) break;
      if (slot === PhoneNumberExtensions.DigitSlot) {
        text += digits[next];
        next += 1;
      } else {
        text += slot;
      }
    }

    return text + digits.slice(next);
  },

  /** Finds the offset just after the `count`-th digit of `text`; `0` for no digits, the end when it has fewer. */
  caretAfterDigits(text: string, count: number): number {
    if (count <= 0) return 0;

    let seen = 0;
    for (let index = 0; index < text.length; index++) {
      if (text[index]! >= '0' && text[index]! <= '9') seen += 1;
      if (seen === count) return index + 1;
    }
    return text.length;
  },

  /**
   * Applies one edit of the national-number field: drops non-digits, steps a deletion over a separator onto the digit
   * beside it, drops typed or pasted digits past the format's length, and keeps the caret after the same digit.
   */
  editNational(input: PhoneNationalEditInput): PhoneNationalEdit {
    const { format, previousDigits } = input;
    let digits = PhoneNumberExtensions.digitsOf(input.text);
    let before = PhoneNumberExtensions.digitsOf(input.text.slice(0, input.caret)).length;

    // A single deleted character that left the digits whole was a separator: the deletion moves on to the digit.
    const previousText = PhoneNumberExtensions.formatNational(previousDigits, format);
    if (digits === previousDigits && previousText.length - input.text.length === 1) {
      if (input.inputType === 'deleteContentBackward' && before > 0) {
        digits = digits.slice(0, before - 1) + digits.slice(before);
        before -= 1;
      } else if (input.inputType === 'deleteContentForward' && before < digits.length) {
        digits = digits.slice(0, before) + digits.slice(before + 1);
      }
    }

    // Digits past the cap are the ones just inserted, which sit right before the caret.
    const excess = digits.length - Math.max(format.length, previousDigits.length);
    if (excess > 0) {
      const dropped = Math.min(excess, before);
      digits = digits.slice(0, before - dropped) + digits.slice(before);
      before -= dropped;
    }

    const text = PhoneNumberExtensions.formatNational(digits, format);
    return { digits, text, caret: PhoneNumberExtensions.caretAfterDigits(text, before) };
  },

  /**
   * Finds the country an E.164 value belongs to: `preferredIso` when its dial code matches (a shared `+1` or `+7` stays
   * on the reader's pick), else the longest matching dial code, a shared one going to the earlier country.
   */
  countryOf(value: string, countries: ReadonlyArray<PhoneCountry>, preferredIso?: string): PhoneCountry | null {
    if (!value.startsWith('+')) return null;

    const preferred = preferredIso === undefined ? undefined : countries.find((c) => c.iso === preferredIso);
    if (preferred && value.startsWith(preferred.dial)) return preferred;

    // The stable sort leaves countries of one code length in list order.
    const longestFirst = [...countries].sort((a, b) => b.dial.length - a.dial.length);
    return longestFirst.find((c) => value.startsWith(c.dial)) ?? null;
  },

  /** Splits an E.164 value into its country and national digits; a value no country matches keeps every digit. */
  split(value: string, countries: ReadonlyArray<PhoneCountry>, fallbackIso: string): PhoneNumberParts {
    if (!value) return { iso: fallbackIso, national: '' };

    const country = PhoneNumberExtensions.countryOf(value, countries);
    if (!country) return { iso: fallbackIso, national: PhoneNumberExtensions.digitsOf(value) };

    return { iso: country.iso, national: PhoneNumberExtensions.digitsOf(value.slice(country.dial.length)) };
  },

  /** Reads an international number from free text (`+998 99 663-25-82`): every digit after `+`, and its country. */
  parseInternational(
    text: string,
    countries: ReadonlyArray<PhoneCountry>,
    preferredIso?: string,
  ): PhoneInternationalNumber {
    const e164 = `+${PhoneNumberExtensions.digitsOf(text)}`;
    return { country: PhoneNumberExtensions.countryOf(e164, countries, preferredIso), e164 };
  },

  /**
   * Strips a dial code typed without its `+` (`998996632582` for Uzbekistan): only digits that are exactly the
   * country's dial code and a full fixed-length national number, a length no national number has on its own.
   */
  withoutDialCode(digits: string, country: PhoneCountry): string {
    const format = PhoneFormats[country.iso];
    const dial = PhoneNumberExtensions.digitsOf(country.dial);
    if (!format || digits.length !== dial.length + format.length || !digits.startsWith(dial)) return digits;

    return digits.slice(dial.length);
  },
} as const;
