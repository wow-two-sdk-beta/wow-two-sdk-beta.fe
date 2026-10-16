# ColorArea

Renders a two-axis saturation/value square, pointer-draggable and keyboard-operable as an ARIA slider.

Source: [ColorArea.vue](ColorArea.vue).

Public import: `import { ColorArea } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Saturation and HSV brightness/value remain distinct named numeric models. The component emits only changed axes; native reset requests each original seed through the same events.
- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop                | Type      | Required | Default     | Meaning                                                                        |
| ------------------- | --------- | -------- | ----------- | ------------------------------------------------------------------------------ |
| `hue`               | `number`  | no       | `0`         | The hue the square is tinted with (0–360).                                     |
| `saturation`        | `number`  | no       | —           | The saturation, controlled (0–1). The `v-model:saturation` binding target.     |
| `defaultSaturation` | `number`  | no       | —           | The initial saturation when uncontrolled.                                      |
| `value`             | `number`  | no       | —           | The brightness/value, controlled (0–1). The `v-model:value` binding target.    |
| `defaultValue`      | `number`  | no       | —           | The initial value when uncontrolled.                                           |
| `step`              | `number`  | no       | `0.01`      | The arrow-key increment. `PageUp`/`PageDown` move ten steps.                   |
| `isDisabled`        | `boolean` | no       | `undefined` | The disabled state. Falls back to the surrounding form control's `isDisabled`. |
| `id`                | `string`  | no       | —           | The control's id. Auto-filled from `FormControl` context when omitted.         |

## Emits

| Event               | Signature                               | Meaning                                                                                             |
| ------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `update:saturation` | `'update:saturation': [value: number];` | Fires when a drag or arrow key lands the thumb on a new saturation — the `v-model:saturation` half. |
| `update:value`      | `'update:value': [value: number];`      | Fires when a drag or arrow key lands the thumb on a new brightness — the `v-model:value` half.      |

## Slots

None declared.

## Exposed handle

`{ el: track }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Saturation and brightness expose separate named sliders, each with its own scalar value and keyboard axis. Arrow keys move one percent; Page keys move ten; Home/End select the bounds. Zero-size pointer geometry cannot emit NaN. Inherited disabled/read-only blocks editing.
