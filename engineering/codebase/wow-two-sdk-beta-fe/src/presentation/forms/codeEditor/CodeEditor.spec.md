# CodeEditor

Renders a source-code textarea with a synced line-number gutter and Tab/Shift-Tab indenting, unhighlighted.

Source: [CodeEditor.vue](CodeEditor.vue).

Public import: `import { CodeEditor } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Tab indents by default. Escape then Tab or Shift+Tab leaves the editor; canIndentOnTab=false preserves native Tab.
- The visible keyboard instruction is included in aria-describedby alongside existing help.
- IME composition does not trigger indentation or input conversion before compositionend.
- Native form reset requests the original seed through the state owner and restores the resulting DOM representation; a cancelled reset changes nothing.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop                | Type      | Required | Default                                         | Meaning                                                                                       |
| ------------------- | --------- | -------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `modelValue`        | `string`  | no       | `undefined`                                     | The source text, controlled. The `v-model` binding target.                                    |
| `defaultValue`      | `string`  | no       | —                                               | The initial source text when uncontrolled.                                                    |
| `language`          | `string`  | no       | —                                               | The forward-compat hint; unused by this first-gen component.                                  |
| `tabSize`           | `number`  | no       | `2`                                             | The number of spaces one indent step inserts. Default `2`.                                    |
| `isTabIndented`     | `boolean` | no       | `false`                                         | Whether indenting inserts a tab character instead of `tabSize` spaces. Default `false`.       |
| `canIndentOnTab`    | `boolean` | no       | `true`                                          | Whether Tab indents. Escape then Tab leaves the editor. Default true.                         |
| `keyboardExitLabel` | `string`  | no       | `'Press Escape, then Tab to leave the editor.'` | The localized keyboard-exit instruction shown below the editor.                               |
| `isInvalid`         | `boolean` | no       | `undefined`                                     | The invalid surface override. Falls back to the surrounding form control's `isInvalid`.       |
| `minHeight`         | `string`  | no       | `'12rem'`                                       | The CSS minHeight on the surface (default `12rem`).                                           |
| `id`                | `string`  | no       | —                                               | The control's id. Auto-filled from `FormControl` context when omitted.                        |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding field's `isDisabled`. |
| `disabled` | `boolean` | no | `undefined` | Deprecated alias of `isDisabled`; removed next release. |
| `isReadOnly` | `boolean` | no | `undefined` | Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. |
| `readOnly` | `boolean` | no | `undefined` | Deprecated alias of `isReadOnly`; removed next release. |
| `readonly` | `boolean` | no | `undefined` | Deprecated alias of `isReadOnly`; removed next release. |
| `isRequired` | `boolean` | no | `undefined` | The required state. Falls back to the surrounding field's `isRequired`. |
| `required` | `boolean` | no | `undefined` | Deprecated alias of `isRequired`; removed next release. |

## Emits

| Event               | Signature                               | Meaning                                                                    |
| ------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the reader types or re-indents the source — the `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el: textarea }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [InputInteraction.dom.test.ts](../../../../tests/unit/presentation/forms/InputInteraction.dom.test.ts), [KeyboardExit.browser.test.ts](../../../../tests/unit/presentation/forms/KeyboardExit.browser.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Escape arms the next native Tab exit, including Shift-Tab and macOS Option-Tab. Modifier keydown events preserve that latch; another nonmodifier key clears it.
