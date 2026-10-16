# YearPicker

Renders a trigger that opens a decade page of years and shows the picked year.

Source: [YearPicker.vue](YearPicker.vue) · shared parts: [PeriodPicker.vue](../PeriodPicker.vue), [PeriodGrid.vue](../PeriodGrid.vue).

Public import: `import { YearPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The model is the year as a number, or `null`. `modelValue` / `update:modelValue` and `defaultValue` follow the shared controlled-state helper; picking closes the popover.
- A page shows one decade (`2020 – 2029`) framed by the years either side; picking a framing year turns the page to it. Keyboard and paging follow [PeriodGrid](../PeriodGrid.spec.md).
- The page opens on the picked year's decade, else the current year clamped into `min`/`max`.
- Disabled, read-only and invalid states fall back to the surrounding `Field`; attributes and `class` reach the trigger.
- A `name` ships the year's digits in a hidden input; native form reset restores the default.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `number \| null` | no | — | The picked year, controlled — the `v-model` target. |
| `defaultValue` | `number \| null` | no | `null` | The initial year when uncontrolled. |
| `min` | `number \| null` | no | `null` | The earliest selectable year. |
| `max` | `number \| null` | no | `null` | The latest selectable year. |
| `isYearDisabled` | `(year: number) => boolean` | no | — | The custom per-year disable predicate. |
| `format` | `(year: number) => string` | no | — | The trigger formatter. |
| `placeholder` | `string` | no | `'Pick a year'` | The trigger text with no year picked; localized as `YearPicker.placeholder`. |
| `size` | `SelectPickerSize` | no | — | The trigger size. |
| `id` | `string` | no | Field id | The trigger id. |
| `isDisabled` | `boolean` | no | Field state | Blocks interaction. |
| `isReadOnly` | `boolean` | no | Field state | Keeps the value but blocks changes. |
| `isInvalid` | `boolean` | no | Field state | Styles the trigger as invalid. |
| `name` | `string` | no | — | The hidden input name. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [year: number \| null];` | Fires when the reader picks a year. |

## Slots

None.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [PeriodPickers.dom.test.ts](../../../../tests/unit/presentation/forms/PeriodPickers.dom.test.ts) — decade paging, framing years, range edges and keyboard moves.
