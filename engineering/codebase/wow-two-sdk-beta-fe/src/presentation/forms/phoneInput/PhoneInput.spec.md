# PhoneInput

Renders a country dial-code select beside a national-number field, emitting one E.164 string.

Source: [PhoneInput.vue](PhoneInput.vue).

Public import: `import { PhoneInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Behavior

- The value is E.164: the selected dial code joined to the national digits (non-digits are dropped).
- With no national digits the value is empty — a dial code alone never submits or satisfies `required`. The chosen
  country is kept, including a shared dial code (`+1` for the US or Canada).
- A value's country is read from its longest matching dial code (`+420` before `+42…`).
- Regression: `tests/unit/presentation/forms/PhoneInput.dom.test.ts`.

## Props

| Prop             | Type      | Required | Default            | Meaning                                                                                  |
| ---------------- | --------- | -------- | ------------------ | ---------------------------------------------------------------------------------------- |
| `modelValue`     | `string`  | no       | `undefined`        | The E.164 value, controlled. The `v-model` binding target.                               |
| `defaultValue`   | `string`  | no       | —                  | The initial E.164 value when uncontrolled.                                               |
| `defaultCountry` | `string`  | no       | `'US'`             | The ISO code selected before the value carries a recognisable dial prefix. Default `US`. |
| `isDisabled`     | `boolean` | no       | `undefined`        | The disabled state. Falls back to the surrounding form control's `isDisabled`.           |
| `isReadOnly`     | `boolean` | no       | `undefined`        | The read-only state. Falls back to the surrounding form control's `isReadOnly`.          |
| `isInvalid`      | `boolean` | no       | `undefined`        | The invalid surface override. Falls back to the surrounding form control's `isInvalid`.  |
| `placeholder`    | `string`  | no       | `'(555) 555-5555'` | The national-number placeholder.                                                         |
| `name`           | `string`  | no       | —                  | The hidden input name; the hidden input emits the full E.164 value.                      |

## Emits

| Event               | Signature                              | Meaning                                                                          |
| ------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [e164: string];` | Fires when the reader edits the number or switches country — the `v-model` half. |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

Native input attributes and event listeners (including `name`, `form`, `autocomplete`, `onBlur`, `onInput` and keyboard/composition/clipboard events) are represented in the public props type. They remain fallthrough attrs at runtime. Canonical model value, visual size, fixed native type and declared Temporal bounds retain component ownership. Autocomplete accepts its native extensible token string.
