# FileUploadPicker

Renders a drag-drop zone that also opens the native picker on click, Enter or Space.

Source: [FileUploadPicker.vue](FileUploadPicker.vue).

Public import: `import { FileUploadPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop        | Type               | Required | Default                                 | Meaning                                                                                 |
| ----------- | ------------------ | -------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| `accept`    | `string`           | no       | —                                       | The `accept` token list handed to the native input and used for validation.             |
| `multiple`  | `boolean`          | no       | `false`                                 | Whether more than one file may be picked. Default `false`.                              |
| `maxSize`   | `number`           | no       | —                                       | The per-file byte cap. Files exceeding this drop into `rejected`.                       |
| `maxFiles`  | `number`           | no       | —                                       | The cap on total accepted files (multiple mode). Excess go to `rejected`.               |
| `isInvalid` | `boolean`          | no       | `undefined`                             | The invalid surface override. Falls back to the surrounding form control's `isInvalid`. |
| `label`     | `string \| number` | no       | `'Drop files here, or click to browse'` | The zone's headline. Fill the `label` slot for richer content.                          |
| `hint`      | `string \| number` | no       | —                                       | The zone's sub-line. Fill the `hint` slot for richer content.                           |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding field's `isDisabled`. |
| `disabled` | `boolean` | no | `undefined` | Deprecated alias of `isDisabled`; removed next release. |
| `name`      | `string`           | no       | —                                       | The native input name.                                                                  |
| `id`        | `string`           | no       | —                                       | The control's id. Auto-filled from `FormControl` context when omitted.                  |

## Emits

| Event          | Signature                                                                                  | Meaning                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `files-change` | `'files-change': [accepted: ReadonlyArray<File>, rejected: ReadonlyArray<FileRejection>];` | Fires when the reader drops or picks files, carrying them split into accepted and rejected. |

## Slots

| Slot      | Signature              | Meaning                                                      |
| --------- | ---------------------- | ------------------------------------------------------------ |
| `default` | `default?(): unknown;` | The content rendered under the drop zone — the default slot. |
| `label`   | `label?(): unknown;`   | See the declared signature.                                  |
| `hint`    | `hint?(): unknown;`    | See the declared signature.                                  |

## Exposed handle

`{ el: input }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Field disabled/read-only state is checked at mutation boundaries, including synthetic events. Read-only prevents edits without discarding the current value. Where a named hidden mirror is provided, it forwards `form`, omits disabled values and retains read-only values. Localizable default labels follow LocaleProvider while explicit caller text takes precedence.
