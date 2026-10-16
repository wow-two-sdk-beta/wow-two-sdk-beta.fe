# IconPicker

Renders a searchable grid of icons — a 50+ `lucide-vue-next` subset, or your own `icons` map.

Source: [IconPicker.vue](IconPicker.vue).

Public import: `import { IconPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `string` | no | `undefined` | The selected icon key, controlled. The `v-model` binding target. |
| `defaultValue` | `string` | no | — | The initial icon key when uncontrolled. |
| `icons` | `Record<string, IconAdapter>` | no | `() => BuiltInIcons` | The icon set, keyed by the name the picker emits. Defaults to the built-in lucide subset. |
| `columns` | `number` | no | `8` | The number of grid columns. Default `8`. |
| `size` | `number` | no | `20` | The glyph pixel size. Default `20`. |
| `iconButtonSize` | `number` | no | `36` | The pixel size of each icon button. Default `36`. |
| `placeholder` | `string` | no | `'Search icons…'` | The search-field placeholder. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding form control's `isDisabled`. |
| `name` | `string` | no | — | The hidden input name; the hidden input emits the selected icon key. |
| `id` | `string` | no | — | The control's id. Auto-filled from `FormControl` context when omitted. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [name: string];` | Fires when the reader picks an icon from the grid — the `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
