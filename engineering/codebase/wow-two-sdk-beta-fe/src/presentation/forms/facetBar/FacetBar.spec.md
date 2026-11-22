# FacetBar

Renders the control bar of a filtered feed — a search, inline facet chips with counts, a "Filters" popover for the rest, removable chips for what the popover chose, a clear-all control and a live match-count pill.

Source: [FacetBar.vue](FacetBar.vue) · [FacetBarPicker.vue](FacetBarPicker.vue) (the popover's picker, internal) · [FacetBarPill.vue](FacetBarPill.vue) (an inline chip with its hint, internal) · [FacetBar.variants.ts](FacetBar.variants.ts).

Public import: `import { FacetBar, FacetKind, FacetPlacement } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- The bar filters nothing. The consumer owns the rows, the query and the counts; the bar renders the facets it is given and reports the reader's choices.
- Facets are a typed definition array, a union told apart by `kind`: a choice facet `{ key, label, kind: 'single' | 'multi', placement: 'inline' | 'popover', options: [{ value, label, count?, icon?, hint? }] }` (`FacetChoiceDefinition`), or a toggle `{ key, label, kind: 'toggle', placement, count?, icon? }` (`FacetToggleDefinition`, no `options`). Order is display order; keys are unique.
- Counting rule (the consumer's): count each facet with every other facet's selection applied but not its own, so a facet's chips show what choosing them would match. The bar only renders `count`; it never computes one. Counts come from the server for a feed that scrolls.
- The selection is one `v-model` object keyed by facet key: a `string` for a `single` facet, a `string[]` for a `multi` one, `true` for a `toggle` that is on. A facet with nothing chosen, a toggle that is off included, has no key, so `{}` is "nothing applied". Choosing the chosen value of a `single` facet again clears it.
- Inline `single` and `multi` facets are `ToggleGroup`s of pills (one `ToggleGroupItem` per option, with its `count` and `icon`), named by the facet's `label`. Popover facets sit in a "Filters" popover, one picker each: a `SelectPicker` with an "Any" row for `single` (searchable past 12 options), a `MultiSelectPicker` for `multi`. Each row shows its count.
- An option's `hint` (`FacetOptionHint`: `{ description, imageSrc?, imageAlt? }`) gives its inline pill a tooltip, the SDK `Tooltip` wrapping the pill with no wrapper element. The tooltip body is a card about `16rem` wide (`max-w-[calc(100vw-3rem)]` on a narrow screen) on the theme's popover tokens: the option's `icon`, or the larger `imageSrc` image (`imageAlt`, empty by default, since the title beside it names the option), on top; the `label` as the title; the `description`; and, when the option has a `count`, a muted line from `hintCountLabel` (`{count} events`) with the count in the reader's locale. An option without a hint renders the bare pill: no tooltip, no listeners, no extra DOM. Popover pickers show no hints.
- The card opens after `hintOpenDelay` of hover or focus (unset, the `Tooltip`'s own 700 ms) and closes when both leave or on Escape; `hintFadeDuration` (unset, no fade) fades it in and out over that many ms, and `prefers-reduced-motion: reduce` turns the fade off. Both reach the `Tooltip` unchanged; a consumer sets them for a slower, calmer hint.
- A hint is reachable by keyboard focus. On touch nothing new is added: a tap's pointer leaves before the open delay, so the card opens only for a pill that keeps focus. The hint never stops or prevents the pill's own events, so a tap toggles the pill whether or not a card is open; the card sits above the pill (flipping below when there is no room), never over it.
- An inline pill whose `count` is exactly `0` and which is not chosen is muted: `data-empty` on the button, `text-muted-foreground` text and icon at `opacity-60`. It stays pressable, and a chosen pill with count `0` keeps its chosen style (no `data-empty`). A missing `count` is never empty. Popover pickers and toggle chips are not muted.
- A `toggle` facet is one boolean filter — "High priority", "Deadline within 30 days", "Show skipped, rejected" — never a select with one option. Inline it is one pressable pill beside the groups: a `ToggleGroupItem` carrying `aria-pressed`, the `label`, the optional `count` and `icon`, named `High priority 3` with a count. In the popover it is a row, the `label` (and `count`) before a `SwitchInput` named by the `label`; clicking the row flips it. Turning it on stores `true`, turning it off drops the key.
- Each value chosen in a popover facet shows as a removable chip, `Format: Conference`, whose close button is named `Remove Format: Conference`. Removing the chip clears that value. A popover toggle that is on shows one chip with its bare label, `Online only`, closed by `Remove Online only` (`removeToggleLabel`); an inline toggle shows its state on the pill and has no chip. The "Filters" button carries the number of chips.
- The search is `v-model:search`. "Clear all" shows while a choice or search text exists; it empties the selection and the search, then emits `clear`.
- The pill reads `matchCount` (`12`), or `12 of 72` with `totalCount`, and is absent without `matchCount`. It lives in a region that is always mounted (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`, `data-facet-match`), so a change is announced; an empty region takes no space.
- The `trailing` slot ends the controls row, after "Filters" — a sort select, an "Add" button, an overflow menu.
- Layout: from `sm` the first row holds the match pill, the search (capped at `22rem`, no narrower than `12rem`), then "Filters", "Clear all" and the `trailing` slot as one group pushed to the end (`ms-auto`). The inline facets take a full-width row of their own below it (`order-last`, `basis-full`) and wrap onto more rows when they overflow; they never scroll sideways, so no chip leaves view and focus rings are never clipped. Below `sm` the search takes the full width on the first line and the rest stacks under it. The first row holds the pill, search, "Filters" and a sort plus an "Add" button at 1440px with four and five inline chips. The removable chips take a further line only while a popover facet has a choice.
- Fallthrough attributes and `class` reach the root.

