# CalendarPicker

Renders a month grid where one day is picked, navigated by keyboard and bounded by min/max.

Source: [CalendarPicker.vue](CalendarPicker.vue).

Public import: `import { CalendarPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type                                    | Required | Default | Meaning                                                                                                                                    |
| -------------- | --------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `modelValue`   | `Temporal.PlainDate \| null`            | no       | —       | The selected date, controlled. The `v-model` binding target.                                                                               |
| `defaultValue` | `Temporal.PlainDate \| null`            | no       | —       | The uncontrolled initial selection.                                                                                                        |
| `defaultMonth` | `Temporal.PlainDate`                    | no       | —       | The initial visible month (uncontrolled).                                                                                                  |
| `min`          | `Temporal.PlainDate \| null`            | no       | —       | The minimum selectable date.                                                                                                               |
| `max`          | `Temporal.PlainDate \| null`            | no       | —       | The maximum selectable date.                                                                                                               |
| `isDateDisabled` | `(date: Temporal.PlainDate) => boolean` | no | — | The custom per-day disable predicate. |
| `isDisabled` | `boolean \| ((date: Temporal.PlainDate) => boolean)` | no | `undefined` | The disabled state; falls back to the surrounding field. A function is the deprecated spelling of `isDateDisabled`. |

## Emits

| Event               | Signature                                                  | Meaning                                                            |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `update:modelValue` | `'update:modelValue': [date: Temporal.PlainDate \| null];` | Fires when the reader picks a day in the grid. The `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DateTimeControls.dom.test.ts](../../../../tests/unit/presentation/forms/DateTimeControls.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Whole-control `disabled` and `readonly` inherit Field state and are separate from `isDisabled(date)`. Inactive date buttons and callbacks cannot change selection. Month/day labels use the active LocaleProvider. Reset clears pending range gestures as well as the value.
