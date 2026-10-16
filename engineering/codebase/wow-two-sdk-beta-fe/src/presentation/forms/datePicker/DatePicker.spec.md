# DatePicker

Renders a trigger button that opens a popover `CalendarPicker` and shows the picked date.

Source: [DatePicker.vue](DatePicker.vue).

Public import: `import { DatePicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type                                    | Required | Default               | Meaning                                                                                                          |
| -------------- | --------------------------------------- | -------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `modelValue`   | `Temporal.PlainDate \| null`            | no       | —                     | The selected date, controlled. The `v-model` binding target.                                                     |
| `defaultValue` | `Temporal.PlainDate \| null`            | no       | —                     | The uncontrolled initial selection.                                                                              |
| `placeholder`  | `string`                                | no       | `'Pick a date'`       | The empty-state text on the trigger.                                                                             |
| `format`       | `(date: Temporal.PlainDate) => string`  | no       | Active LocaleProvider | The trigger's date formatter. Kept a PROP, not an emit: it RETURNS the rendered string, which an emit cannot do. |
| `min`          | `Temporal.PlainDate \| null`            | no       | —                     | The minimum selectable date.                                                                                     |
| `max`          | `Temporal.PlainDate \| null`            | no       | —                     | The maximum selectable date.                                                                                     |
| `isDateDisabled` | `(date: Temporal.PlainDate) => boolean` | no | — | The custom per-day disable predicate. |
| `isDisabled` | `boolean \| ((date: Temporal.PlainDate) => boolean)` | no | `undefined` | The disabled state; falls back to the surrounding field. A function is the deprecated spelling of `isDateDisabled`. |
| `isInvalid`    | `boolean`                               | no       | `undefined`           | The invalid surface override. Falls back to the surrounding form control's `isInvalid`.                          |
| `name`         | `string`                                | no       | —                     | The hidden input name; when set, a hidden input ships the ISO value with form submission.                        |
| `size`         | `SelectPickerSize`                      | no       | —                     | The trigger size.                                                                                                |
| `state`        | `InputState`                            | no       | —                     | The validity surface.                                                                                            |
| `id`           | `string`                                | no       | —                     | The trigger's id. Auto-filled from `FormControl` context when omitted.                                           |
| `disabled` | `boolean` | no | `undefined` | Deprecated alias of `isDisabled`; removed next release. |

## Emits

| Event               | Signature                                                  | Meaning                                                               |
| ------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [date: Temporal.PlainDate \| null];` | Fires when the reader picks a day in the popover. The `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el: computed(() => trigger.value?.el ?? null) }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DateTimeControls.dom.test.ts](../../../../tests/unit/presentation/forms/DateTimeControls.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

`readonly` inherits Field context and blocks typing, native changes and picker actions. Disabled native mirrors are omitted from submission; read-only values remain included. `form` reaches the named mirror. Calendar/display labels follow LocaleProvider unless explicitly overridden; canonical typed and wire formats remain stable.
