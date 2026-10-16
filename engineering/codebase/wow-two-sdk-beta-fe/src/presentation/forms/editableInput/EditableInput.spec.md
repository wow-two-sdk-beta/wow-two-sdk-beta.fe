# EditableInput

Renders the inline-edit root, owning the committed value, the draft text and edit mode.

Source: [EditableInput.vue](EditableInput.vue).

Public import: `import { EditableInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop                | Type      | Required | Default           | Meaning                                                                |
| ------------------- | --------- | -------- | ----------------- | ---------------------------------------------------------------------- |
| `modelValue`        | `string`  | no       | `undefined`       | The committed value, controlled. The `v-model` binding target.         |
| `defaultValue`      | `string`  | no       | —                 | The initial committed value when uncontrolled.                         |
| `editing`           | `boolean` | no       | `undefined`       | The edit-mode state, controlled. The `v-model:editing` binding target. |
| `defaultEditing`    | `boolean` | no       | `false`           | The initial edit-mode state when uncontrolled. Default `false`.        |
| `placeholder`       | `string`  | no       | `'Click to edit'` | The preview text shown when the value is empty.                        |
| `canSubmitOnBlur`   | `boolean` | no       | `true`            | Whether blurring the input commits the draft. Default `true`.          |
| `canSubmitOnEnter`  | `boolean` | no       | `true`            | Whether Enter commits the draft. Default `true`.                       |
| `canCancelOnEscape` | `boolean` | no       | `true`            | Whether Escape discards the draft. Default `true`.                     |
| `isDisabled`        | `boolean` | no       | `false`           | The disabled state. Default `false`.                                   |
| `isReadOnly`        | `boolean` | no       | `false`           | The read-only state. Default `false`.                                  |
| `name`              | `string`  | no       | —                 | The hidden input name; the hidden input emits the committed value.     |

## Emits

| Event               | Signature                               | Meaning                                                                     |
| ------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the reader commits the draft — the `v-model` half.               |
| `update:editing`    | `'update:editing': [editing: boolean];` | Fires when the row enters or leaves edit mode — the `v-model:editing` half. |

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
