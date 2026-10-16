# DropdownMenuContent

Renders the animated panel handed to `Menu` as its child.

Source: [DropdownMenuContent.vue](DropdownMenuContent.vue).

Public import: `import { DropdownMenuContent } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Mount within the owner supplying `useDropdownMenuContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

No declared props.

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
