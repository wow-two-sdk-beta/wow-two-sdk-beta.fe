# DrawerContent

Renders the portalled edge panel — scrim, focus trap, scroll lock, and the sliding a11y surface.

Source: [DrawerContent.vue](DrawerContent.vue).

Public import: `import { DrawerContent } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- A modal FocusScope traps/loops focus and owns modal background isolation.
- Mount within the owner supplying `useDrawerContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `showBackdrop` | `boolean` | no | `true` | Shows the default backdrop behind the panel. Default `true`.        |
| `hideBackdrop` | `boolean` | no | — | Deprecated — use `showBackdrop` (inverted); removed next release.   |
| `isBlurred` | `boolean` | no | — | The backdrop-blur toggle. |
| `size` | `DrawerSize` | no | `'md'` | The per-side max-size token. Default `md`. |
| `variant` | `SurfaceVariant` | no | — | The visual recipe. Default `elevated`. |
| `tone` | `SurfaceTone` | no | — | The color tone the recipe is tinted with. |
| `radius` | `SurfaceRadius` | no | — | The corner rounding. Default `none`. |
| `padding` | `SurfacePadding` | no | — | The inner spacing step. Default `xl`. |
| `elevation` | `SurfaceElevation` | no | — | The shadow depth. Default `3`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Overlays.contract.dom.test.ts](../../../../tests/unit/presentation/overlays/Overlays.contract.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
