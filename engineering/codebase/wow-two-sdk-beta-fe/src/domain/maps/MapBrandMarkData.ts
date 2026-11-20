// VENDORED — the path data below is copied, not drawn. Change a mark only by re-copying it from its source.
//
// google — Google Maps pin.
//   Source:  simple-icons 16.38.0, `icons/googlemaps.svg` (viewBox 0 0 24 24, one path), brand color `#4285F4` from
//            `data/simple-icons.json` (`hex`). npm: https://www.npmjs.com/package/simple-icons/v/16.38.0
//   Color:   simple-icons holds one color per brand, so the color variant paints the whole pin `#4285F4`, not
//            Google's four-color artwork.
//
// yandex — Yandex Maps pin (the service's own favicon).
//   Source:  https://yandex.ru/maps/favicon.svg, as mirrored by Wikimedia Commons `File:Yandex_Maps_icon.svg`
//            (viewBox 0 0 16 16, a red `#FF4433` pin and a white dot), page
//            https://commons.wikimedia.org/wiki/File:Yandex_Maps_icon.svg
//
// The mono variant paints `currentColor`; the Yandex dot becomes a cut-out (`evenodd`) instead of a white disc.

import type { MapProvider } from './MapProvider';

/** One filled path of a mark. */
export interface MapBrandMarkShape {
  /** The path data. */
  readonly d: string;

  /** The fill: a hex color, or `currentColor`. */
  readonly fill: string;

  /** `evenodd` cuts the inner subpath out of the outer one. */
  readonly fillRule?: 'evenodd';
}

/** One drawn variant of a mark: the SVG's viewBox and its filled paths, in paint order. */
export interface MapBrandMarkArt {
  /** The `viewBox` of the mark. */
  readonly viewBox: string;

  /** The filled paths, painted first to last. */
  readonly shapes: ReadonlyArray<MapBrandMarkShape>;
}

/** One provider's marks. */
export interface MapBrandMarkEntry {
  /** The brand-colored mark. */
  readonly color: MapBrandMarkArt;

  /** The single-color mark; it paints with `currentColor`. */
  readonly mono: MapBrandMarkArt;
}

const GooglePin =
  'M19.527 4.799c1.212 2.608.937 5.678-.405 8.173-1.101 2.047-2.744 3.74-4.098 5.614-.619.858-1.244 1.75-1.669 2.727-.141.325-.263.658-.383.992-.121.333-.224.673-.34 1.008-.109.314-.236.684-.627.687h-.007c-.466-.001-.579-.53-.695-.887-.284-.874-.581-1.713-1.019-2.525-.51-.944-1.145-1.817-1.79-2.671L19.527 4.799zM8.545 7.705l-3.959 4.707c.724 1.54 1.821 2.863 2.871 4.18.247.31.494.622.737.936l4.984-5.925-.029.01c-1.741.601-3.691-.291-4.392-1.987a3.377 3.377 0 0 1-.209-.716c-.063-.437-.077-.761-.004-1.198l.001-.007zM5.492 3.149l-.003.004c-1.947 2.466-2.281 5.88-1.117 8.77l4.785-5.689-.058-.05-3.607-3.035zM14.661.436l-3.838 4.563a.295.295 0 0 1 .027-.01c1.6-.551 3.403.15 4.22 1.626.176.319.323.683.377 1.045.068.446.085.773.012 1.22l-.003.016 3.836-4.561A8.382 8.382 0 0 0 14.67.439l-.009-.003zM9.466 5.868L14.162.285l-.047-.012A8.31 8.31 0 0 0 11.986 0a8.439 8.439 0 0 0-6.169 2.766l-.016.018 3.665 3.084z';

const YandexPin =
  'M8 1C4.6862 1 2 3.6862 2 7C2 8.6563 2.6711 10.156 3.7565 11.2417C4.8422 12.328 7.4 13.9 7.55 15.55C7.57249 15.7974 7.7516 16 8 16C8.2484 16 8.42751 15.7974 8.45 15.55C8.6 13.9 11.1578 12.328 12.2435 11.2417C13.3289 10.156 14 8.6563 14 7C14 3.6862 11.3138 1 8 1Z';

const YandexDot =
  'M8.00002 9.10015C9.15982 9.10015 10.1 8.15994 10.1 7.00015C10.1 5.84035 9.15982 4.90015 8.00002 4.90015C6.84023 4.90015 5.90002 5.84035 5.90002 7.00015C5.90002 8.15994 6.84023 9.10015 8.00002 9.10015Z';

/** Every provider's marks, keyed by provider id (`yandex`, `google`). */
export const MapBrandMarkData: Readonly<Record<MapProvider, MapBrandMarkEntry>> = Object.freeze({
  yandex: {
    color: {
      viewBox: '0 0 16 16',
      shapes: [
        { d: YandexPin, fill: '#FF4433' },
        { d: YandexDot, fill: '#FFFFFF' },
      ],
    },
    mono: {
      viewBox: '0 0 16 16',
      shapes: [{ d: `${YandexPin}${YandexDot}`, fill: 'currentColor', fillRule: 'evenodd' }],
    },
  },
  google: {
    color: { viewBox: '0 0 24 24', shapes: [{ d: GooglePin, fill: '#4285F4' }] },
    mono: { viewBox: '0 0 24 24', shapes: [{ d: GooglePin, fill: 'currentColor' }] },
  },
});
