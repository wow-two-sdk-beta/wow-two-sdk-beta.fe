# ModalContent

Renders the portalled dialog surface — scrim, focus trap, scroll lock, and the a11y panel.

Source: [ModalContent.vue](ModalContent.vue).

Public import: `import { ModalContent } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- The panel is centered and reaches its `max-w-*` cap whatever its content length; `w-full` resolves against the
  window, never against the content.
- The panel caps at the viewport (`100dvh - 2rem`) as a flex column: its `ModalBody` scrolls between a fixed header and footer, and a panel without a body scrolls whole.
- A modal FocusScope traps/loops focus and owns modal background isolation.
- Label and description IDs come from the owning Modal root; provide matching title/description parts or explicit accessible attributes.
- Mount within the owner supplying `useModalContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `showBackdrop` | `boolean` | no | `true` | Shows the default backdrop behind the panel. Default `true`.        |
| `hideBackdrop` | `boolean` | no | — | Deprecated — use `showBackdrop` (inverted); removed next release.   |
| `isBlurred` | `boolean` | no | — | The backdrop-blur toggle. |
| `variant` | `SurfaceVariant` | no | — | The visual recipe. Default `elevated`. |
| `tone` | `SurfaceTone` | no | — | The color tone the recipe is tinted with. |
| `radius` | `SurfaceRadius` | no | — | The corner rounding. Default `lg`. |
| `padding` | `SurfacePadding` | no | — | The inner spacing step. Default `xl`. |
| `elevation` | `SurfaceElevation` | no | — | The shadow depth. |

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
- Focused test references: [Overlays.contract.dom.test.ts](../../../../tests/unit/presentation/overlays/Overlays.contract.dom.test.ts),
  [ModalWidth.browser.test.ts](../../../../tests/unit/presentation/overlays/ModalWidth.browser.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
