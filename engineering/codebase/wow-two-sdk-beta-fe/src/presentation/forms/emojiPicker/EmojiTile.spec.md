# EmojiTile

Renders one emoji tile as a listbox option — glyph sized by the picker scale, framed by the tile shape.

Source: [EmojiTile.vue](EmojiTile.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `entry` | `EmojiCatalogEntry` | yes | — | The catalog emoji this tile renders. |
| `selected` | `boolean` | yes | — | Whether this tile is the active selection. |
| `size` | `EmojiPickerSize` | yes | — | The tile scale. |
| `shape` | `EmojiTileShape` | yes | — | The tile frame — rounded chip or circle. |
| `isActive` | `boolean` | yes | — | Whether this tile holds the grid's single roving tab stop. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [entry: EmojiCatalogEntry];` | Fires when the reader clicks or keys this tile, carrying its catalog entry. Replaces the legacy `onSelect`. |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
