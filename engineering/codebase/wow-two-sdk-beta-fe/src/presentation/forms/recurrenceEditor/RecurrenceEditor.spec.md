# RecurrenceEditor

Renders a visual RRULE editor — frequency, interval, weekdays, month day, and end mode, with a preview of the next occurrences.

Source: [RecurrenceEditor.vue](RecurrenceEditor.vue).

Public import: `import { RecurrenceEditor } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type                 | Required | Default         | Meaning                                                                                    |
| -------------- | -------------------- | -------- | --------------- | ------------------------------------------------------------------------------------------ |
| `modelValue`   | `RecurrenceRule`     | no       | `undefined`     | The rule, controlled. The `v-model` binding target.                                        |
| `defaultValue` | `RecurrenceRule`     | no       | `undefined`     | The initial rule when uncontrolled.                                                        |
| `from`         | `Temporal.PlainDate` | no       | `() => today()` | The anchor date the preview counts forward from. Defaults to today.                        |
| `previewCount` | `number`             | no       | `5`             | How many occurrences the preview lists. Default `5`.                                       |
| `isDisabled`   | `boolean`            | no       | `undefined`     | The disabled state. Falls back to the surrounding form control's `isDisabled`.             |
| `isReadOnly`   | `boolean`            | no       | `undefined`     | The read-only state. Falls back to the surrounding form control's `isReadOnly`.            |
| `name`         | `string`             | no       | —               | The hidden input name; when set, emits a hidden input with the serialized `RRULE:` string. |
| `id`           | `string`             | no       | —               | The control's id. Auto-filled from `FormControl` context when omitted.                     |

## Emits

| Event               | Signature                                      | Meaning                                                                                           |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [rule: RecurrenceRule];` | Fires when the reader changes the frequency, interval, weekdays, or end mode. The `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DateTimeControls.dom.test.ts](../../../../tests/unit/presentation/forms/DateTimeControls.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Field disabled/read-only state is checked at mutation boundaries, including synthetic events. Read-only prevents edits without discarding the current value. Where a named hidden mirror is provided, it forwards `form`, omits disabled values and retains read-only values. Localizable default labels follow LocaleProvider while explicit caller text takes precedence.
