# PopoverArrow

Renders a tip arrow tinted to the popover surface; pair with Floating UI's `arrow()` to place it.

Source: [PopoverArrow.vue](PopoverArrow.vue).

Public import: `import { PopoverArrow } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `width` | `number` | no | — | The arrow width in px. Default 12. |
| `height` | `number` | no | — | The arrow height in px. Default 6. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
