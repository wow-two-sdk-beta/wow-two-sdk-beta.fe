# ColorSwatchPreview

Renders a color chip over a checkerboard backdrop — a `<button>` when given a click listener, else a `<div>`.

Source: [ColorSwatchPreview.vue](ColorSwatchPreview.vue).

Public import: `import { ColorSwatchPreview } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `color` | `string` | no | `'#000000'` | Any CSS color string. Default `#000000`. |
| `size` | `ColorSwatchPreviewSize` | no | — | The swatch size step. |
| `shape` | `SwatchShape` | no | — | The swatch outline shape. |
| `isSelected` | `boolean` | no | `undefined` | The selected state — draws the selection ring. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Also sets `disabled` on the interactive (`<button>`) form. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
