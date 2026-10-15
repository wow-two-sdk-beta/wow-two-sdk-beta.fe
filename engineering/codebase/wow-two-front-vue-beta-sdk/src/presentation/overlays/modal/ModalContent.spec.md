# ModalContent

Renders the portalled dialog surface — scrim, focus trap, scroll lock, and the a11y panel.

Source: [ModalContent.vue](ModalContent.vue).

Public import: `import { ModalContent } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- `size` picks the max-width step (`ModalSize`, exported beside the component). The panel is centered and reaches
  that cap whatever its content length: `w-full` resolves against the window, never against the content.
- The panel caps at the viewport (`100dvh - 2rem`) as a flex column: its `ModalBody` scrolls between a fixed header and footer, and a panel without a body scrolls whole.
- `phoneLayout` (`ModalPhoneLayout`, exported beside the component) applies below `sm`; from `sm` up every layout is the
  centred card.
  - `fullscreen` (default) fills the window with no corner radius. `ModalBody` takes the free height and scrolls, so the
    footer pins to the bottom; a `<form>` that is the panel's direct child joins that column. Without a body the
    panel scrolls whole.
  - `sheet` docks to the bottom edge at full width, rounded on top, under the same `100dvh - 2rem` cap.
  - `card` keeps the centred card inside the 1rem gutter.
- The phone layout's width, height and radius win over a caller's `class`, which still shapes the card.
- `fullscreen` reserves the top and bottom safe-area insets, `sheet` the bottom one; the spacers are `aria-hidden` and
  collapse from `sm` up. `fullscreen` also offsets `ModalClose` below the top inset.
- Phones rise from the bottom edge (`--animate-sheet-in` / `--animate-sheet-out`); the card pops. Every animation is
  `motion-safe:`, so reduced motion shows and hides the panel without movement.
- `showHandle` draws a grab handle on a phone `sheet` only. A drag past 96px (or a third of the panel) dismisses when
  the owner's outside-click dismissal is on; otherwise, and for shorter drags, the panel springs back. The handle is
  `aria-hidden` and pointer-only; Escape and the dialog's own controls stay the keyboard path.
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
| `size` | `ModalSize` | no | `md` | The max-width step: `sm` 24rem · `md` 32rem · `lg` 42rem · `xl` 56rem · `full` the window inside its gutter. A `max-w-*` class still overrides it. |
| `variant` | `SurfaceVariant` | no | — | The visual recipe. Default `elevated`. |
| `tone` | `SurfaceTone` | no | — | The color tone the recipe is tinted with. |
| `radius` | `SurfaceRadius` | no | — | The corner rounding. Default `lg`. |
| `padding` | `SurfacePadding` | no | — | The inner spacing step. Default `xl`. |
| `elevation` | `SurfaceElevation` | no | — | The shadow depth. |
| `phoneLayout` | `ModalPhoneLayout` | no | `fullscreen` | The layout below `sm`: `fullscreen` · `sheet` · `card`. |
| `showHandle` | `boolean` | no | `false` | A grab handle on a phone `sheet`; dragging it down dismisses where outside clicks may. |

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
  [ModalWidth.browser.test.ts](../../../../tests/unit/presentation/overlays/ModalWidth.browser.test.ts),
  [ModalPhoneLayout.dom.test.ts](../../../../tests/unit/presentation/overlays/ModalPhoneLayout.dom.test.ts),
  [ModalPhone.browser.test.ts](../../../../tests/unit/presentation/overlays/ModalPhone.browser.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
