# RatingPicker

Renders a row of marks that picks one rating from 1 to `max`, in whole or half steps.

Source: [RatingPicker.vue](RatingPicker.vue).

Public import: `import { RatingPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The rating uses the shared controlled-state helper: `modelValue` / `update:modelValue`, seeded by `defaultValue`. `null` means no rating and never selects a mode.
- Commit happens on the pick itself; a mouse hover only previews the marks and never emits.
- Each mark holds native radios sharing one `name` (generated when omitted), so arrow keys move the pick and the form receives the value.
- Disabled, read-only and required fall back to the surrounding form control. Disabled radios leave the form data; a read-only rating keeps its value through a hidden input when `name` is set.
- Native form reset requests the seed through the value owner.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `number \| null` | no | `undefined` | The rating, controlled. The `v-model` binding target. |
| `defaultValue` | `number \| null` | no | `null` | The initial rating when uncontrolled. |
| `max` | `number` | no | `5` | The number of marks and the highest rating; rounded and kept within 1–20. |
| `step` | `RatingStep` | no | `1` | The granularity; `0.5` splits each mark into two halves. |
| `isClearable` | `boolean` | no | `true` | Pressing the picked mark again, Backspace or Delete clears the rating. |
| `size` | `RatingPickerSize` | no | `'md'` | The mark size — `sm` 16px · `md` 20px · `lg` 28px. |
| `tone` | `ColorTone` | no | `'warning'` | The fill tone. |
| `icon` | `IconAdapter` | no | star | The mark icon. |
| `formatValue` | `(value: number, max: number) => string` | no | `"{value} of {max}"` | The accessible text for one value; the default is the localized `RatingPicker.valueText`. |
| `name` | `string` | no | generated | The shared radio name submitted with the form. |
| `id` | `string` | no | — | The group's id; auto-filled from `FormControl` context. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state; falls back to the form control. |
| `isReadOnly` | `boolean` | no | `undefined` | Prevents changes while keeping the value; falls back to the form control. |
| `isRequired` | `boolean` | no | `undefined` | The required state; falls back to the form control. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: number \| null];` | Fires when the reader picks or clears a rating — the `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el }` — the group element.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [RatingAndRange.dom.test.ts](../../../../tests/unit/presentation/forms/RatingAndRange.dom.test.ts) — picking, half steps, clearing, preview, read-only, disabled, form data, reset and localization.

## Interaction guarantees

- The editable rating renders `role="radiogroup"` with one visually hidden radio per value, named by the localized value text; the focused mark draws a focus ring.
- A pointer press on the picked value clears it; a keyboard activation never clears, so arrow and Space users keep their pick. Backspace and Delete clear when `isClearable`.
- A read-only rating renders one `role="img"` whose name is the value text, or the localized `RatingPicker.noRating`.
- Half fills clip from the inline start, so right-to-left layouts fill from the right.
