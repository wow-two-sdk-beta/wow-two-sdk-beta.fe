# ContainerLayout

Renders a centered max-width wrapper with horizontal padding.

Source: [ContainerLayout.vue](ContainerLayout.vue).

Public import: `import { ContainerLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `as` | `ElementType` | no | `'div'` | Declared by the source contract. |
| `size` | `ContainerLayoutSize` | no | — | The max-width preset. Default `lg`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The page content held to the max width. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
