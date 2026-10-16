# ColorPicker

Renders a trigger opening a panel with a saturation/value area, hue and alpha sliders, a hex field and presets.

Source: [ColorPicker.vue](ColorPicker.vue).

Public import: `import { ColorPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop             | Type                        | Required | Default                          | Meaning                                                                                                                                                                                                                                                                                        |
| ---------------- | --------------------------- | -------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`     | `string \| null`            | no       | —                                | The selected hex, controlled. The `v-model` binding target.                                                                                                                                                                                                                                    |
| `defaultValue`   | `string \| null`            | no       | `'#3b82f6'`                      | The initial hex when uncontrolled. Default `#3b82f6`.                                                                                                                                                                                                                                          |
| `hasAlpha`       | `boolean`                   | no       | `false`                          | Whether the committed hex keeps its alpha channel, and the alpha slider renders.                                                                                                                                                                                                               |
| `presets`        | `ReadonlyArray<string>`     | no       | —                                | The preset palette rendered under the panel; omitted or empty hides the row.                                                                                                                                                                                                                   |
| `triggerSize`    | `ColorSwatchPreviewSize`    | no       | `ColorSwatchSizeValue.Md`        | The size step the built-in trigger's swatch renders at.                                                                                                                                                                                                                                        |
| `triggerVariant` | `ColorPickerTriggerVariant` | no       | `ColorPickerTriggerVariant.Full` | The built-in trigger to render (ignored when the `trigger` slot is filled): - `full` _(default)_ — swatch + hex-value text, framed button. - `swatch` — a bare interactive swatch, no text (compact toolbars, tiles). - `modelValue` — hex-value text only, no swatch (dense / code contexts). |
| `isDisabled`     | `boolean`                   | no       | `undefined`                      | The disabled state. Falls back to the surrounding form control's `isDisabled`.                                                                                                                                                                                                                 |
| `name`           | `string`                    | no       | —                                | The hidden input's name — renders a form-submittable mirror of the hex.                                                                                                                                                                                                                        |
| `id`             | `string`                    | no       | —                                | The trigger id; falls back to a surrounding `<Field>`'s control id.                                                                                                                                                                                                                            |

## Emits

| Event               | Signature                                       | Meaning                                                                                      |
| ------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [value: string \| null];` | Fires when the reader commits a color from the panel or the preset row — the `v-model` half. |

## Slots

| Slot      | Signature             | Meaning                     |
| --------- | --------------------- | --------------------------- |
| `trigger` | `trigger?(): unknown` | See the declared signature. |

## Exposed handle

`{ el: computed(() => trigger.value?.el ?? null) }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Controlled hex alpha replaces the previous alpha. Internal hue/saturation geometry remains stable when its encoded hex is unchanged. Read-only inherits Field context and prevents picker changes while its named native value remains successful.
