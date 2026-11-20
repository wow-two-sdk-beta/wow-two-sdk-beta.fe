import { MapProvider } from './MapProvider';

/** What names a place to a map: the place's text, its coordinates, or both, plus the language to open the map in. */
export interface MapSearchTarget {
  /** The place's text — a name or an address. The map searches it; no geocoding happens here. */
  readonly query?: string | null;

  /** The latitude in degrees, −90 to 90. Counts only together with a valid `lng`. */
  readonly lat?: number | null;

  /** The longitude in degrees, −180 to 180. Counts only together with a valid `lat`. */
  readonly lng?: number | null;

  /** A BCP-47 tag (`uz`, `ru`, `pt-BR`) for the map's interface; Google honors it, Yandex has no such parameter. */
  readonly locale?: string | null;
}

/** The longest place text a link carries; anything longer is cut, which keeps a URL far under Google's 2,048 limit. */
export const MapQueryMaxLength = 256;

/** The Yandex zoom (1 to 19) a coordinate pin opens at: a street-level view. */
const YandexPinZoom = 16;

const YandexMapsUrl = 'https://yandex.com/maps/';
const GoogleSearchUrl = 'https://www.google.com/maps/search/?api=1';

/** A lone UTF-16 surrogate, which `encodeURIComponent` refuses with a `URIError`. */
const LoneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** A language, then an optional two-letter or three-digit region: `uz`, `pt-BR`, `es-419`. Script tags are dropped. */
const LocaleTag = /^([A-Za-z]{2,3})(?:-[A-Za-z]{4})?(?:-([A-Za-z]{2}|\d{3}))?(?:-|$)/;

/** Collapses whitespace, caps the length and replaces a lone surrogate; returns `undefined` for blank text. */
function normalizeQuery(query: string | null | undefined): string | undefined {
  if (typeof query !== 'string') return undefined;
  const text = query.replace(/\s+/g, ' ').trim().slice(0, MapQueryMaxLength).trim().replace(LoneSurrogate, '�');
  return text === '' ? undefined : text;
}

function isInRange(value: number | null | undefined, limit: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;
}

/** The coordinates when both are valid, rounded to six decimals (about 10 cm) so the URL never carries an exponent. */
function normalizeCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): { readonly lat: string; readonly lng: string } | undefined {
  if (!isInRange(lat, 90) || !isInRange(lng, 180)) return undefined;
  const format = (value: number): string => String(Number(value.toFixed(6)));
  return { lat: format(lat), lng: format(lng) };
}

/** The tag's language and region joined (`pt-BR`), or `undefined` for anything that is not a BCP-47 tag. */
function normalizeLocale(locale: string | null | undefined): string | undefined {
  const match = typeof locale === 'string' ? LocaleTag.exec(locale.trim()) : null;
  if (!match) return undefined;
  const language = match[1]!.toLowerCase();
  const region = match[2];
  return region ? `${language}-${region.toUpperCase()}` : language;
}

/**
 * Builds the `https` URL that opens a place in a map, or `undefined` when the target names no place (no text and no
 * valid coordinate pair).
 *
 * - Yandex: `https://yandex.com/maps/?text={query}` for text; `&pt={lng},{lat}&z=16` adds a pin, and `?pt=…&z=16`
 *   alone is a pin without a search. Yandex takes longitude first.
 * - Google: `https://www.google.com/maps/search/?api=1&query={query}`, or `&query={lat}%2C{lng}` with no text. Google's
 *   `query` holds one thing, so text wins over coordinates when both are given. `&hl={locale}` sets the interface
 *   language.
 * - The text is encoded with `encodeURIComponent`; coordinates are numbers and never need it, except Google's comma.
 *
 * The URL is a search, not a pointer: the map decides what the text means, and may find nothing.
 */
export function mapSearchUrl(provider: MapProvider, target: MapSearchTarget): string | undefined {
  const query = normalizeQuery(target.query);
  const coordinates = normalizeCoordinates(target.lat, target.lng);
  if (query === undefined && coordinates === undefined) return undefined;

  if (provider === MapProvider.Yandex) {
    const parts: string[] = [];
    if (query !== undefined) parts.push(`text=${encodeURIComponent(query)}`);
    if (coordinates !== undefined) parts.push(`pt=${coordinates.lng},${coordinates.lat}`, `z=${YandexPinZoom}`);
    return `${YandexMapsUrl}?${parts.join('&')}`;
  }

  if (provider === MapProvider.Google) {
    const place = query ?? `${coordinates!.lat},${coordinates!.lng}`;
    const locale = normalizeLocale(target.locale);
    return `${GoogleSearchUrl}&query=${encodeURIComponent(place)}${locale ? `&hl=${locale}` : ''}`;
  }

  return undefined;
}
