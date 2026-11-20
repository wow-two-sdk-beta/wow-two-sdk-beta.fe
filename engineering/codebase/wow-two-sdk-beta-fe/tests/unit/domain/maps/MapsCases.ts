import { MapBrandMark, MapLinks } from '@src/domain/maps';
import { smokeCase, type SmokeCase } from '../../../support/Smoke';

/** `domain/maps` — the two SFCs: the row of links by text and by coordinates, and a mark in each variant. */
export const mapsCases: readonly SmokeCase[] = [
  smokeCase('MapLinks (text)', MapLinks, { query: 'Chorsu bazaar, Tashkent' }),
  smokeCase('MapLinks (coordinates, one provider)', MapLinks, { lat: 41.3265, lng: 69.2358, providers: ['google'] }),
  smokeCase('MapLinks (nothing to link)', MapLinks, {}),
  smokeCase('MapBrandMark (color)', MapBrandMark, { provider: 'yandex' }),
  smokeCase('MapBrandMark (monochrome)', MapBrandMark, { provider: 'google', isMonochrome: true, size: 24 }),
];
