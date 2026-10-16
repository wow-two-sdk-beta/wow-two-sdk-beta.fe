# PinInput

Renders a row of single-character PIN cells with auto-advance, paste-spread and backspace-to-previous.

Source: [PinInput.vue](PinInput.vue).

Public import: `import { PinInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type           | Required | Default                | Meaning                                                                                             |
| -------------- | -------------- | -------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| `length`       | `number`       | no       | `6`                    | The number of digit cells. Default 6.                                                               |
| `modelValue`   | `string`       | no       | —                      | The value, controlled (full string). The `v-model` binding target.                                  |
| `defaultValue` | `string`       | no       | —                      | The uncontrolled initial value.                                                                     |
| `type`         | `PinInputType` | no       | `PinInputType.Numeric` | The allowed characters — digits (`numeric`) or any single char (`alphanumeric`). Default `numeric`. |
| `size`         | `Size`         | no       | `SizeValue.Md`         | The cell visual size. Default `md`.                                                                 |
| `isMasked`     | `boolean`      | no       | `undefined`            | The masked mode — renders each cell as `*` (good for verification codes).                           |
| `isDisabled`   | `boolean`      | no       | `undefined`            | The disabled state. Falls back to the surrounding form control's `isDisabled`.                      |

## Emits

| Event               | Signature                               | Meaning                                                                          |
| ------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the reader types, pastes or deletes a character — the `v-model` half. |
| `complete`          | `complete: [value: string];`            | Fires when the reader fills the final cell, carrying the complete code.          |

## Slots

None declared.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Reset regressions: [CompositeReset.dom.test.ts](../../../../tests/unit/presentation/forms/CompositeReset.dom.test.ts).

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Forms.contract.dom.test.ts](../../../../tests/unit/presentation/forms/Forms.contract.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Field disabled/read-only state is checked at mutation boundaries, including synthetic events. Read-only prevents edits without discarding the current value. Where a named hidden mirror is provided, it forwards `form`, omits disabled values and retains read-only values. Localizable default labels follow LocaleProvider while explicit caller text takes precedence.
