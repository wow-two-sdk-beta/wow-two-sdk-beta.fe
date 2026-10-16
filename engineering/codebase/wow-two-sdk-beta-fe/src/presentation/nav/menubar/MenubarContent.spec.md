# MenubarContent

Renders the menu surface for one bar entry.

Source: [MenubarContent.vue](MenubarContent.vue).

Public import: `import { MenubarContent } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Mount within the owner supplying `useMenubarContext`, `useMenubarMenuContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `placement` | `Placement` | no | `'bottom-start'` | The Floating UI placement. Default `bottom-start`. |
| `offset` | `number` | no | `4` | The distance between trigger and menu in px. Default 4. |

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
