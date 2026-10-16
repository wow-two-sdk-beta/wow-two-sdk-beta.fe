# MultiSelectPicker

Renders a many-choice dropdown — the popover hosting trigger and panel, plus one hidden input per value.

Source: [MultiSelectPicker.vue](MultiSelectPicker.vue).

Public import: `import { MultiSelectPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop             | Type                                          | Required | Default     | Meaning                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------- | -------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`     | `ReadonlyArray<string>`                       | no       | `undefined` | The selected values, controlled. The `v-model` binding target.                                                                                                                                                                                                                                                                                        |
| `defaultValue`   | `ReadonlyArray<string>`                       | no       | —           | The initial selected values when uncontrolled.                                                                                                                                                                                                                                                                                                        |
| `isDisabled`     | `boolean`                                     | no       | `undefined` | The disabled state. Falls back to the surrounding form control's `isDisabled`.                                                                                                                                                                                                                                                                        |
| `name`           | `string`                                      | no       | —           | The hidden-input name; one hidden input is rendered per selected value.                                                                                                                                                                                                                                                                               |
| `isInvalid`      | `boolean`                                     | no       | `undefined` | The invalid surface override. Falls back to the surrounding form control's `isInvalid`.                                                                                                                                                                                                                                                               |
| `defaultOpen`    | `boolean`                                     | no       | `false`     | The initial open state of the dropdown when uncontrolled.                                                                                                                                                                                                                                                                                             |
| `open`           | `boolean`                                     | no       | `undefined` | The dropdown open state, controlled. The `v-model:open` binding target.                                                                                                                                                                                                                                                                               |
| `placement`      | `Placement`                                   | no       | `'bottom'`  | The floating placement of the dropdown.                                                                                                                                                                                                                                                                                                               |
| `getOptionLabel` | `(value: string) => string \| number \| null` | no       | —           | Resolves a chip label for a value whose row has not mounted yet — `null` when unknown. `MultiSelectPickerItem` registers its label only while the panel is open, so a preselected value renders as its raw key until the first open. Supply this (or open the panel) to label a closed trigger. The mirror of `SelectPicker`'s prop of the same name. |

## Emits

| Event               | Signature                                               | Meaning                                                                                         |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [values: ReadonlyArray<string>];` | Fires when the reader adds or removes a selection — the `v-model` half, carrying the whole set. |
| `update:open`       | `'update:open': [open: boolean];`                       | Fires when the reader opens or dismisses the dropdown — the `v-model:open` half.                |

## Slots

| Slot      | Signature            | Meaning                     |
| --------- | -------------------- | --------------------------- |
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Forms.regression.dom.test.ts](../../../../tests/unit/presentation/forms/Forms.regression.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Field disabled/read-only state is checked at mutation boundaries, including synthetic events. Read-only prevents edits without discarding the current value. Where a named hidden mirror is provided, it forwards `form`, omits disabled values and retains read-only values. Localizable default labels follow LocaleProvider while explicit caller text takes precedence.
