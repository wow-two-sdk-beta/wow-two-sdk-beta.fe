# TimeInput

Renders a typed `HH:MM` field with a design-system popover on the trailing clock button.

Source: [TimeInput.vue](TimeInput.vue).

Public import: `import { TimeInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the state owner and restores the resulting DOM representation; a cancelled reset changes nothing.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type                         | Required | Default     | Meaning                                                                                                                                                                                                                                                                                                                            |
| -------------- | ---------------------------- | -------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `size`         | `InputSize`                  | no       | —           | The control size.                                                                                                                                                                                                                                                                                                                  |
| `state`        | `InputState`                 | no       | —           | The validity surface.                                                                                                                                                                                                                                                                                                              |
| `border`       | `InputBorder`                | no       | —           | The border weight.                                                                                                                                                                                                                                                                                                                 |
| `ring`         | `InputRing`                  | no       | —           | The focus-ring weight.                                                                                                                                                                                                                                                                                                             |
| `modelValue`   | `Temporal.PlainTime \| null` | no       | —           | The value, controlled. The `v-model` binding target. `null` is the cleared state.                                                                                                                                                                                                                                                  |
| `defaultValue` | `Temporal.PlainTime \| null` | no       | —           | The initial value when uncontrolled.                                                                                                                                                                                                                                                                                               |
| `isNative`     | `boolean`                    | no       | `false`     | Renders a bare `<input type="time">` and drops the popover. Opt-in only. The browser owns that control's picker panel — it cannot be themed, so it lands a system-chrome popup in the middle of a design-system form. Reach for it when the platform picker is the point (a mobile-first form wanting the OS wheel, for instance). |
| `native`       | `boolean`                    | no       | —           | Deprecated — use `isNative`; removed next release.                                                                                                                                                                                                                                                                                 |
| `minuteStep`   | `number`                     | no       | `5`         | The minute interval offered in the popover. Default 5. Ignored when `native`.                                                                                                                                                                                                                                                      |
| `placeholder`  | `string`                     | no       | `'--:--'`   | The empty-state text. Ignored when `native` — that control renders its own mask.                                                                                                                                                                                                                                                   |
| `id`           | `string`                     | no       | —           | The control's id. Auto-filled from `FormControl` context when omitted.                                                                                                                                                                                                                                                             |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding field's `isDisabled`. |
| `disabled` | `boolean` | no | `undefined` | Deprecated alias of `isDisabled`; removed next release. |
| `isRequired` | `boolean` | no | `undefined` | The required state. Falls back to the surrounding field's `isRequired`. |
| `required` | `boolean` | no | `undefined` | Deprecated alias of `isRequired`; removed next release. |

## Emits

| Event               | Signature                                                   | Meaning                                                                              |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `update:modelValue` | `'update:modelValue': [value: Temporal.PlainTime \| null];` | Fires when the reader types a time or picks one in the popover — the `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DateTimeControls.dom.test.ts](../../../../tests/unit/presentation/forms/DateTimeControls.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

`readonly` inherits Field context and blocks typing, native changes and picker actions. Disabled native mirrors are omitted from submission; read-only values remain included. `form` reaches the named mirror. Calendar/display labels follow LocaleProvider unless explicitly overridden; canonical typed and wire formats remain stable.

## Editing guarantees

Minute steps must be integer values from 1 through 60; invalid steps use the default five-minute interval. Native time steps use the same interval in seconds. Boundary and current minutes remain selectable even when off-step. Time selection enforces `min`/`max`; date-time selection clamps a newly picked boundary day to its valid time window. Invalid typed values revert without an update.

Native input attributes and event listeners (including `name`, `form`, `autocomplete`, `onBlur`, `onInput` and keyboard/composition/clipboard events) are represented in the public props type. They remain fallthrough attrs at runtime. Canonical model value, visual size, fixed native type and declared Temporal bounds retain component ownership. Autocomplete accepts its native extensible token string.