## Props

| Prop                | Type                             | Required | Default                     | Meaning                                                                           |
| ------------------- | -------------------------------- | -------- | --------------------------- | --------------------------------------------------------------------------------- |
| `facets`            | `ReadonlyArray<FacetDefinition>` | yes      | —                           | The facets, in display order.                                                     |
| `modelValue`        | `FacetSelection`                 | no       | `{}` (uncontrolled)         | The selection — the `v-model` target.                                             |
| `search`            | `string`                         | no       | `''` (uncontrolled)         | The search text — the `v-model:search` target.                                    |
| `matchCount`        | `number`                         | no       | —                           | Rows matching the search and selection; the pill reads it. Omit to hide the pill. |
| `totalCount`        | `number`                         | no       | —                           | Rows with nothing applied; with `matchCount` the pill reads `12 of 72`.           |
| `isSearchable`      | `boolean`                        | no       | `true`                      | Whether the bar shows the search input.                                           |
| `searchLabel`       | `string`                         | no       | `'Search'`                  | The search input's accessible name; localized as `FacetBar.searchLabel`.          |
| `searchPlaceholder` | `string`                         | no       | `'Search…'`                 | The search placeholder and the long picker's; `FacetBar.searchPlaceholder`.       |
| `filtersLabel`      | `string`                         | no       | `'Filters'`                 | The popover button's text; `FacetBar.filtersLabel`.                               |
| `clearAllLabel`     | `string`                         | no       | `'Clear all'`               | The clear control's text; `FacetBar.clearAllLabel`.                               |
| `anyLabel`          | `string`                         | no       | `'Any'`                     | The picker row that clears a `single` facet; `FacetBar.anyLabel`.                 |
| `selectedLabel`     | `string`                         | no       | `'{count} selected'`        | A `multi` picker's text with choices made; `FacetBar.selectedLabel`.              |
| `removeLabel`       | `string`                         | no       | `'Remove {facet}: {value}'` | A chip's close button name; `FacetBar.removeLabel`.                               |
| `removeToggleLabel` | `string`                         | no       | `'Remove {facet}'`          | A toggle chip's close button name; `FacetBar.removeToggleLabel`.                  |
| `matchLabel`        | `string`                         | no       | `'{matched} of {total}'`    | The pill's text with a total; `FacetBar.matchLabel`.                              |
| `hintCountLabel`    | `string`                         | no       | `'{count} events'`          | A hint card's count line; `{count}` marks the number; `FacetBar.hintCountLabel`.  |
| `hintOpenDelay`     | `number`                         | no       | the `Tooltip`'s, `700`      | How long a pill waits before its hint card opens, in ms.                          |
| `hintFadeDuration`  | `number`                         | no       | —                           | How long a hint card takes to fade in and out, in ms; none by default.            |

Types: `FacetDefinition` (`FacetChoiceDefinition | FacetToggleDefinition`), `FacetOption`, `FacetOptionHint` (`{ description, imageSrc?, imageAlt? }`), `FacetSelection` (`string | string[] | true`, a key absent when nothing is chosen); `FacetKind` and `FacetPlacement` are `as const` enums (`'single' | 'multi' | 'toggle'`, `'inline' | 'popover'`).

## Emits

| Event               | Signature                                          | Meaning                                                           |
| ------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [selection: FacetSelection]` | Fires when the reader changes a choice, with the whole selection. |
| `update:search`     | `'update:search': [search: string]`                | Fires when the reader edits the search.                           |
| `clear`             | `clear: []`                                        | Fires after "Clear all" empties the selection and search.         |

## Slots

| Slot       | Signature              | Meaning                                                                                                   |
| ---------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `trailing` | `trailing?(): unknown` | The trailing end of the controls row, after "Filters" — a sort select, an "Add" button, an overflow menu. |

## Exposed handle

No explicit exposed handle.

## Verification

- Focused tests: [FacetBar.dom.test.ts](../../../../tests/unit/presentation/forms/FacetBar.dom.test.ts) — a count rendering and updating, single and multi selection keyed by facet, an inline toggle pressing and releasing with `aria-pressed`, a popover toggle rendering a switch and becoming a removable chip, a popover choice becoming a removable chip and its removal clearing the choice, multi chips, the match pill text updating inside its polite live region, search and clear all, the trailing slot, an option's hint card (icon, image, label, description and count line after the open delay, none without a hint, a localized count line, keyboard focus, a tap still toggling, `hintOpenDelay` and `hintFadeDuration` reaching the tooltip) and the empty-chip rule (`data-empty` on a `0` count, never on a positive or missing one, nor on a chosen chip, which stays pressable).
- Layout: [FacetBar.browser.test.ts](../../../../tests/unit/presentation/forms/FacetBar.browser.test.ts) — in real Chromium, at 1440px the pill, search, "Filters" and trailing controls share the first row with every inline chip visible below it, the chips wrap at a narrower width without scrolling sideways, the second line of chips opens only with a choice, and a phone-width bar puts the search on its own full-width line; an empty chip draws at `opacity-60` in the muted text token, a hovered chip opens a `16rem` card that does not cover it, and on a 375px screen a focused chip's card stays inside the viewport while a click still toggles a chip.
- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts) and the `FacetBar` demo in the playground's forms group. This covers render/SSR compatibility, not all interaction behavior.
