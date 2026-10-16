# BackdropOverlay

Renders a fixed-position scrim behind an overlay, optionally blurred and click-through.

Source: [BackdropOverlay.vue](BackdropOverlay.vue).

Public import: `import { BackdropOverlay } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isOpen` | `boolean` | no | `true` | The mount state. Default `true`. |
| `isBlurred` | `boolean` | no | `false` | The backdrop-blur toggle. |
| `pointerEvents` | `BackdropOverlayPointerEvents` | no | `'auto'` | The pointer-event behavior; `'none'` lets clicks pass through. Default `'auto'`. |
| `isInline` | `boolean` | no | `false` | The in-place render toggle — skips the Portal wrap. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
