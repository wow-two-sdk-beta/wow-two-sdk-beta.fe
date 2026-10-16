# DurationInput

Renders a duration as one numeric segment per unit — `1 h 30 m` — balanced on blur and stepped with the arrow keys.

Source: [DurationInput.vue](DurationInput.vue).

Public import: `import { DurationInput, DurationUnit } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The model is a `Temporal.Duration`, or `null` when every segment is empty. `modelValue` / `update:modelValue` and `defaultValue` follow the shared controlled-state helper.
- `units` picks the segments (`days`, `hours`, `minutes`, `seconds`); they always render largest first, deduplicated. The largest shown unit takes any size, and smaller ones roll over (60 minutes, 24 hours). Days count as 24 hours; calendar units and sub-second parts of an incoming value are ignored.
- Every emitted duration is balanced over the shown units: typing `90` minutes emits `PT1H30M` at once. The segments keep the reader's text until blur, then show the balanced split. A controlled owner that declines a change sees the segments revert on blur.
- Segments accept digits only (six at most). ArrowUp / ArrowDown step that unit by one, ten with Shift, and stop at zero.
- The segments form a `role="group"`, named by the caller's `aria-label` or the surrounding `Field` label. Each segment is named by its localized long unit (`hours`); the narrow suffix (`h`) is decorative.
- Disabled, read-only and invalid states fall back to the surrounding `Field`, as do the first segment's id and the description. Attributes and `class` reach the group.
- A `name` ships ISO 8601 (`PT1H30M`) in a hidden input; native form reset restores the default.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `Temporal.Duration \| null` | no | — | The duration, controlled — the `v-model` target. |
| `defaultValue` | `Temporal.Duration \| null` | no | `null` | The initial duration when uncontrolled. |
| `units` | `ReadonlyArray<DurationUnit>` | no | `['hours', 'minutes']` | The units to edit. |
| `size` | `InputSize` | no | — | The control size. |
| `id` | `string` | no | Field id | The first segment's id. |
| `isDisabled` | `boolean` | no | Field state | Blocks interaction. |
| `isReadOnly` | `boolean` | no | Field state | Keeps the value but blocks changes. |
| `isInvalid` | `boolean` | no | Field state | Styles the group as invalid and marks each segment `aria-invalid`. |
| `name` | `string` | no | — | The hidden input name. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [duration: Temporal.Duration \| null];` | Fires when the reader types or steps a segment. |

## Slots

None.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [DurationInput.dom.test.ts](../../../../tests/unit/presentation/forms/DurationInput.dom.test.ts) — unit ordering and names, balancing, arrow steps, controlled revert, the ISO value and locked states.
