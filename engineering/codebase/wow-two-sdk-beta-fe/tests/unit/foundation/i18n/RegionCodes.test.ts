import { describe, expect, it } from 'vitest';
import { isRegionCode, RegionCodes, regionFlag, regionName } from '@src/foundation/i18n';

describe('RegionCodes', () => {
  it('lists the 249 assigned alpha-2 codes once each, uppercase and sorted', () => {
    expect(RegionCodes).toHaveLength(249);
    expect(new Set(RegionCodes).size).toBe(249);
    expect(RegionCodes.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
    expect([...RegionCodes].sort()).toEqual([...RegionCodes]);
  });

  it('names every code in English, so none is a typo the runtime cannot resolve', () => {
    const unnamed = RegionCodes.filter((code) => regionName(code, 'en') === code);
    expect(unnamed).toEqual([]);
  });

  it('accepts only assigned, uppercase codes', () => {
    expect(isRegionCode('UZ')).toBe(true);
    expect(isRegionCode('uz')).toBe(false);
    expect(isRegionCode('XX')).toBe(false);
    expect(isRegionCode(undefined)).toBe(false);
  });
});

describe('regionName', () => {
  it('writes a region in the requested language', () => {
    expect(regionName('UZ', 'uz')).toBe('Oʻzbekiston');
    expect(regionName('UZ', 'ru')).toBe('Узбекистан');
    expect(regionName('UZ', 'en')).toBe('Uzbekistan');
    expect(regionName('UZ', 'uz-Cyrl')).toBe('Ўзбекистон');
  });

  it('falls back to English for a locale the runtime has no data for or rejects', () => {
    expect(regionName('UZ', 'xx')).toBe('Uzbekistan');
    expect(regionName('UZ', 'not a locale')).toBe('Uzbekistan');
    expect(regionName('UZ')).toBe('Uzbekistan');
  });

  it('returns the code itself for a code nothing names', () => {
    expect(regionName('AA', 'en')).toBe('AA');
  });
});

describe('regionFlag', () => {
  it('spells the flag from the two letters', () => {
    expect(regionFlag('UZ')).toBe('🇺🇿');
    expect(regionFlag('uz')).toBe('🇺🇿');
  });

  it('is empty for anything but two letters', () => {
    expect(regionFlag('')).toBe('');
    expect(regionFlag('U')).toBe('');
    expect(regionFlag('UZB')).toBe('');
    expect(regionFlag('1Z')).toBe('');
  });
});
