import { describe, expect, it } from 'vitest';
import {
  PhoneCountries,
  PhoneFormats,
  PhoneNumberExtensions,
  type PhoneCountry,
  type PhoneNationalEdit,
} from '@src/foundation/phone';

const country = (iso: string): PhoneCountry => PhoneCountries.find((c) => c.iso === iso)!;
const uz = PhoneFormats.UZ!;

/** Types `text` one character at a time at the end of the field, the way a keyboard does. */
function typeAtEnd(text: string, start: PhoneNationalEdit = { digits: '', text: '', caret: 0 }): PhoneNationalEdit {
  let edit = start;
  for (const character of text) {
    const raw = edit.text.slice(0, edit.caret) + character + edit.text.slice(edit.caret);
    edit = PhoneNumberExtensions.editNational({
      text: raw,
      caret: edit.caret + 1,
      previousDigits: edit.digits,
      inputType: 'insertText',
      format: uz,
    });
  }
  return edit;
}

describe('PhoneFormats', () => {
  it('keys every format by a listed country, its mask holding exactly its digit count', () => {
    for (const [iso, format] of Object.entries(PhoneFormats)) {
      expect(PhoneCountries.some((c) => c.iso === iso)).toBe(true);
      expect(format.mask.split('').filter((slot) => slot === 'X')).toHaveLength(format.length);
    }
    expect(PhoneFormats.UZ).toEqual({ mask: 'XX-XXX-XX-XX', length: 9 });
  });
});

describe('PhoneNumberExtensions', () => {
  it('shows a separator only once a digit follows it', () => {
    expect(PhoneNumberExtensions.formatNational('', uz)).toBe('');
    expect(PhoneNumberExtensions.formatNational('99', uz)).toBe('99');
    expect(PhoneNumberExtensions.formatNational('996', uz)).toBe('99-6');
    expect(PhoneNumberExtensions.formatNational('996632582', uz)).toBe('99-663-25-82');
    expect(PhoneNumberExtensions.formatNational('5', PhoneFormats.US!)).toBe('(5');
    expect(PhoneNumberExtensions.formatNational('5551234567', PhoneFormats.US!)).toBe('(555) 123-4567');
  });

  it('falls back to three-digit groups up to the E.164 cap for a country without a format', () => {
    const germany = PhoneNumberExtensions.formatOf(country('DE'));
    expect(germany.length).toBe(13);
    expect(PhoneNumberExtensions.formatNational('3012345678', germany)).toBe('301 234 567 8');
    expect(PhoneNumberExtensions.lengthOf(country('DE'))).toEqual({ min: 4, max: 13 });
    expect(PhoneNumberExtensions.lengthOf(country('UZ'))).toEqual({ min: 9, max: 9 });
  });

  it('keeps digits only and stops at the national length', () => {
    const edit = typeAtEnd('99663258234234sdfsdfsdf');
    expect(edit).toEqual({ digits: '996632582', text: '99-663-25-82', caret: 12 });
  });

  it('keeps the caret after the digit it followed when a digit lands before a separator', () => {
    const typed = typeAtEnd('99663');
    expect(typed.text).toBe('99-663');
    // The caret sits after "99"; typing "1" there re-flows the groups.
    const edit = PhoneNumberExtensions.editNational({
      text: '991-663',
      caret: 3,
      previousDigits: typed.digits,
      inputType: 'insertText',
      format: uz,
    });
    expect(edit).toEqual({ digits: '991663', text: '99-166-3', caret: 4 });
  });

  it('drops a rejected character without moving the caret', () => {
    const edit = PhoneNumberExtensions.editNational({
      text: '99a-663',
      caret: 3,
      previousDigits: '99663',
      inputType: 'insertText',
      format: uz,
    });
    expect(edit).toEqual({ digits: '99663', text: '99-663', caret: 2 });
  });

  it('steps Backspace over a separator onto the digit before it', () => {
    // "99-|663": the browser removed the "-".
    const edit = PhoneNumberExtensions.editNational({
      text: '99663',
      caret: 2,
      previousDigits: '99663',
      inputType: 'deleteContentBackward',
      format: uz,
    });
    expect(edit).toEqual({ digits: '9663', text: '96-63', caret: 1 });
  });

  it('steps Delete over a separator onto the digit after it', () => {
    // "99|-663": the browser removed the "-".
    const edit = PhoneNumberExtensions.editNational({
      text: '99663',
      caret: 2,
      previousDigits: '99663',
      inputType: 'deleteContentForward',
      format: uz,
    });
    expect(edit).toEqual({ digits: '9963', text: '99-63', caret: 2 });
  });

  it('deletes an ordinary digit as it is', () => {
    // "99-66|3": the browser removed the second "6".
    const edit = PhoneNumberExtensions.editNational({
      text: '99-63',
      caret: 4,
      previousDigits: '99663',
      inputType: 'deleteContentBackward',
      format: uz,
    });
    expect(edit).toEqual({ digits: '9963', text: '99-63', caret: 4 });
  });

  it('drops the tail of a paste past the national length', () => {
    const edit = PhoneNumberExtensions.editNational({
      text: '99 663 25 82 999',
      caret: 16,
      previousDigits: '',
      inputType: 'insertFromPaste',
      format: uz,
    });
    expect(edit).toEqual({ digits: '996632582', text: '99-663-25-82', caret: 12 });
  });

  it('reads the country of a value from its longest dial code, a pick winning a shared code', () => {
    expect(PhoneNumberExtensions.countryOf('+998996632582', PhoneCountries)?.iso).toBe('UZ');
    expect(PhoneNumberExtensions.countryOf('+420601123456', PhoneCountries)?.iso).toBe('CZ');
    expect(PhoneNumberExtensions.countryOf('+77011234567', PhoneCountries)?.iso).toBe('RU');
    expect(PhoneNumberExtensions.countryOf('+77011234567', PhoneCountries, 'KZ')?.iso).toBe('KZ');
    expect(PhoneNumberExtensions.countryOf('998996632582', PhoneCountries)).toBeNull();
    expect(PhoneNumberExtensions.countryOf('+447911123456', [country('UZ')])).toBeNull();
  });

  it('parses a pasted international number into E.164 and its country', () => {
    expect(PhoneNumberExtensions.parseInternational('+998 (99) 663-25-82', PhoneCountries)).toEqual({
      country: country('UZ'),
      e164: '+998996632582',
    });
    expect(PhoneNumberExtensions.split('+998996632582', PhoneCountries, 'US')).toEqual({
      iso: 'UZ',
      national: '996632582',
    });
  });

  it('strips a dial code typed without its plus only when the digits are exactly dial and national', () => {
    expect(PhoneNumberExtensions.withoutDialCode('998996632582', country('UZ'))).toBe('996632582');
    expect(PhoneNumberExtensions.withoutDialCode('99899663258', country('UZ'))).toBe('99899663258');
    expect(PhoneNumberExtensions.withoutDialCode('493012345678', country('DE'))).toBe('493012345678');
  });

  it('resolves country codes in the order given, ignoring unknown and repeated ones', () => {
    expect(PhoneNumberExtensions.resolveCountries(['KZ', 'XX', 'UZ', 'KZ']).map((c) => c.iso)).toEqual(['KZ', 'UZ']);
    expect(PhoneNumberExtensions.resolveCountries(['XX'])).toBe(PhoneCountries);
    expect(PhoneNumberExtensions.resolveCountries(undefined)).toBe(PhoneCountries);
  });
});
