# EmojiPickerPopover

Renders a trigger opening a popover that holds the full `EmojiPicker` — the chat/toolbar-friendly variant.

Source: [EmojiPickerPopover.vue](EmojiPickerPopover.vue).

Public import: `import { EmojiPickerPopover } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests null (clear) through the caller-owned value; a controlled value remains rendered until the caller accepts. Nested picker reset is handled once by its outer owner.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `EmojiCatalogEntry \| null` | no | — | The current emoji catalog entry, or `null` for none. The `v-model` binding target. |
| `storage` | `StorageBroker` | yes | — | The persistence contract backing the "recently used" list. |
| `categoryNavVariant` | `CategoryNavVariant` | no | — | The category-navigation affordance. Default `strip`. |
| `size` | `EmojiPickerSizeInput` | no | — | The element scale — one value for every element, or a per-element `{ search, nav, tile }`. Default `md`. |
| `tileShape` | `EmojiTileShape` | no | — | The emoji-tile frame — rounded chip or circle. Default `rounded`. |
| `rowsCount` | `number` | no | — | The scrollable tile viewport's height, in tile rows. Default `6`. |
| `label` | `string` | no | — | The heading rendered above the picker. Default `Emoji`. |
| `showFirstCategoryWhenRecentsEmpty` | `boolean` | no | — | When `true` and no emoji has been used yet, opens on the first real category. Default `false`. |
| `scrollThumbColor` | `string` | no | — | The scrollbar thumb color for the tile viewport — any CSS color. |
| `placement` | `Placement` | no | `'bottom'` | The popover placement relative to the trigger. Default `bottom`. |
| `open` | `boolean` | no | `undefined` | The open state, controlled. The `v-model:open` binding target. |
| `defaultOpen` | `boolean` | no | `false` | The initial open state when uncontrolled. Default `false`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [entry: EmojiCatalogEntry \| null];` | Fires when the reader picks an emoji in the panel — the `v-model` half. |
| `update:open` | `'update:open': [open: boolean];` | Fires when the popover opens or closes — the `v-model:open` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `trigger` | `trigger?(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
