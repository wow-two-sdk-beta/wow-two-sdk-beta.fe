# SeparatorLayout

Renders a hairline divider, horizontal by default or vertical for column splits.

Source: [SeparatorLayout.vue](SeparatorLayout.vue).

Public import: `import { SeparatorLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `orientation` | `Orientation` | no | `Orientation.Horizontal` | Declared by the source contract. |
| `isDecorative` | `boolean` | no | `true` | The decorative mode — `role="none"`, unannounced. Default `true`; set `false` when meaningful in context. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
