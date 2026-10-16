# OptionTilePicker

Renders one square, icon-only tile of a single-select preset grid, washed with tone while active.

Source: [OptionTilePicker.vue](OptionTilePicker.vue).

Public import: `import { OptionTilePicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ Omit<
  ToggleInputProps,
  'modelValue' | 'defaultValue' | 'onUpdate:modelValue' | 'children' | OwnedAttribute | 'title' | 'variant' | 'shape'
>`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `selected` | `boolean` | yes | — | The active-selection state of this tile. |
| `label` | `string` | yes | — | The accessible label + native tooltip — the tile is icon-only, so this is its name. |
| `tone` | `ColorTone` | no | `ColorToneValue.Primary` | The semantic tone palette. Default `primary`. |
| `size` | `ButtonSize` | no | `'sm'` | The tile size. Default `sm`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [];` | Fires when this tile is selected. Re-selecting the active tile is a no-op. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The tile's glyph — an icon, letter, or swatch. The tile is icon-only, so `label` names it. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
