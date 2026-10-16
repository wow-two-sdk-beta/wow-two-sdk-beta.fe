import { describe, expect, it } from 'vitest';
import {
  capitalize,
  formatBytes,
  formatDuration,
  initials,
  maskString,
  ordinal,
  pluralize,
  slugify,
  titleCase,
  truncate,
} from '@src/foundation/formatters';

/*
 * Smoke depth, `unit` project (node). Every helper here is pure and locale-free by design —
 * locale-aware number / date formatting lives in `foundation/i18n`, so nothing below depends on
 * the ambient locale.
 */

describe('formatBytes', () => {
  it('formats SI sizes by default and IEC on request', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1000)).toBe('1 KB');
    expect(formatBytes(1024, { binary: true })).toBe('1 KiB');
  });

  it('rejects a non-finite input rather than rendering `NaN B`', () => {
    expect(() => formatBytes(Number.NaN)).toThrow(RangeError);
  });
});

describe('formatDuration', () => {
  it('renders elapsed milliseconds compactly', () => {
    expect(formatDuration(0)).toBeTypeOf('string');
    expect(formatDuration(90_000)).toContain('1');
  });
});

describe('text helpers', () => {
  it('truncates only past the limit, and marks that it did', () => {
    expect(truncate('short', 20)).toBe('short');
    const cut = truncate('a much longer sentence than the limit', 10);
    expect(cut.length).toBeLessThanOrEqual(10);
    expect(cut).not.toBe('a much longer sentence than the limit');
  });

  it('capitalizes and title-cases', () => {
    expect(capitalize('hello world')).toBe('Hello world');
    expect(titleCase('hello world')).toBe('Hello World');
  });

  it('slugifies to a url-safe token', () => {
    expect(slugify('Hello, World! 2026')).toBe('hello-world-2026');
  });

  it('treats custom slug separators literally and removes only source edge punctuation', () => {
    expect(slugify('! Héllo, World! ', { separator: '' })).toBe('helloworld');
    expect(slugify('!Hello World!', { separator: '$&' })).toBe('hello$&world');
    expect(slugify('!Hello World!', { separator: '$`' })).toBe('hello$`world');
    expect(slugify('!Hello World!', { separator: '.*' })).toBe('hello.*world');
    expect(slugify('abc!def!', { separator: 'ab' })).toBe('abcabdef');
    expect(slugify('?!', { separator: '' })).toBe('');
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 2.5])(
    'masks the entire secret for invalid visibility %s',
    (visible) => {
      expect(maskString('secret-value', { visible })).toBe('•'.repeat(12));
      expect(maskString('secret-value', { visible, side: 'start' })).toBe('•'.repeat(12));
    },
  );

  it('masks everything for zero visibility and preserves a valid prefix count', () => {
    expect(maskString('secret-value', { visible: 0 })).toBe('•'.repeat(12));
    expect(maskString('secret-value', { visible: 3, side: 'start' })).toBe('sec' + '•'.repeat(9));
  });

  it('derives initials from a name', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
  });

  it('masks all but the tail of a secret', () => {
    const masked = maskString('4111111111111111');
    expect(masked).not.toBe('4111111111111111');
    expect(masked).toContain('1111');
  });
});

describe('count helpers', () => {
  it('pluralizes on the count', () => {
    expect(pluralize(1, 'item')).toBe('item');
    expect(pluralize(2, 'item')).toBe('items');
  });

  it('ordinalizes, including the 11–13 exceptions', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
  });
});
