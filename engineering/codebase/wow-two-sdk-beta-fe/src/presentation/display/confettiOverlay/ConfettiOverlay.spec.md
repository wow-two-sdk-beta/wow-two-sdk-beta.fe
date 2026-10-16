# ConfettiOverlay

Renders a burst of SVG confetti particles, animated by rAF from an imperative `fire()`.

Source: [ConfettiOverlay.vue](ConfettiOverlay.vue).

Public import: `import { ConfettiOverlay } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `particleCount` | `number` | no | `60` | Declared by the source contract. |
| `colors` | `ReadonlyArray<string>` | no | `() => DefaultColors` | Declared by the source contract. |
| `gravity` | `number` | no | `1200` | Declared by the source contract. |
| `spread` | `number` | no | `60` | Declared by the source contract. |
| `velocity` | `number` | no | `500` | Declared by the source contract. |
| `lifetime` | `number` | no | `3000` | Declared by the source contract. |
| `origin` | `ConfettiOverlayOrigin` | no | `undefined` | Declared by the source contract. |
| `canAutoFire` | `boolean` | no | `undefined` | The auto-fire-on-mount mode. Useful for one-shot confetti on a route landing. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ fire }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
