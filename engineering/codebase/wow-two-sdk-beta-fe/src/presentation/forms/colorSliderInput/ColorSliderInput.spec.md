# ColorSliderInput

Renders a single-channel hue/saturation/value/alpha track, pointer-draggable and keyboard-operable as a slider.

Source: [ColorSliderInput.vue](ColorSliderInput.vue).

Public import: `import { ColorSliderInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type           | Required | Default            | Meaning                                                                        |
| -------------- | -------------- | -------- | ------------------ | ------------------------------------------------------------------------------ |
| `channel`      | `ColorChannel` | no       | `ColorChannel.Hue` | The channel the track drives.                                                  |
| `modelValue`   | `number`       | no       | —                  | The channel value, controlled. The `v-model` binding target.                   |
| `defaultValue` | `number`       | no       | —                  | The initial value when uncontrolled.                                           |
| `color`        | `HSV`          | no       | —                  | The surrounding color the non-hue gradients are built from.                    |
| `step`         | `number`       | no       | —                  | The arrow-key increment. Defaults to `1` for hue, `0.01` otherwise.            |
| `isDisabled`   | `boolean`      | no       | `undefined`        | The disabled state. Falls back to the surrounding form control's `isDisabled`. |
| `id`           | `string`       | no       | —                  | The control's id. Auto-filled from `FormControl` context when omitted.         |

## Emits

| Event               | Signature                               | Meaning                                                                                     |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [value: number];` | Fires when a drag or arrow key lands the thumb on a new channel value — the `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Field disabled/read-only state is checked at mutation boundaries, including synthetic events. Read-only prevents edits without discarding the current value. Where a named hidden mirror is provided, it forwards `form`, omits disabled values and retains read-only values. Localizable default labels follow LocaleProvider while explicit caller text takes precedence.
