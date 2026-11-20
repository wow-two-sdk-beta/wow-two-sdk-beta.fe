# FacetBar

Renders the control bar of a filtered feed — a search, inline facet chips with counts, a "Filters" popover for the rest, removable chips for what the popover chose, a clear-all control and a live match-count pill.

Source: [FacetBar.vue](FacetBar.vue) · [FacetBarPicker.vue](FacetBarPicker.vue) (the popover's picker, internal) · [FacetBar.variants.ts](FacetBar.variants.ts).

Public import: `import { FacetBar, FacetKind, FacetPlacement } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- The bar filters nothing. The consumer owns the rows, the query and the counts; the bar renders the facets it is given and reports the reader's choices.
- Facets are a typed definition array: `{ key, label, kind: 'single' | 'multi', placement: 'inline' | 'popover', options: [{ value, label, count?, icon? }] }`. Order is display order; keys are unique.
- Counting rule (the consumer's): count each facet with every other facet's selection applied but not its own, so a facet's chips show what choosing them would match. The bar only renders `count`; it never computes one. Counts come from the server for a feed that scrolls.
- The selection is one `v-model` object keyed by facet key: a `string` for a `single` facet, a `string[]` for a `multi` one. A facet with nothing chosen has no key, so `{}` is "nothing applied". Choosing the chosen value of a `single` facet again clears it.
- Inline facets are `ToggleGroup`s of pills (`options` with `count` and `icon`), named by the facet's `label`. Popover facets sit in a "Filters" popover, one picker each: a `SelectPicker` with an "Any" row for `single` (searchable past 12 options), a `MultiSelectPicker` for `multi`. Each row shows its count.
- Each value chosen in a popover facet shows as a removable chip, `Format: Conference`, whose close button is named `Remove Format: Conference`. Removing the chip clears that value. The "Filters" button carries the number of chips.
- The search is `v-model:search`. "Clear all" shows while a choice or search text exists; it empties the selection and the search, then emits `clear`.
- The pill reads `matchCount` (`12`), or `12 of 72` with `totalCount`, and is absent without `matchCount`. It lives in a region that is always mounted (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`, `data-facet-match`), so a change is announced; an empty region takes no space.
- The `trailing` slot ends the controls row — a sort select, an "Add" button.
- Fallthrough attributes and `class` reach the root.

## Props

| Prop                | Type                              | Required | Default                       | Meaning                                                                              |
| ------------------- | --------------------------------- | -------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| `facets`            | `ReadonlyArray<FacetDefinition>`  | yes      | —                             | The facets, in display order.                                                        |
| `modelValue`        | `FacetSelection`                  | no       | `{}` (uncontrolled)           | The selection — the `v-model` target.                                                |
| `search`            | `string`                          | no       | `''` (uncontrolled)           | The search text — the `v-model:search` target.                                       |
| `matchCount`        | `number`                          | no       | —                             | Rows matching the search and selection; the pill reads it. Omit to hide the pill.    |
| `totalCount`        | `number`                          | no       | —                             | Rows with nothing applied; with `matchCount` the pill reads `12 of 72`.              |
| `isSearchable`      | `boolean`                         | no       | `true`                        | Whether the bar shows the search input.                                              |
| `searchLabel`       | `string`                          | no       | `'Search'`                    | The search input's accessible name; localized as `FacetBar.searchLabel`.             |
| `searchPlaceholder` | `string`                          | no       | `'Search…'`                   | The search placeholder and the long picker's; `FacetBar.searchPlaceholder`.          |
| `filtersLabel`      | `string`                          | no       | `'Filters'`                   | The popover button's text; `FacetBar.filtersLabel`.                                  |
| `clearAllLabel`     | `string`                          | no       | `'Clear all'`                 | The clear control's text; `FacetBar.clearAllLabel`.                                  |
| `anyLabel`          | `string`                          | no       | `'Any'`                       | The picker row that clears a `single` facet; `FacetBar.anyLabel`.                    |
| `selectedLabel`     | `string`                          | no       | `'{count} selected'`          | A `multi` picker's text with choices made; `FacetBar.selectedLabel`.                 |
| `removeLabel`       | `string`                          | no       | `'Remove {facet}: {value}'`   | A chip's close button name; `FacetBar.removeLabel`.                                  |
| `matchLabel`        | `string`                          | no       | `'{matched} of {total}'`      | The pill's text with a total; `FacetBar.matchLabel`.                                 |

Types: `FacetDefinition`, `FacetOption`, `FacetSelection`; `FacetKind` and `FacetPlacement` are `as const` enums (`'single' | 'multi'`, `'inline' | 'popover'`).

## Emits

| Event               | Signature                                          | Meaning                                                    |
| ------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [selection: FacetSelection]` | Fires when the reader changes a choice, with the whole selection. |
| `update:search`     | `'update:search': [search: string]`                | Fires when the reader edits the search.                    |
| `clear`             | `clear: []`                                        | Fires after "Clear all" empties the selection and search.  |

## Slots

| Slot       | Signature             | Meaning                                                      |
| ---------- | --------------------- | ------------------------------------------------------------ |
| `trailing` | `trailing?(): unknown` | The trailing end of the controls row — a sort select, an "Add" button. |

## Exposed handle

No explicit exposed handle.

## Verification

- Focused tests: [FacetBar.dom.test.ts](../../../../tests/unit/presentation/forms/FacetBar.dom.test.ts) — a count rendering and updating, single and multi selection keyed by facet, a popover choice becoming a removable chip and its removal clearing the choice, multi chips, the match pill text updating inside its polite live region, search and clear all, the trailing slot.
- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts) and the `FacetBar` demo in the playground's forms group. This covers render/SSR compatibility, not all interaction behavior.
