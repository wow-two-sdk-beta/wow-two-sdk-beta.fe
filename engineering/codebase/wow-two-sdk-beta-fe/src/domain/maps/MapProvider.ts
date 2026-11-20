/** Defines the web map a link opens a place in. */
export const MapProvider = {
  /** Refers to Yandex Maps, opened through `yandex.com/maps`. */
  Yandex: 'yandex',
  /** Refers to Google Maps, opened through `www.google.com/maps`. */
  Google: 'google',
} as const;

export type MapProvider = (typeof MapProvider)[keyof typeof MapProvider];

/** Every provider, in the order a row of map links shows them by default: Yandex first. */
export const MapProviders: ReadonlyArray<MapProvider> = Object.freeze([MapProvider.Yandex, MapProvider.Google]);

/** The provider's display name, as its owner writes it. */
export const MapProviderNames: Readonly<Record<MapProvider, string>> = Object.freeze({
  [MapProvider.Yandex]: 'Yandex Maps',
  [MapProvider.Google]: 'Google Maps',
});

/** Narrows a value to a known provider; anything else — including `__proto__` or `constructor` — is `false`. */
export function isMapProvider(value: unknown): value is MapProvider {
  return typeof value === 'string' && MapProviders.some((provider) => provider === value);
}
