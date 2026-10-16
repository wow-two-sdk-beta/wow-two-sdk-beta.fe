# HoverCardTrigger

Renders the element that opens the enclosing `HoverCard` on hover or focus, and anchors it.

Source: [HoverCardTrigger.vue](HoverCardTrigger.vue).

Public import: `import { HoverCardTrigger } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Mount within the owner supplying `useHoverCardContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Behavior

- Mouse and pen pointers open the card after `openDelay` and close it after `closeDelay`; focus does the same.
- Touch pointers are ignored — a tap has no hover to end it — so the trigger's own tap action runs alone.
- Regression: `tests/unit/presentation/overlays/SheetsAndHoverCard.dom.test.ts`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `asChild` | `boolean` | no | `true` | Merge onto the single slot child instead of rendering a `<span>`. Default `true`. Disable asChild to render the default span wrapper. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
