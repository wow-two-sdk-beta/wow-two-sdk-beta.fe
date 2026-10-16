# ColorSwatchItem

Renders one roving-focus swatch stop inside a `ColorSwatchPicker`.

Source: [ColorSwatchItem.vue](ColorSwatchItem.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Mount within the owner supplying `useRovingFocusItem`; a compound part is not an independent root.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `color` | `string` | yes | — | The swatch color. |
| `isSelected` | `boolean` | yes | — | The selected state. |
| `isDisabled` | `boolean` | yes | — | The disabled state. |
| `size` | `ColorSwatchPreviewSize` | no | — | The swatch size step. |
| `shape` | `SwatchShape` | no | — | The swatch outline shape. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [color: string];` | Fires when the swatch is clicked or activated with Enter / Space. |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
