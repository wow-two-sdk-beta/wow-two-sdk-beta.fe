# FilePicker

Renders a styled trigger button over a visually-hidden native `<input type="file">`.

Source: [FilePicker.vue](FilePicker.vue).

Public import: `import { FilePicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop       | Type               | Required | Default         | Meaning                                                                                          |
| ---------- | ------------------ | -------- | --------------- | ------------------------------------------------------------------------------------------------ |
| `label`    | `string \| number` | no       | `'Choose file'` | The button label. Default `"Choose file"`. Fill the `label` slot for richer content.             |
| `preview`  | `string \| number` | no       | —               | The filename(s) preview rendered next to the button. Fill the `preview` slot for richer content. |
| `size`     | `Size`             | no       | `SizeValue.Md`  | The visual size of the button. Default `md`.                                                     |
| `id`       | `string`           | no       | —               | The control's id. Auto-filled from `FormControl` context when omitted.                           |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding field's `isDisabled`. |
| `disabled` | `boolean` | no | `undefined` | Deprecated alias of `isDisabled`; removed next release. |

## Emits

| Event          | Signature                                    | Meaning                                                                                 |
| -------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `files-change` | `'files-change': [files: FileList \| null];` | Fires when the reader picks files in the system dialog, carrying the chosen `FileList`. |

## Slots

| Slot      | Signature              | Meaning                     |
| --------- | ---------------------- | --------------------------- |
| `label`   | `label?(): unknown;`   | See the declared signature. |
| `preview` | `preview?(): unknown;` | See the declared signature. |

## Exposed handle

`{ el: input }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Field disabled/read-only state is checked at mutation boundaries, including synthetic events. Read-only prevents edits without discarding the current value. Where a named hidden mirror is provided, it forwards `form`, omits disabled values and retains read-only values. Localizable default labels follow LocaleProvider while explicit caller text takes precedence.
