# ColorWheelInput

Renders a circular hue ring, pointer-draggable and fully keyboard-operable as an ARIA slider.

Source: [ColorWheelInput.vue](ColorWheelInput.vue).

Public import: `import { ColorWheelInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type      | Required | Default     | Meaning                                                                        |
| -------------- | --------- | -------- | ----------- | ------------------------------------------------------------------------------ |
| `modelValue`   | `number`  | no       | —           | The hue, controlled. The `v-model` binding target.                             |
| `defaultValue` | `number`  | no       | —           | The initial hue when uncontrolled.                                             |
| `size`         | `number`  | no       | `200`       | The outer diameter in pixels. Default 200.                                     |
| `thickness`    | `number`  | no       | `30`        | The ring thickness in pixels. Default 30.                                      |
| `step`         | `number`  | no       | `1`         | The arrow-key increment.                                                       |
| `isDisabled`   | `boolean` | no       | `undefined` | The disabled state. Falls back to the surrounding form control's `isDisabled`. |
| `id`           | `string`  | no       | —           | The control's id. Auto-filled from `FormControl` context when omitted.         |

## Emits

| Event               | Signature                             | Meaning                                                                           |
| ------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [hue: number];` | Fires when a drag or arrow key lands the thumb on a new hue — the `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el: track }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Field disabled/read-only state is checked at mutation boundaries, including synthetic events. Read-only prevents edits without discarding the current value. Where a named hidden mirror is provided, it forwards `form`, omits disabled values and retains read-only values. Localizable default labels follow LocaleProvider while explicit caller text takes precedence.
