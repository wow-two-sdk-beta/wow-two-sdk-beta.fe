# ComboboxPicker

Renders a type-to-filter picker — the input and panel children, plus the hidden input carrying the value.

Source: [ComboboxPicker.vue](ComboboxPicker.vue).

Public import: `import { ComboboxPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop                | Type      | Required | Default     | Meaning                                                                                                    |
| ------------------- | --------- | -------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `modelValue`        | `string`  | no       | `undefined` | The selected value, controlled. The `v-model` binding target.                                              |
| `defaultValue`      | `string`  | no       | —           | The initial selected value when uncontrolled.                                                              |
| `inputValue`        | `string`  | no       | `undefined` | The typed text, controlled. The `v-model:input-value` binding target.                                      |
| `defaultInputValue` | `string`  | no       | —           | The initial typed text when uncontrolled.                                                                  |
| `isDisabled`        | `boolean` | no       | `false`     | The disabled state. Default `false`.                                                                       |
| `isInvalid`         | `boolean` | no       | `undefined` | The invalid surface flag handed to `ComboboxPickerInput`.                                                  |
| `name`              | `string`  | no       | —           | The hidden input name; the hidden input emits the selected value.                                          |
| `defaultOpen`       | `boolean` | no       | `false`     | The initial open state of the panel when uncontrolled.                                                     |
| `open`              | `boolean` | no       | `undefined` | The panel open state, controlled. The `v-model:open` binding target.                                       |
| `canFillInputOnSelect` | `boolean` | no       | `true`      | The fill-on-select behavior — when the user picks an item, set the input value to its label. Default true. |
| `fillInputOnSelect` | `boolean` | no       | —           | Deprecated — use `canFillInputOnSelect`; removed next release.                                             |

## Emits

| Event               | Signature                               | Meaning                                                                                        |
| ------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the reader commits an option by click or Enter — the `v-model` half.                |
| `update:inputValue` | `'update:inputValue': [input: string];` | Fires when the reader types in the box, or a pick refills it — the `v-model:input-value` half. |
| `update:open`       | `'update:open': [open: boolean];`       | Fires when the reader opens or dismisses the option panel — the `v-model:open` half.           |

## Slots

| Slot      | Signature            | Meaning                     |
| --------- | -------------------- | --------------------------- |
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Field disabled/read-only state is checked at mutation boundaries, including synthetic events. Read-only prevents edits without discarding the current value. Where a named hidden mirror is provided, it forwards `form`, omits disabled values and retains read-only values. Localizable default labels follow LocaleProvider while explicit caller text takes precedence.
