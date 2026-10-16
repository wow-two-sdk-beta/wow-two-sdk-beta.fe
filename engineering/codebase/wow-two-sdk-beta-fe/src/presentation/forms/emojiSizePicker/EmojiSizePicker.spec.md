# EmojiSizePicker

Renders the emoji size as a tile set — each tile previews the given glyph at that preset size, no numbers.

Source: [EmojiSizePicker.vue](EmojiSizePicker.vue).

Public import: `import { EmojiSizePicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests DefaultEmojiSize through the caller-owned value. The controlled value remains rendered until the caller accepts.

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `glyph` | `string` | yes | — | The emoji rendered inside each tile, so the choice previews the real glyph at that size. |
| `modelValue` | `number` | no | — | The current size ratio, controlled. The `v-model` binding target. |
| `size` | `ButtonSize` | no | — | The preset-tile scale, forwarded to each `OptionTilePicker`. Default `sm`. An indexed access into an imported interface (`OptionTilePickerProps['size']`) is opaque to the SFC compiler's type resolver — it fails the build while `vue-tsc` stays green — so the named alias the tile itself uses is spelled out instead. |
| `maxPreviewGlyph` | `number` | no | `DefaultMaxPreviewGlyph` | Largest preview glyph, in px — caps each tile's glyph so it never clips the `OptionTilePicker` frame. Default `24`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [ratio: number];` | Fires when the reader picks a size tile — the `v-model` half. |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
