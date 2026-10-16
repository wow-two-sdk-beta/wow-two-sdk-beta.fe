# OverlayCloseButton

Renders the dismiss control of a Modal / Drawer panel; it closes the overlay and restores focus.

Source: [OverlayCloseButton.vue](OverlayCloseButton.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Mount within the owner supplying `useOverlayChromeContext`; a compound part is not an independent root.
- The default glyph button sits 1rem from the top-right corner, plus `--ui-overlay-inset-top` where the panel sets it
  (a fullscreen `ModalContent` on a phone sets the top safe-area inset).
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `asChild` | `boolean` | no | `false` | Merge onto the single slot child instead of rendering a `<button>`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
