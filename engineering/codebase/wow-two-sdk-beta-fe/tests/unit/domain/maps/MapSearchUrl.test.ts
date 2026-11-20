import { describe, expect, it } from 'vitest';
import {
  MapProvider,
  MapProviderNames,
  MapProviders,
  MapQueryMaxLength,
  isMapProvider,
  mapSearchUrl,
} from '@src/domain/maps';
import { MapBrandMarkData } from '@src/domain/maps/MapBrandMarkData';

/*
 * `unit` project (node). The URL builder is a pure function, so each rule is one row. The expected URLs follow the
 * providers' own documentation: Yandex "Launch web version of Yandex Maps" (`text`, `pt` as longitude then latitude,
 * `z`) and Google "Maps URLs" Search (`api=1`, `query`, the comma encoded as `%2C`).
 */

describe('MapProvider', () => {
  it('names the two providers, Yandex first', () => {
    expect(MapProvider).toEqual({ Yandex: 'yandex', Google: 'google' });
    expect([...MapProviders]).toEqual(['yandex', 'google']);
    expect(MapProviderNames).toEqual({ yandex: 'Yandex Maps', google: 'Google Maps' });
  });

  it('freezes the shared tables', () => {
    expect(Object.isFrozen(MapProviders)).toBe(true);
    expect(Object.isFrozen(MapProviderNames)).toBe(true);
  });

  it.each([
    ['yandex', true],
    ['google', true],
    ['Google', false],
    ['bing', false],
    ['', false],
    ['constructor', false],
    ['__proto__', false],
    [null, false],
    [undefined, false],
    [1, false],
  ])('isMapProvider(%j) is %s', (value, expected) => {
    expect(isMapProvider(value)).toBe(expected);
  });
});

