# ContextMenuContent

Renders the menu surface, anchored to the point the gesture happened at.

Source: [ContextMenuContent.vue](ContextMenuContent.vue).

Public import: `import { ContextMenuContent } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Mount within the owner supplying `useContextMenuContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `placement` | `Placement` | no | `'bottom-start'` | The Floating UI placement. Default `bottom-start`. |
| `offset` | `number` | no | `2` | The distance between the gesture point and the menu in px. Default 2. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
