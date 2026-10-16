# ListboxPickerGroup

Renders a heading above a subset of items and wires it as that group's accessible name.

Source: [ListboxPickerGroup.vue](ListboxPickerGroup.vue).

Public import: `import { ListboxPickerGroup } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string \| number` | no | — | The optional group heading rendered above the contained items. Fill the `label` slot instead for richer content; the prop stays the discriminator. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The items this group heads. |
| `label` | `label?(): unknown;` | The heading content, richer than the `label` prop can carry. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
