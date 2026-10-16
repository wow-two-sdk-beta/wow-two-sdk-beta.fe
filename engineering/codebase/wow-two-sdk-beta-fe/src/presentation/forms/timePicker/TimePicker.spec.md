# TimePicker

Renders a trigger button that opens popover hour and minute columns and shows the picked time.

Source: [TimePicker.vue](TimePicker.vue).

Public import: `import { TimePicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type                                   | Required | Default               | Meaning                                                                                                          |
| -------------- | -------------------------------------- | -------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `modelValue`   | `Temporal.PlainTime \| null`           | no       | —                     | The selected time, controlled. The `v-model` binding target.                                                     |
| `defaultValue` | `Temporal.PlainTime \| null`           | no       | —                     | The uncontrolled initial selection.                                                                              |
| `minuteStep`   | `number`                               | no       | `5`                   | The minute interval. Default 5.                                                                                  |
| `placeholder`  | `string`                               | no       | `'Pick a time'`       | The empty-state text on the trigger.                                                                             |
| `format`       | `(time: Temporal.PlainTime) => string` | no       | Active LocaleProvider | The trigger's time formatter. Kept a PROP, not an emit: it RETURNS the rendered string, which an emit cannot do. |
| `isInvalid`    | `boolean`                              | no       | `undefined`           | The invalid surface override. Falls back to the surrounding form control's `isInvalid`.                          |
| `name`         | `string`                               | no       | —                     | The hidden input name; when set, a hidden input ships the value with form submission.                            |
| `size`         | `SelectPickerSize`                     | no       | —                     | The trigger size.                                                                                                |
| `state`        | `InputState`                           | no       | —                     | The validity surface.                                                                                            |
| `id`           | `string`                               | no       | —                     | The trigger's id. Auto-filled from `FormControl` context when omitted.                                           |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding field's `isDisabled`. |
| `disabled` | `boolean` | no | `undefined` | Deprecated alias of `isDisabled`; removed next release. |

## Emits

| Event               | Signature                                                  | Meaning                                                                             |
| ------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [time: Temporal.PlainTime \| null];` | Fires when the reader picks an hour or a minute in the popover. The `v-model` half. |

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

## Editing guarantees

Minute steps must be integer values from 1 through 60; invalid steps use the default five-minute interval. Native time steps use the same interval in seconds. Boundary and current minutes remain selectable even when off-step. Time selection enforces `min`/`max`; date-time selection clamps a newly picked boundary day to its valid time window. Invalid typed values revert without an update.
