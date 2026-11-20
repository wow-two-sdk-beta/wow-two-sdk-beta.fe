# MapLinks

Source: [MapLinks.vue](MapLinks.vue), [MapBrandMark.vue](MapBrandMark.vue), [MapSearchUrl.ts](MapSearchUrl.ts), [MapProvider.ts](MapProvider.ts), [MapBrandMarkData.ts](MapBrandMarkData.ts) (vendored). Exported from `domain/maps`, subpath `@wow-two-beta/fe/domain/maps`; not part of the root barrel.

Renders an inline row of icon-only links that open a place in Yandex Maps and Google Maps, such as right after an event's location text. Each link searches the place's text in that map, so no geocoding is needed; the map decides what the text means and may find nothing. Flagging places neither map finds belongs to a later Locations domain, not here. First consumers: the SCFD console beside an extracted event's location, then Ocharo's event pages.

## Props

| Prop          | Type                         | Default            | Meaning                                                                                              |
| ------------- | ---------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `query`       | `string \| null`             | —                  | The place's text, a name or an address. Whitespace is collapsed; blank counts as absent.             |
| `lat`         | `number \| null`             | —                  | The latitude, −90 to 90. Counts only together with a valid `lng`.                                    |
| `lng`         | `number \| null`             | —                  | The longitude, −180 to 180. Counts only together with a valid `lat`.                                 |
| `providers`   | `ReadonlyArray<MapProvider>` | `['yandex', 'google']` | The maps to link, in display order. An unknown or repeated provider is skipped.                  |
| `size`        | `number`                     | `16`               | Pixel size of each mark. A value that is not a positive number draws 16.                             |
| `locale`      | `string \| null`             | —                  | A BCP-47 tag for the map's interface language; only Google honors it (see URL formats).              |
| `yandexLabel` | `string`                     | `Open in Yandex Maps` | The Yandex link's accessible name and tooltip.                                                    |
| `googleLabel` | `string`                     | `Open in Google Maps` | The Google link's accessible name and tooltip.                                                    |

Other attributes fall through to the row (`inheritAttrs: false`; `class` merges through `cn`).

## Anatomy

- The row is a `<span data-map-links>`: `relative z-20 inline-flex items-center gap-0.5 align-middle`. It renders nothing, not even an empty element, when no URL can be built: no text and no valid coordinate pair, or no provider left.
- Each link is an `<a data-map-provider="yandex|google">` in the caller's provider order, Yandex first by default: `href` the search URL, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label` and `title` the same name. It holds one `MapBrandMark` and no text.
- The hit area is the mark plus `p-1` on each side: 24px at the default size.
- Each link stacks two marks in one grid cell, both `aria-hidden`: the monochrome mark (`data-variant="mono"`, `currentColor`, `opacity-60`) and the brand-colored one (`data-variant="color"`, `opacity-0`). At rest the muted mark shows in the surrounding text color, so it stays legible on a light page and on a dark MediaCard panel; on `:hover` and `:focus-visible` of the link the two swap, an opacity fade under `motion-safe` only. Keyboard focus also draws a 2px `outline-ring` ring with a 1px offset. A gray filter would tie the muted state to one fixed gray, and it read as near-invisible on the dark panel.
- Both links are ordinary tab stops, in provider order.

## Names and i18n

The names resolve through the SDK's locale pattern (`useLocaleDefaults`): a `yandexLabel` or `googleLabel` prop wins; else the nearest `LocaleProvider` answers the keys `MapLinks.yandexLabel` and `MapLinks.googleLabel`; else the English fallback above. The SDK ships no translations of its own, so a product supplies them through `LocaleProvider` `messages`.

## Inside a card

The row sits above a stretched card link, the MediaCard convention for controls above the link: `z-20`, over the panel's `z-10` link. It also stops a click, so an enclosing handler never sees it:

- `click` and `auxclick` are stopped on the row, so a click on a link or in the gap between the links never reaches a card's own handler.
- The default action stays: the link opens its map. Nothing calls `preventDefault`.
- A `click` handler the caller puts on the row still runs.

## MapBrandMark

`MapBrandMark` draws one provider's mark as inline SVG, with no network request.

| Prop           | Type          | Default | Meaning                                                                  |
| -------------- | ------------- | ------- | ------------------------------------------------------------------------ |
| `provider`     | `MapProvider` | —       | `yandex` or `google`. Any other value draws nothing.                     |
| `size`         | `number`      | `16`    | Pixel size of the square mark. A caller `class` (`size-8`) overrides it. |
| `isMonochrome` | `boolean`     | `false` | Paints with `currentColor` instead of the brand's colors.                |
| `label`        | `string`      | —       | The accessible name. Absent or empty: decorative (`aria-hidden`).        |

The root is an `<svg>` carrying `data-map-provider` and `data-variant` (`color` or `mono`). Without `label` it is `aria-hidden="true"` with no role; with it, `role="img"` and `aria-label`. It is never focusable. Other attributes fall through to the root.

| Provider | Color variant                                 | Monochrome variant                                       |
| -------- | --------------------------------------------- | -------------------------------------------------------- |
| `yandex` | red pin `#FF4433` with a white dot            | one `currentColor` pin, the dot cut out (`evenodd`)      |
| `google` | the pin in Google Maps blue `#4285F4`, one color | the same pin in `currentColor`                        |

