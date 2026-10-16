# AddressEditor

Renders a country-aware address block whose country select relabels the region and postal fields.

Source: [AddressEditor.vue](AddressEditor.vue).

Public import: `import { AddressEditor } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `Address` | no | `undefined` | The address, controlled. The `v-model` binding target. |
| `defaultValue` | `Address` | no | `undefined` | The initial address when uncontrolled. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding form control's `isDisabled`. |
| `isReadOnly` | `boolean` | no | `undefined` | The read-only state. Falls back to the surrounding form control's `isReadOnly`. |
| `isCompact` | `boolean` | no | — | Whether city / region / postal stack in one column instead of three. |
| `name` | `string` | no | — | The prefix for hidden inputs (`{name}.line1`, etc.). |
| `id` | `string` | no | — | The control's id. Auto-filled from `FormControl` context when omitted. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [address: Address];` | Fires when the reader edits any address field — the `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
