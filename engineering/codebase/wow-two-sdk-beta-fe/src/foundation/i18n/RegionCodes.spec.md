# Region codes

The ISO 3166-1 alpha-2 region list and its names. Source: [RegionCodes.ts](RegionCodes.ts).

Public import: `import { RegionCodes, isRegionCode, regionName, regionFlag } from '@wow-two-beta/fe/foundation/i18n';`.

## Contract

- `RegionCodes` is the frozen list of all 249 officially assigned codes, uppercase and alphabetical. `isRegionCode(value)` is true only for a member; `'uz'` is not one.
- `regionName(code, locale?)` writes the region through `Intl.DisplayNames(locale, { type: 'region' })`: `'UZ'` is `Oʻzbekiston` in `uz`, `Узбекистан` in `ru`. A locale the runtime has no data for or rejects falls back to the English name, then to the code itself.
- `regionFlag(code)` spells the flag emoji from the two letters as regional indicator symbols, and is `''` for anything but two letters. A platform without flag glyphs (Windows) draws the two letters.
- Dependency-free data for `CountryPicker`; `AddressEditor` and `PhoneCountries` keep their own lists until they move to this one.

## Verification

- Focused tests: [RegionCodes.test.ts](../../../tests/unit/foundation/i18n/RegionCodes.test.ts) — 249 unique codes, an English name for each, localized names in `uz` / `ru` / `en`, the fallbacks and the flags.
