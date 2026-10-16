# SwitchInput

Renders a native checkbox as an iOS-style track and thumb toggle, carrying no label of its own.

Source: [SwitchInput.vue](SwitchInput.vue).

Public import: `import { SwitchInput } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the state owner and restores the resulting DOM representation; a cancelled reset changes nothing.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type      | Required | Default        | Meaning                                                                        |
| -------------- | --------- | -------- | -------------- | ------------------------------------------------------------------------------ |
| `size`         | `Size`    | no       | `SizeValue.Md` | The control size.                                                              |
| `modelValue`   | `boolean` | no       | `undefined`    | The checked state, controlled. The `v-model` binding target.                   |
| `defaultValue` | `boolean` | no       | `undefined`    | The initial checked state when uncontrolled.                                   |
| `id`           | `string`  | no       | —              | The control's id. Auto-filled from `FormControl` context when omitted.         |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding field's `isDisabled`. |
| `disabled` | `boolean` | no | `undefined` | Deprecated alias of `isDisabled`; removed next release. |
| `isRequired` | `boolean` | no | `undefined` | The required state. Falls back to the surrounding field's `isRequired`. |
| `required` | `boolean` | no | `undefined` | Deprecated alias of `isRequired`; removed next release. |
| `isSkeleton` | `boolean` | no | `undefined` | Keeps the track's pill and size as the placeholder, hides the thumb and checked fill, sets `inert`. Defaults to the nearest `DataRegion` first load. |

## Emits

| Event               | Signature                                  | Meaning                                                    |
| ------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [checked: boolean];` | Fires when the user flips the switch — the `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el: input }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Forms.contract.dom.test.ts](../../../../tests/unit/presentation/forms/Forms.contract.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Field disabled/read-only state is checked at mutation boundaries, including synthetic events. Read-only prevents edits without discarding the current value. Where a named hidden mirror is provided, it forwards `form`, omits disabled values and retains read-only values. Localizable default labels follow LocaleProvider while explicit caller text takes precedence.
