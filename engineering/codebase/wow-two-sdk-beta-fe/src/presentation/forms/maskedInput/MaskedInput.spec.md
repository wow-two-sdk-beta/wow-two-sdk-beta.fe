# MaskedInput

Renders a text input that reformats typing against a mask — `#` digit, `A` letter, `*` alphanumeric.

Source: [MaskedInput.vue](MaskedInput.vue).

Public import: `import { MaskedInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the state owner and restores the resulting DOM representation; a cancelled reset changes nothing.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type         | Required | Default     | Meaning                                                                                       |
| -------------- | ------------ | -------- | ----------- | --------------------------------------------------------------------------------------------- |
| `size`         | `InputSize`  | no       | —           | The control size.                                                                             |
| `state`        | `InputState` | no       | —           | The validity surface.                                                                         |
| `mask`         | `string`     | yes      | —           | The mask pattern. `#` = digit, `A` = alpha, `*` = alphanumeric, anything else = literal.      |
| `modelValue`   | `string`     | no       | —           | The value, controlled. The `v-model` binding target.                                          |
| `defaultValue` | `string`     | no       | —           | The initial value when uncontrolled.                                                          |
| `id`           | `string`     | no       | —           | The control's id. Auto-filled from `FormControl` context when omitted.                        |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding field's `isDisabled`. |
| `disabled` | `boolean` | no | `undefined` | Deprecated alias of `isDisabled`; removed next release. |
| `isRequired` | `boolean` | no | `undefined` | The required state. Falls back to the surrounding field's `isRequired`. |
| `required` | `boolean` | no | `undefined` | Deprecated alias of `isRequired`; removed next release. |
| `isReadOnly` | `boolean` | no | `undefined` | Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. |
| `readOnly` | `boolean` | no | `undefined` | Deprecated alias of `isReadOnly`; removed next release. |
| `readonly` | `boolean` | no | `undefined` | Deprecated alias of `isReadOnly`; removed next release. |

## Emits

| Event               | Signature                               | Meaning                                                                       |
| ------------------- | --------------------------------------- | ----------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the reader types and the masked text changes — the `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Forms.contract.dom.test.ts](../../../../tests/unit/presentation/forms/Forms.contract.dom.test.ts), [Forms.regression.dom.test.ts](../../../../tests/unit/presentation/forms/Forms.regression.dom.test.ts), [InputInteraction.dom.test.ts](../../../../tests/unit/presentation/forms/InputInteraction.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

Native input attributes and event listeners (including `name`, `form`, `autocomplete`, `onBlur`, `onInput` and keyboard/composition/clipboard events) are represented in the public props type. They remain fallthrough attrs at runtime. Canonical model value, visual size, fixed native type and declared Temporal bounds retain component ownership. Autocomplete accepts its native extensible token string.