Google's own artwork has four colors; simple-icons holds one color per brand, so the color variant paints the whole pin in its brand blue.

### Marks and their terms

The marks are vendored by hand into `MapBrandMarkData.ts`, whose header repeats this table. The path data is copied, never drawn; change a mark only by re-copying it from its source.

| Mark   | Source                                                                                                                  | Terms                                                                                                                                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| google | simple-icons 16.38.0, `icons/googlemaps.svg`, brand color from `data/simple-icons.json`                                  | simple-icons is CC0 1.0. Its disclaimer says CC0 does not extend to a brand; the entry has no per-icon `license` field and cites Wikimedia Commons `File:Google_Maps_icon.svg` (public domain, trademarked) as its source. The pin is Google's trademark. |
| yandex | the service's favicon `https://yandex.ru/maps/favicon.svg`, as mirrored by Commons `File:Yandex_Maps_icon.svg` (author Yandex LLC) | Commons tags it public domain (`PD-textlogo`, simple geometry) and trademarked. Yandex grants no licence for it: its logo rules cover the Yandex logo for non-commercial use and require written permission for anything else, and do not name the Maps pin. |

Neither mark carries a licence from its brand owner. Both are public-domain as artwork by Commons' reading, and both stay trademarks. Use them only to label a link that opens that map, never to suggest a partnership. If a product needs a stronger footing, ask Yandex for written permission (`pr@yandex-team.ru`, per its logo rules) before it ships a commercial surface.

## URL formats

`mapSearchUrl(provider, { query?, lat?, lng?, locale? })` returns an `https` URL, or `undefined` when the target names no place. It reaches no network.

| Provider | Text                                                    | Coordinates                                                 | Both                                                                  |
| -------- | ------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `yandex` | `https://yandex.com/maps/?text={query}`                  | `https://yandex.com/maps/?pt={lng},{lat}&z=16`              | `https://yandex.com/maps/?text={query}&pt={lng},{lat}&z=16`           |
| `google` | `https://www.google.com/maps/search/?api=1&query={query}` | `https://www.google.com/maps/search/?api=1&query={lat}%2C{lng}` | the text wins: Google's `query` holds one thing                       |

Rules:

- `query` is trimmed, its whitespace collapsed, cut at 256 characters (`MapQueryMaxLength`) and stripped of lone surrogates, then encoded with `encodeURIComponent`. A text that looks like another parameter (`a&pt=1,2`) stays inside its own value.
- Coordinates count only as a pair, both finite, `lat` within ±90 and `lng` within ±180; anything else is ignored, and the text, if any, still opens. They are rounded to six decimals, so a URL never carries an exponent. Yandex takes longitude first; Google takes latitude first, its comma encoded as `%2C`.
- `locale` is read as a BCP-47 tag and reduced to its language and region (`uz-Latn-UZ` → `uz-UZ`); anything malformed is dropped. Google gets `&hl={locale}`. Yandex has no documented language parameter, so its URL stays the same.
- No query and no valid coordinate pair, or an unknown provider, returns `undefined`.

Sources, read 2026-11-20:

- Yandex, "Launch web version of Yandex Maps": https://yandex.com/dev/yandex-apps-launch-maps/doc/en/concepts/yandexmaps-web — `text` finds objects, `pt` places a placemark as longitude then latitude, `z` is the zoom from 1 to 19, and `ll` is the map center, which defaults to `pt`. The docs' examples use `yandex.ru/maps`; `yandex.com/maps` answers `302` to the visitor's regional domain with the query intact (checked: `yandex.com/maps/?text=…` → `yandex.uz/maps/?text=…`), so the SDK uses the `.com` host.
- Google, "Maps URLs", Search: https://developers.google.com/maps/documentation/urls/get-started — `https://www.google.com/maps/search/?api=1&query=…`, `api=1` required, `query` a place name, an address or coordinates, the comma encoded as `%2C`, spaces as `%20` or `+`, a URL limit of 2,048 characters. The page names no language parameter; `hl` is Google's general interface-language parameter, passed on trust and ignored if unsupported.

## Existing verification

`tests/unit/domain/maps/`: `MapSearchUrl.test.ts` (the URL tables above, encoding, coordinates and their limits, the empty cases, locale, the provider enum, and the vendored data: path commands, colors, `currentColor` in the mono marks, the Yandex dot cut-out), `MapLinks.dom.test.ts` (links, order, `providers`, `target` and `rel`, names, locale-provider names, size, the stacked marks and their swap classes, nothing rendered, clicks not bubbling to a card, default action kept, `MapBrandMark` variants, label and unknown provider) and `MapLinks.ssr.test.ts` (server render with no DOM globals) and `MapLinks.browser.test.ts` (chromium, forced colors and webkit: inside a linked MediaCard the pointer meets a map link above the card link and a click never reaches the card, 24px hit areas, the rest and hover opacities, the focus ring; Firefox did not launch in the authoring sandbox). The gallery shows the links and every mark under `display` (`MapLinks`).
