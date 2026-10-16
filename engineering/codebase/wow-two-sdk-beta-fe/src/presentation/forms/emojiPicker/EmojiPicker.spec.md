# EmojiPicker

Renders a searchable emoji catalog with a recents bucket and a swappable category nav over the bundled set.

Source: [EmojiPicker.vue](EmojiPicker.vue).

Public import: `import { EmojiPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests null (clear) through the caller-owned value; a controlled value remains rendered until the caller accepts. Nested picker reset is handled once by its outer owner.

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `EmojiCatalogEntry \| null` | no | — | The current emoji catalog entry, or `null` for none. The `v-model` binding target. |
| `storage` | `StorageBroker` | yes | — | The persistence contract backing the "recently used" list — required, so the picker stays pure and storage-agnostic. Plug `localStorageStorageBroker` for browser persistence, `memoryStorageBroker()` for a throwaway in-memory store, or a custom `StorageBroker` (Redux, IndexedDB, …). |
| `categoryNavVariant` | `CategoryNavVariant` | no | `CategoryNavVariantValue.Strip` | The category-navigation affordance. Default `strip`. |
| `size` | `EmojiPickerSizeInput` | no | — | The element scale — one value for every element, or a per-element `{ search, nav, tile }`. Default `md`. |
| `tileShape` | `EmojiTileShape` | no | `EmojiTileShapeValue.Rounded` | The emoji-tile frame — rounded chip or circle. Default `rounded`. |
| `rowsCount` | `number` | no | `6` | The scrollable tile viewport's height, in tile rows. Default `6`. |
| `label` | `string` | no | `'Emoji'` | The heading rendered above the picker. Default `Emoji`. |
| `showFirstCategoryWhenRecentsEmpty` | `boolean` | no | `false` | With recents still empty, opens on the first real category instead of the recents bucket. Default `false`. |
| `scrollThumbColor` | `string` | no | — | The scrollbar thumb color for the tile viewport — any CSS color. Default `var(--color-border-strong)`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [entry: EmojiCatalogEntry \| null];` | Fires when the reader picks an emoji or clears the selection — the `v-model` half. |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
