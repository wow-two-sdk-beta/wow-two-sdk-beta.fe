# FilterSummary

Renders the result pill of a filtered collection: the filters button, the "{matched} out of {total}" count and the
clear button, left to right, in one rounded strip that sits in a tab's filter row.

Source: [FilterSummary.vue](FilterSummary.vue), [FilterSummaryFiltersButton.vue](FilterSummaryFiltersButton.vue).

Public import: `import { FilterSummary, FilterSummaryFiltersButton } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- The layout is fixed: the filters button (sliders icon) on the left, the count in the middle, the clear button (X) on
  the right. The pill is `h-10 rounded-full border border-input bg-field px-1.5`; both buttons are 32px ghost circles
  with a tooltip.
- The count uses the body step of the type ramp (14px `text-sm`), `tabular-nums` and `whitespace-nowrap`, in the muted
  foreground. The badge uses the micro step (10px). Numbers go through the locale's number formatter.
- The count is one polite, atomic live region (`role="status"`). Both forms render inside it; CSS hides the one the
  container does not use, so a reader hears only the visible one.
- `isCounting` keeps the current text in place but invisible, lays a quiet pulsing bar over it and marks the region
  `aria-busy`, so the pill keeps its width until the numbers arrive.
- The clear button is disabled while `isFiltered` is false and emits `clear` only when enabled.
- The default filters button emits `open-filters`. The `filters-trigger` slot replaces it: an app wraps
  `FilterSummaryFiltersButton` in its own trigger with `as-child` (a `ModalTrigger` for a sheet, a `PopoverTrigger`
  for a panel). The button reads `activeFilterCount` and the filters label from the summary around it, and its root is
  the button element, so the trigger's attributes and handlers land on it.
- Above 0 active filters the filters button carries a badge (`99+` above 99), hidden from assistive tech; the
  accessible name becomes `{filters} ({count})`.
- The group is `role="group"` named `Filter results` by default; a fallthrough `aria-label` replaces the name.
  `class` merges through `cn`; other attrs land on the group.

## Container queries

The count reads "{matched} / {total}" when the nearest size-container ancestor (Tailwind `@container`) is narrower than
300px, and "{matched} out of {total}" from 300px. The app marks its filter row or pane `@container`; with no container
around it the pill keeps the full form. It never switches by device class.

| Threshold | Below | At and above | Tested at |
|---|---|---|---|
| 300px | compact count, count box `min-w-12` | full count, count box `min-w-20` | 299px, 300px |

## Touch

Under a coarse pointer (a finger) at one viewport size, against a fine one (a mouse):

| Element | Touch change | Kind |
|---|---|---|
| pill | 40px → 44px tall (`pointer-coarse:h-11`), like the fields beside it in a filter row; width and contents keep their x | visible height |
| filters and clear buttons | none: the 32px box stays; an invisible 44 x 44px hit area (`CoarseHitArea`, through `Button`) takes the tap | hit area |

The pill sets `--coarse-hit-gap: 14px` (twice its 6px padding plus its 1px border), which caps each hit area at the
pill's outer edge: the two hit areas never meet (the count sits between them) and never reach a neighbour of the pill.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `matched` | `number` | yes | — | The items matching the filters in effect. |
| `total` | `number` | yes | — | The items with no filter applied. |
| `isFiltered` | `boolean` | yes | — | The filtered state; the clear button is disabled without it. |
| `isCounting` | `boolean` | no | `false` | The counting state: a quiet placeholder over the kept count box. |
| `activeFilterCount` | `number` | no | `0` | The advanced filters in effect; above 0 the filters button shows a badge. |
| `labels` | `FilterSummaryLabels` | no | — | The words; each one left out falls back to the locale, then to English. |

`FilterSummaryLabels`, with locale keys `FilterSummary.{clear,filters,match,compactMatch}` and `FilterSummary.group`
for the group name:

| Key | Default | Meaning |
|---|---|---|
| `clear` | `Clear filters` | The clear button's accessible name and tooltip. |
| `filters` | `Filters` | The filters button's accessible name and tooltip. |
| `match` | `{matched} out of {total}` | The full count template. |
| `compactMatch` | `{matched} / {total}` | The compact count template. |

`FilterSummaryFiltersButton` takes no props; its attrs and listeners go to the button.

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `open-filters` | `'open-filters': [];` | Fires when the reader presses the default filters button; a `filters-trigger` slot owns its own press. |
| `clear` | `clear: [];` | Fires when the reader presses the enabled clear button. |

## Slots

| Slot | Props | Meaning |
|---|---|---|
| `filters-trigger` | — | Replaces the filters button; wrap `FilterSummaryFiltersButton` in a trigger with `as-child`. |

## Exposed handle

None.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This
  covers render/SSR compatibility, not all interaction behavior.
- Focused tests: [FilterSummary.dom.test.ts](../../../../tests/unit/presentation/forms/FilterSummary.dom.test.ts),
  [FilterSummary.browser.test.ts](../../../../tests/unit/presentation/forms/FilterSummary.browser.test.ts) (the
  300px threshold, the 40px pill, the kept count box) and
  [CoarsePointerPlacement.browser.test.ts](../../../../tests/unit/presentation/CoarsePointerPlacement.browser.test.ts)
  (the declared 44px height, the 44px reach, hit areas inside the pill).
