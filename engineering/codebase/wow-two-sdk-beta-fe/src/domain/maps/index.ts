// maps — domain module. Links that open a place in Yandex Maps and Google Maps: the URL builder, each map's brand mark
// and the row of icon links. The marks are vendored in `MapBrandMarkData.ts` with their sources; nothing here
// reaches a network or a browser API.

export { default as MapLinks, type MapLinksProps } from './MapLinks.vue';
export { default as MapBrandMark, type MapBrandMarkProps } from './MapBrandMark.vue';
export { MapProvider, MapProviderNames, MapProviders, isMapProvider } from './MapProvider';
export { MapQueryMaxLength, mapSearchUrl, type MapSearchTarget } from './MapSearchUrl';
