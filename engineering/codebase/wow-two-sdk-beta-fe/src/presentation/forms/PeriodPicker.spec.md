# PeriodPicker

Renders the trigger and popover shared by `MonthPicker` and `YearPicker`, in period-index space.

Source: [PeriodPicker.vue](PeriodPicker.vue).

Internal implementation: the public pickers convert their models at the boundary.

## Contract

- The model is a period index (`null` picks nothing) and follows the shared controlled-state helper; picking closes the popover.
- Disabled, read-only and invalid states fall back to the surrounding `Field`, as do the trigger's id, label and description.
- The trigger shows the localized long month and year, or the year, unless `formatIndex` is supplied. Attributes and `class` reach the trigger.
- A `name` ships `serializeIndex(value)` in a hidden input; native form reset restores the default.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `kind` | `PeriodKind` | yes | — | `'month'` or `'year'`. |
| `modelValue` | `number \| null` | no | — | The picked index, controlled. |
| `defaultValue` | `number \| null` | no | `null` | The initial index when uncontrolled. |
| `min` / `max` | `number \| null` | no | `null` | The selectable range. |
| `isIndexDisabled` | `(index: number) => boolean` | no | — | The custom disable predicate. |
| `formatIndex` | `(index: number) => string` | no | — | The trigger formatter. |
| `serializeIndex` | `(index: number) => string` | yes | — | The hidden input serializer. |
| `placeholder` | `string` | yes | — | The trigger text with nothing picked. |
| `size` | `SelectPickerSize` | no | — | The trigger size. |
| `id` | `string` | no | Field id | The trigger id. |
| `isDisabled` / `isReadOnly` / `isInvalid` | `boolean` | no | Field state | The interaction and validity states. |
| `name` | `string` | no | — | The hidden input name. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [index: number \| null];` | Fires when the reader picks a cell. |

## Slots

None declared.

## Exposed handle

`{ el }` — the trigger element.

## Verification

- Exercised through [PeriodPickers.dom.test.ts](../../../tests/unit/presentation/forms/PeriodPickers.dom.test.ts).
