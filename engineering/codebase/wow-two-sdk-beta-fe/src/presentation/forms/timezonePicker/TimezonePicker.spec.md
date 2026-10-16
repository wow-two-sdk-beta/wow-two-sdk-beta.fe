# TimezonePicker

Renders a searchable picker of IANA time zones, each labelled with its UTC offset and ordered west to east.

Source: [TimezonePicker.vue](TimezonePicker.vue).

Public import: `import { TimezonePicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The model is the IANA zone id (`'Asia/Tashkent'`), or `null` when cleared. `modelValue` / `update:modelValue` and `defaultValue` follow the shared controlled-state helper through the inner `SelectPicker`.
- Each option reads `"America/New York (GMT-05:00)"`: underscores become spaces, and the offset is the zone's offset at `referenceInstant`. Options sort by offset, then by id.
- The default list is every zone the runtime reports through `Intl.supportedValuesOf('timeZone')`, with `UTC` first. A zone id the runtime rejects is left out, so a stale id in `timeZones` never throws.
- Offsets are read at the mount moment unless `referenceInstant` is supplied, so labels never shift while the list is open. DST zones show the offset in force at that instant.
- Options are seeded eagerly, so a preset value shows its full label before the list ever opens.
- Fallthrough attributes and `class` reach the trigger; give it an `aria-label` or wrap it in a `Field`.

## Props

| Prop                | Type                    | Required | Default                | Meaning                                                                          |
| ------------------- | ----------------------- | -------- | ---------------------- | -------------------------------------------------------------------------------- |
| `modelValue`        | `string \| null`        | no       | —                      | The zone id, controlled — the `v-model` target.                                  |
| `defaultValue`      | `string \| null`        | no       | `null`                 | The initial zone id when uncontrolled.                                           |
| `timeZones`         | `ReadonlyArray<string>` | no       | every runtime zone     | The zone ids to offer; duplicates collapse.                                      |
| `referenceInstant`  | `Temporal.Instant`      | no       | mount moment           | The instant whose offsets label and order the zones.                             |
| `placeholder`       | `string`                | no       | `'Pick a time zone'`   | The trigger text with no zone picked; localized as `TimezonePicker.placeholder`. |
| `searchPlaceholder` | `string`                | no       | `'Search time zones…'` | The search input placeholder; localized as `TimezonePicker.searchPlaceholder`.   |
| `size`              | `SelectPickerSize`      | no       | —                      | The trigger size.                                                                |
| `isDisabled`        | `boolean`               | no       | `false`                | Blocks interaction.                                                              |
| `isReadOnly`        | `boolean`               | no       | `false`                | Keeps the value but blocks changes.                                              |
| `isInvalid`         | `boolean`               | no       | `false`                | Styles the trigger as invalid.                                                   |
| `isClearable`       | `boolean`               | no       | `false`                | Offers a clear button while a zone is picked.                                    |
| `name`              | `string`                | no       | —                      | The hidden input name that submits the zone id.                                  |

## Emits

| Event               | Signature                                      | Meaning                                       |
| ------------------- | ---------------------------------------------- | --------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [zone: string \| null];` | Fires when the reader picks or clears a zone. |

## Slots

None.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [TimezonePicker.dom.test.ts](../../../../tests/unit/presentation/forms/TimezonePicker.dom.test.ts) — offset labels, ordering, rejected zones, the default list and the emitted pick.