describe('mapSearchUrl — text', () => {
  it('builds the Yandex text search', () => {
    expect(mapSearchUrl(MapProvider.Yandex, { query: 'Chorsu bazaar' })).toBe(
      'https://yandex.com/maps/?text=Chorsu%20bazaar',
    );
  });

  it('builds the Google search with api=1', () => {
    expect(mapSearchUrl(MapProvider.Google, { query: 'Chorsu bazaar' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=Chorsu%20bazaar',
    );
  });

  it('encodes with encodeURIComponent: reserved characters, non-Latin text and emoji', () => {
    const query = 'Cafe "A&B" #1, Navoi/12? ñ Чорсу 🙂';
    const encoded = encodeURIComponent(query);
    expect(encoded).not.toMatch(/[&#?/ ,"]/);
    expect(mapSearchUrl('yandex', { query })).toBe(`https://yandex.com/maps/?text=${encoded}`);
    expect(mapSearchUrl('google', { query })).toBe(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
  });

  it('keeps a text that looks like another parameter inside its own value', () => {
    const yandex = new URL(mapSearchUrl('yandex', { query: 'a&pt=1,2&z=3' })!);
    expect([...yandex.searchParams.keys()]).toEqual(['text']);
    expect(yandex.searchParams.get('text')).toBe('a&pt=1,2&z=3');
    const google = new URL(mapSearchUrl('google', { query: 'a&api=2&hl=ru' })!);
    expect([...google.searchParams.keys()]).toEqual(['api', 'query']);
    expect(google.searchParams.get('query')).toBe('a&api=2&hl=ru');
  });

  it('trims and collapses whitespace, newlines included', () => {
    expect(mapSearchUrl('yandex', { query: '  Chorsu \n\t bazaar  ' })).toBe(
      'https://yandex.com/maps/?text=Chorsu%20bazaar',
    );
  });

  it('cuts a text longer than the cap and keeps the URL short', () => {
    const url = mapSearchUrl('google', { query: 'a'.repeat(MapQueryMaxLength * 3) })!;
    expect(new URL(url).searchParams.get('query')).toHaveLength(MapQueryMaxLength);
    expect(url.length).toBeLessThan(2048);
  });

  it('replaces a lone surrogate instead of throwing', () => {
    expect(mapSearchUrl('yandex', { query: 'a\uD800b' })).toBe('https://yandex.com/maps/?text=a%EF%BF%BDb');
    expect(mapSearchUrl('google', { query: 'a\uDC00b' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=a%EF%BF%BDb',
    );
  });
});

describe('mapSearchUrl — coordinates', () => {
  it('builds the Yandex pin with longitude first and z=16', () => {
    expect(mapSearchUrl('yandex', { lat: 41.2995, lng: 69.2401 })).toBe(
      'https://yandex.com/maps/?pt=69.2401,41.2995&z=16',
    );
  });

  it('builds the Google coordinate search with the comma encoded', () => {
    expect(mapSearchUrl('google', { lat: 41.2995, lng: 69.2401 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=41.2995%2C69.2401',
    );
  });

  it('keeps negative values and adds the text to the Yandex pin', () => {
    expect(mapSearchUrl('yandex', { query: 'Pier 39', lat: 37.8087, lng: -122.4098 })).toBe(
      'https://yandex.com/maps/?text=Pier%2039&pt=-122.4098,37.8087&z=16',
    );
  });

  it('lets the text win on Google, whose query holds one thing', () => {
    expect(mapSearchUrl('google', { query: 'Pier 39', lat: 37.8087, lng: -122.4098 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=Pier%2039',
    );
  });

  it('accepts the poles, the antimeridian and zero', () => {
    expect(mapSearchUrl('yandex', { lat: 90, lng: 180 })).toBe('https://yandex.com/maps/?pt=180,90&z=16');
    expect(mapSearchUrl('yandex', { lat: -90, lng: -180 })).toBe('https://yandex.com/maps/?pt=-180,-90&z=16');
    expect(mapSearchUrl('google', { lat: 0, lng: 0 })).toBe('https://www.google.com/maps/search/?api=1&query=0%2C0');
  });

  it('rounds to six decimals and never writes an exponent', () => {
    expect(mapSearchUrl('yandex', { lat: 41.123456789, lng: 69.000000001 })).toBe(
      'https://yandex.com/maps/?pt=69,41.123457&z=16',
    );
    expect(mapSearchUrl('google', { lat: 1e-9, lng: -0 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=0%2C0',
    );
  });

  it.each<[string, { lat?: number | null; lng?: number | null }]>([
    ['only a latitude', { lat: 41.3 }],
    ['only a longitude', { lng: 69.2 }],
    ['a latitude past 90', { lat: 91, lng: 69.2 }],
    ['a longitude past 180', { lat: 41.3, lng: 181 }],
    ['NaN', { lat: Number.NaN, lng: 69.2 }],
    ['Infinity', { lat: 41.3, lng: Number.POSITIVE_INFINITY }],
    ['nulls', { lat: null, lng: null }],
  ])('builds no URL for %s', (_, target) => {
    expect(mapSearchUrl('yandex', target)).toBeUndefined();
    expect(mapSearchUrl('google', target)).toBeUndefined();
  });

  it('falls back to the text when the coordinates are invalid', () => {
    expect(mapSearchUrl('yandex', { query: 'Chorsu', lat: 95, lng: 69.2 })).toBe(
      'https://yandex.com/maps/?text=Chorsu',
    );
  });
});

describe('mapSearchUrl — nothing to open', () => {
  it.each<[string, Parameters<typeof mapSearchUrl>[1]]>([
    ['an empty target', {}],
    ['a null text', { query: null }],
    ['an empty text', { query: '' }],
    ['a blank text', { query: ' \n\t ' }],
    ['a locale alone', { locale: 'uz' }],
  ])('returns undefined for %s', (_, target) => {
    expect(mapSearchUrl('yandex', target)).toBeUndefined();
    expect(mapSearchUrl('google', target)).toBeUndefined();
  });

  it('returns undefined for a provider it does not know', () => {
    expect(mapSearchUrl('bing' as never, { query: 'Chorsu' })).toBeUndefined();
  });

  it('always returns an https URL on the provider host', () => {
    for (const provider of MapProviders) {
      const url = new URL(mapSearchUrl(provider, { query: 'Chorsu', lat: 41.3, lng: 69.2 })!);
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe(provider === 'yandex' ? 'yandex.com' : 'www.google.com');
    }
  });
});

describe('mapSearchUrl — locale', () => {
  it.each([
    ['uz', 'uz'],
    ['UZ', 'uz'],
    ['ru-RU', 'ru-RU'],
    ['pt-br', 'pt-BR'],
    ['es-419', 'es-419'],
    ['uz-Latn', 'uz'],
    ['uz-Latn-UZ', 'uz-UZ'],
    ['  en  ', 'en'],
  ])('passes %s to Google as hl=%s', (locale, hl) => {
    expect(mapSearchUrl('google', { query: 'Chorsu', locale })).toBe(
      `https://www.google.com/maps/search/?api=1&query=Chorsu&hl=${hl}`,
    );
  });

  it.each(['', 'english', 'en_US', 'x', '12', '"><script>', 'en&hl=ru'])(
    'ignores the malformed locale %j',
    (locale) => {
      expect(mapSearchUrl('google', { query: 'Chorsu', locale })).toBe(
        'https://www.google.com/maps/search/?api=1&query=Chorsu',
      );
    },
  );

  it('leaves the Yandex URL alone, which has no language parameter', () => {
    expect(mapSearchUrl('yandex', { query: 'Chorsu', locale: 'uz' })).toBe('https://yandex.com/maps/?text=Chorsu');
  });
});

describe('the vendored mark data', () => {
  const arts = MapProviders.flatMap((provider) => [
    { name: `${provider} color`, art: MapBrandMarkData[provider].color, mono: false },
    { name: `${provider} mono`, art: MapBrandMarkData[provider].mono, mono: true },
  ]);

  it('has both variants for each provider and no other', () => {
    expect(Object.keys(MapBrandMarkData).sort()).toEqual([...MapProviders].sort());
  });

  it.each(arts)('$name has a square viewBox and path data of drawing commands only', ({ art }) => {
    expect(art.viewBox).toMatch(/^0 0 (\d+) \1$/);
    expect(art.shapes.length).toBeGreaterThan(0);
    for (const shape of art.shapes) expect(shape.d).toMatch(/^[MmLlHhVvCcSsQqTtAaZz\d\s.,-]+$/);
  });

  it.each(arts.filter((entry) => entry.mono))('$name paints nothing but currentColor', ({ art }) => {
    for (const shape of art.shapes) expect(shape.fill).toBe('currentColor');
  });

  it.each(arts.filter((entry) => !entry.mono))('$name paints hex colors', ({ art }) => {
    for (const shape of art.shapes) expect(shape.fill).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('keeps the brand colors of the sources', () => {
    expect(MapBrandMarkData.google.color.shapes.map((shape) => shape.fill)).toEqual(['#4285F4']);
    expect(MapBrandMarkData.yandex.color.shapes.map((shape) => shape.fill)).toEqual(['#FF4433', '#FFFFFF']);
  });

  it('cuts the Yandex dot out of the mono pin with evenodd, from the same two paths', () => {
    const [pin, dot] = MapBrandMarkData.yandex.color.shapes;
    expect(MapBrandMarkData.yandex.mono.shapes).toEqual([
      { d: `${pin!.d}${dot!.d}`, fill: 'currentColor', fillRule: 'evenodd' },
    ]);
  });

  it('draws the same Google paths in both variants', () => {
    expect(MapBrandMarkData.google.mono.shapes[0]!.d).toBe(MapBrandMarkData.google.color.shapes[0]!.d);
  });
});
