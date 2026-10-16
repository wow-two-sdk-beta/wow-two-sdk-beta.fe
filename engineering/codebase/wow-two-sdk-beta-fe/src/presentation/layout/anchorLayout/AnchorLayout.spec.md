# AnchorLayout

Renders a positioned overlay anchored to its nearest positioned ancestor — for image-corner controls, badges, hover-revealed actions, and conditionally mounted floating elements.

Source: [AnchorLayout.vue](AnchorLayout.vue).

Public import: `import { AnchorLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `position` | `OverlayPosition` | no | `'top-right'` | The anchor location — preset corner/edge/center, or raw inset object. Default 'top-right'. |
| `inset` | `SizeValue` | no | `undefined` | The spacing from edge for preset positions. Default '0.5rem'. Ignored for custom inset object. |
| `zIndex` | `number \| string` | no | `10` | The z-index. Default 10. |
| `appearOn` | `AnchorLayoutAppearOn` | no | `AnchorLayoutAppearOn.Always` | The visibility trigger while mounted. Default 'always'. Hover/focus-within modes need parent `class="group"`. |
| `isOpen` | `boolean` | no | `undefined` | The presence — controls mount/unmount with an exit transition, deferring unmount until transitionend. |
| `transition` | `AnchorLayoutTransition` | no | `undefined` | The animation effect for show/hide. Defaults to 'fade' if any visibility gating is active, else 'none'. |
| `transitionDuration` | `AnchorLayoutDuration` | no | `undefined` | The duration in ms. Number = symmetric; object = asymmetric enter/exit. Default 200. |
| `transitionEasing` | `string` | no | `undefined` | The CSS timing function. Default 'ease-out'. |
| `asChild` | `boolean` | no | `true` | The single-child merge via `Primitive` (no extra wrapper div). Default true. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
