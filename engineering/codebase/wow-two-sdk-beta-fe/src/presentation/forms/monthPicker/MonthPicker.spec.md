# MonthPicker

Renders a trigger that opens a year page of months and shows the picked month.

Source: [MonthPicker.vue](MonthPicker.vue) · shared parts: [PeriodPicker.vue](../PeriodPicker.vue), [PeriodGrid.vue](../PeriodGrid.vue).

Public import: `import { MonthPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The model is a `Temporal.PlainYearMonth`, or `null`. `modelValue` / `update:modelValue` and `defaultValue` follow the shared controlled-state helper; picking closes the popover.
- The page opens on the picked month's year, else the current year clamped into `min`/`max`. Keyboard and paging follow [PeriodGrid](../PeriodGrid.spec.md).
- The trigger shows the localized long month and year (`September 2026`) unless `format` is supplied.
- Disabled, read-only and invalid states fall back to the surrounding `Field`; attributes and `class` reach the trigger.
- A `name` ships the ISO month (`2026-09`) in a hidden input; native form reset restores the default.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `Temporal.PlainYearMonth \| null` | no | — | The picked month, controlled — the `v-model` target. |
| `defaultValue` | `Temporal.PlainYearMonth \| null` | no | `null` | The initial month when uncontrolled. |
| `min` | `Temporal.PlainYearMonth \| null` | no | `null` | The earliest selectable month. |
| `max` | `Temporal.PlainYearMonth \| null` | no | `null` | The latest selectable month. |
| `isMonthDisabled` | `(month: Temporal.PlainYearMonth) => boolean` | no | — | The custom per-month disable predicate. |
| `format` | `(month: Temporal.PlainYearMonth) => string` | no | — | The trigger formatter. |
| `placeholder` | `string` | no | `'Pick a month'` | The trigger text with no month picked; localized as `MonthPicker.placeholder`. |
| `size` | `SelectPickerSize` | no | — | The trigger size. |
| `id` | `string` | no | Field id | The trigger id. |
| `isDisabled` | `boolean` | no | Field state | Blocks interaction. |
| `isReadOnly` | `boolean` | no | Field state | Keeps the value but blocks changes. |
| `isInvalid` | `boolean` | no | Field state | Styles the trigger as invalid. |
| `name` | `string` | no | — | The hidden input name. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [month: Temporal.PlainYearMonth \| null];` | Fires when the reader picks a month. |

## Slots

None.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [PeriodPickers.dom.test.ts](../../../../tests/unit/presentation/forms/PeriodPickers.dom.test.ts) — labels, paging, keyboard, range edges, the hidden ISO value and localization.
