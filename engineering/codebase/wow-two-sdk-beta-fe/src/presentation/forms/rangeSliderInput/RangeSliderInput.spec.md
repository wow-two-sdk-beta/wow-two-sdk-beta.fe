# RangeSliderInput

Renders a track with two thumbs that edit one numeric range, dragged or stepped with the keyboard.

Source: [RangeSliderInput.vue](RangeSliderInput.vue).

Public import: `import { RangeSliderInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The range uses the shared controlled-state helper: `modelValue` / `update:modelValue`, seeded by `defaultValue` (default `[min, max]`).
- `update:modelValue` fires on every change during a drag; `commit` fires once when the pointer lifts and after each key step, with the requested range even before a controlled caller applies it.
- A supplied range is shown ordered, clamped to the bounds and snapped to `step`; the component never emits for that normalization.
- The thumbs never cross: the start stays at or below `end - minDistance`. Keep `minDistance` a multiple of `step`.
- Disabled and read-only fall back to the surrounding form control. With `name`, two hidden inputs submit the start then the end; disabled omits them and read-only keeps them.
- Native form reset requests the seed through the value owner.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `RangeSliderValue` | no | `undefined` | The range, controlled. The `v-model` binding target. |
| `defaultValue` | `RangeSliderValue` | no | `[min, max]` | The initial range when uncontrolled. |
| `min` | `number` | no | `0` | The lower bound. |
| `max` | `number` | no | `100` | The upper bound. |
| `step` | `number` | no | `1` | The arrow-key and snapping step; a non-positive step falls back to 1. |
| `largeStep` | `number` | no | a tenth of the span | The Page Up / Page Down step. |
| `minDistance` | `number` | no | `0` | The smallest gap kept between the thumbs. |
| `size` | `RangeSliderInputSize` | no | `'md'` | The track and thumb scale. |
| `formatValue` | `(value: number) => string` | no | — | The thumbs' `aria-valuetext`. |
| `startLabel` | `string` | no | `"Minimum"` | The start thumb's name; localized `RangeSliderInput.startLabel`. |
| `endLabel` | `string` | no | `"Maximum"` | The end thumb's name; localized `RangeSliderInput.endLabel`. |
| `name` | `string` | no | — | The hidden inputs' shared name. |
| `id` | `string` | no | — | The group's id; auto-filled from `FormControl` context. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state; falls back to the form control. |
| `isReadOnly` | `boolean` | no | `undefined` | Prevents changes while keeping the value; falls back to the form control. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: RangeSliderValue];` | Fires on every change while a thumb moves — the `v-model` half. |
| `commit` | `commit: [value: RangeSliderValue];` | Fires once a drag ends or a key moves a thumb, with the settled range. |

## Slots

None declared.

## Exposed handle

`{ el }` — the group element.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [RatingAndRange.dom.test.ts](../../../../tests/unit/presentation/forms/RatingAndRange.dom.test.ts) — thumb bounds, keyboard steps, dragging, RTL, controlled requests, snapping, inactive states, form data and localization.

## Interaction guarantees

- The root is a `role="group"` named by the field label; each thumb is a `role="slider"` whose `aria-valuemin` and `aria-valuemax` follow the other thumb.
- Arrow keys step by `step` (the inline-end arrow and ArrowUp increase), Page Up / Page Down by `largeStep`, Home / End to the reachable edge.
- A press on the track moves the nearer thumb there, focuses it and drags it until release; the end thumb wins when both sit at one value below the press.
- Right to left, the track fills from the right and the inline-end arrow is ArrowLeft.
