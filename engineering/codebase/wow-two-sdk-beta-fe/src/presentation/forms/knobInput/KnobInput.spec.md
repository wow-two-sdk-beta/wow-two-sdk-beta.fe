# KnobInput

Renders a rotational dial whose arc, pointer and readout track one value, turned by drag, wheel or arrow keys.

Source: [KnobInput.vue](KnobInput.vue).

Public import: `import { KnobInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type                                  | Required | Default                       | Meaning                                                                                                                                |
| -------------- | ------------------------------------- | -------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`   | `number`                              | no       | `undefined`                   | The value, controlled. The `v-model` binding target.                                                                                   |
| `defaultValue` | `number`                              | no       | `undefined`                   | The initial value when uncontrolled. Defaults to `min`.                                                                                |
| `min`          | `number`                              | no       | `0`                           | The lower bound. Default `0`.                                                                                                          |
| `max`          | `number`                              | no       | `1`                           | The upper bound. Default `1`.                                                                                                          |
| `step`         | `number`                              | no       | `0.01`                        | The arrow-key / wheel step. Default `0.01`.                                                                                            |
| `largeStep`    | `number`                              | no       | `0.1`                         | The Shift+arrow step. Default `0.1`.                                                                                                   |
| `size`         | `number`                              | no       | `64`                          | The knob's pixel diameter. Default `64`.                                                                                               |
| `arcDegrees`   | `number`                              | no       | `270`                         | The sweep of the value arc in degrees. Default `270`.                                                                                  |
| `tone`         | `KnobInputTone`                       | no       | `'brand'`                     | The accent palette. Default `brand`.                                                                                                   |
| `format`       | `(value: number) => string \| number` | no       | `(v: number) => v.toFixed(2)` | The readout formatter. Default `(v) => v.toFixed(2)`. Kept a PROP, not an emit: it RETURNS the rendered text, which an emit cannot do. |
| `isValueShown` | `boolean`                             | no       | `true`                        | Whether the formatted readout renders in the centre. Default `true`.                                                                   |
| `isDisabled`   | `boolean`                             | no       | `undefined`                   | The disabled state. Falls back to the surrounding form control's `isDisabled`.                                                         |
| `name`         | `string`                              | no       | —                             | The hidden input name; the hidden input emits the numeric value.                                                                       |
| `id`           | `string`                              | no       | —                             | The control's id. Auto-filled from `FormControl` context when omitted.                                                                 |

## Emits

| Event               | Signature                               | Meaning                                                                          |
| ------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [value: number];` | Fires when the reader turns the dial by drag, wheel or key — the `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el: container }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Field disabled/read-only state is checked at mutation boundaries, including synthetic events. Read-only prevents edits without discarding the current value. Where a named hidden mirror is provided, it forwards `form`, omits disabled values and retains read-only values. Localizable default labels follow LocaleProvider while explicit caller text takes precedence.
