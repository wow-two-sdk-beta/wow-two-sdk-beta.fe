# CheckboxField

Renders a checkbox, its right-side label and an optional description in one clickable `<label>`.

Source: [CheckboxField.vue](CheckboxField.vue).

Public import: `import { CheckboxField } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- Under a coarse pointer the `<label>` keeps its box and takes an invisible hit area of at least 44 x 44px (`CoarseHitArea`), so the row does not grow. A group whose rows sit closer than 44px sets `--coarse-hit-gap` to its gap, so neighbouring rows never share a tap.

## Touch

Under a coarse pointer (a finger) at one viewport size, against a fine one (a mouse):

| Element | Touch change | Kind |
|---|---|---|
| `<label>` row | none: no padding is added; an invisible hit area reaches 44px | hit area |

## Props

Inherited contracts: `extends CheckboxInputProps`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string \| number` | no | — | The right-side label. Fill the `label` slot instead for richer content. |
| `description` | `string \| number` | no | — | The smaller helper / description below. Fill the `description` slot for richer content. |
| `wrapperClassName` | `string` | no | — | The wrap-element class (the `<label>`). Vue's `class` fallthrough attr reaches the CHECKBOX, not the root. Style the wrapper through this prop. |
| `value` | `string` | no | — | The key this item contributes to a surrounding `CheckboxGroup`'s selection. the group provides a context and this prop is what the item registers under. Ignored outside a group. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `label` | `label?(): unknown;` | See the declared signature. |
| `description` | `description?(): unknown;` | See the declared signature. |

## Exposed handle

`{ el: computed(() => inner.value?.el ?? null) }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
