# ChoiceCard

Renders a radio as a whole clickable card carrying a title, description and optional icon.

Source: [ChoiceCard.vue](ChoiceCard.vue).

Public import: `import { ChoiceCard } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends Omit<RadioInputProps, 'size'>`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string \| number` | no | — | The card title. Fill the `label` slot instead for richer content. |
| `description` | `string \| number` | no | — | The description under the title. Fill the `description` slot for richer content. |
| `icon` | `string \| number` | no | — | The optional icon rendered beside the label. Fill the `icon` slot with the icon element. |
| `size` | `Size` | no | `SizeValue.Md` | The card size. Default `md`. |
| `value` | `string` | no | — | The key this item contributes to a surrounding `RadioGroup`'s selection. the group provides a context and this prop is what the item registers under. Ignored outside a group. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `label` | `label?(): unknown;` | See the declared signature. |
| `description` | `description?(): unknown;` | See the declared signature. |
| `icon` | `icon?(): unknown;` | See the declared signature. |

## Exposed handle

`{ el: computed(() => inner.value?.el ?? null) }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
