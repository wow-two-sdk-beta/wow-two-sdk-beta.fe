# EmojiGrid

Renders emoji as an auto-filling `listbox`, or a muted hint when the visible set is empty.

Source: [EmojiGrid.vue](EmojiGrid.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `emojis` | `ReadonlyArray<EmojiCatalogEntry>` | yes | — | The emoji to lay out, in order. |
| `selectedGlyph` | `string \| null` | yes | — | The selected emoji's glyph, or `null`. |
| `size` | `EmojiPickerSize` | yes | — | The tile scale. |
| `shape` | `EmojiTileShape` | yes | — | The tile frame — rounded chip or circle. |
| `emptyLabel` | `string` | no | — | The muted hint shown when `emojis` is empty. |
| `viewportRows` | `number` | no | — | The fixed viewport height, in tile rows; when set, the grid scrolls inside a constant-height box. |
| `scrollThumbColor` | `string` | no | — | The scrollbar thumb color — any CSS color. Default `var(--color-border-strong)`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [entry: EmojiCatalogEntry];` | Fires when the reader activates a tile in the grid, carrying its entry. Replaces the legacy `onSelect`. |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
