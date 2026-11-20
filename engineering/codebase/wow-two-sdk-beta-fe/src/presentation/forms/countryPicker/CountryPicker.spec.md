# CountryPicker

Renders a searchable picker of countries that stores the ISO 3166-1 alpha-2 code, each country labelled with its flag and its name in the reader's language.

Source: [CountryPicker.vue](CountryPicker.vue) · [CountryPickerOptions.vue](CountryPickerOptions.vue) (the rows, internal) · [CountryPickerExtensions.ts](CountryPickerExtensions.ts).

Public import: `import { CountryPicker } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- The model is the uppercase two-letter code (`'UZ'`), or `null` when cleared. `modelValue` / `update:modelValue` and `defaultValue` follow the shared controlled-state helper through the inner `SelectPicker`.
- The list is every ISO 3166-1 alpha-2 region ([RegionCodes](../../../foundation/i18n/RegionCodes.spec.md)), or `countries` when given: codes are uppercased, unknown ones dropped, duplicates collapsed.
- Names come from `Intl.DisplayNames(locale, { type: 'region' })` in the nearest `LocaleProvider`'s locale, or the `locale` prop. A locale with no data falls back to English. Rows are `flag + name`, sorted by name in that locale. The trigger reads the same, before the list ever opens.
- `preferred` codes list first, in the order given, then a rule, then the rest. A preferred code outside `countries` is dropped. The rule hides while a search narrows the list.
- Search matches the localized name, the English name and the code, ignoring case and combining marks, and treating the apostrophe lookalikes (`'` `ʻ` `ʼ` `‘` `’` `` ` `` `´`) as one: `Uzbekistan`, `Oʻzbekiston`, `O‘zbekiston`, `ozbekiston`, `Узбекистан` and `uz` all find UZ. The search box is always on.
- A value outside `countries` (a stored `'FR'` against a short list) still shows its flag and name; it cannot be picked again once left.
- Closed-trigger typeahead and the hidden form input (`name`) carry the code.
- `isDisabled`, `isReadOnly` and `isInvalid` fall back to the surrounding `Field` like the other pickers. Fallthrough attributes and `class` reach the trigger: give it an `aria-label` or wrap it in a `Field`; `id` and `aria-describedby` land there too.

## Props

| Prop                | Type                    | Required | Default                  | Meaning                                                                            |
| ------------------- | ----------------------- | -------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `modelValue`        | `string \| null`        | no       | —                        | The alpha-2 code, controlled — the `v-model` target.                               |
| `defaultValue`      | `string \| null`        | no       | `null`                   | The initial code when uncontrolled.                                                |
| `preferred`         | `ReadonlyArray<string>` | no       | —                        | The codes listed first, in the order given.                                        |
| `countries`         | `ReadonlyArray<string>` | no       | every region             | The codes to offer.                                                                |
| `locale`            | `string`                | no       | the provider's           | The language the names are written in.                                             |
| `placeholder`       | `string`                | no       | `'Select a country'`     | The trigger text with nothing picked; localized as `CountryPicker.placeholder`.    |
| `searchPlaceholder` | `string`                | no       | `'Search countries…'`    | The search input placeholder; `CountryPicker.searchPlaceholder`.                   |
| `noResultsLabel`    | `string`                | no       | `'No countries found'`   | The text when the search matches nothing; `CountryPicker.noResultsLabel`.          |
| `size`              | `SelectPickerSize`      | no       | —                        | The trigger size.                                                                  |
| `isDisabled`        | `boolean`               | no       | `false`                  | Blocks interaction.                                                                |
| `isReadOnly`        | `boolean`               | no       | `false`                  | Keeps the value but blocks changes.                                                |
| `isInvalid`         | `boolean`               | no       | `false`                  | Styles the trigger as invalid.                                                     |
| `isClearable`       | `boolean`               | no       | `false`                  | Offers a clear button while a country is picked.                                   |
| `name`              | `string`                | no       | —                        | The hidden input name that submits the code.                                       |

## Emits

| Event               | Signature                                    | Meaning                                                              |
| ------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [code: string \| null]` | Fires when the reader picks or clears a country, with the uppercase code or `null`. |

## Slots

None.

## Exposed handle

No explicit exposed handle.

## Verification

- Focused tests: [CountryPicker.dom.test.ts](../../../../tests/unit/presentation/forms/CountryPicker.dom.test.ts) — labels in `uz` / `ru` / `en`, search by localized name, English name, code and apostrophe variants, preferred first with its rule, restricted lists, the emitted code and `null`, form wiring.
- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts) and the `CountryPicker` demo in the playground's forms group.
