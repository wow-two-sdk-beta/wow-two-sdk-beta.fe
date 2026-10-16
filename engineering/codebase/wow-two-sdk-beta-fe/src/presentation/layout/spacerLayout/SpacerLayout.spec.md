# SpacerLayout

Renders a flexible empty box.

Source: [SpacerLayout.vue](SpacerLayout.vue).

Public import: `import { SpacerLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `size` | `number \| string` | no | — | The explicit size (CSS length). When inside a flex/grid parent, the default `flex: 1` already pushes siblings apart. |
| `axis` | `Orientation` | no | `Orientation.Horizontal` | The axis the fixed `size` applies to. Default `horizontal`. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
