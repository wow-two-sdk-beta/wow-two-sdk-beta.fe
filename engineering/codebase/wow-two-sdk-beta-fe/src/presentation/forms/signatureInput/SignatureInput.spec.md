# SignatureInput

Renders a pad the reader signs with a pointer — mouse, pen or finger — plus undo and clear, and reports the signature as an image data URL.

Source: [SignatureInput.vue](SignatureInput.vue).

Public import: `import { SignatureInput, SignatureFormat } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The model is a data URL, or `null` when unsigned. `modelValue` / `update:modelValue` and `defaultValue` follow the shared controlled-state helper. A change is reported when a stroke ends, on undo and on clear — never mid-stroke.
- `format: 'svg'` (default) exports a vector `image/svg+xml` data URL built from the strokes, with no canvas needed. `'png'` exports the canvas bitmap at the device pixel ratio, falling back to SVG where no 2D context exists.
- An incoming value cannot be turned back into strokes, so it shows as an image until the reader signs again. The first new stroke replaces it; clear removes it.
- The bitmap tracks the pad's CSS size at the device pixel ratio and repaints the strokes on resize. Strokes keep CSS-pixel coordinates, so shrinking the pad crops them.
- One pointer draws at a time; the pad takes `touch-action: none`, so a finger draws instead of scrolling. Undo removes the last stroke; clear removes everything.
- Keyboard users cannot draw. The canvas is a `role="img"` named by the caller's `aria-label`, the `Field` label or the localized `SignatureInput.label`. A polite status (`Signed` / `Not signed`) reports the state. Offer a typed-name alternative where a signature is required.
- Disabled, read-only and invalid states fall back to the surrounding `Field`; locked pads ignore the pen and disable undo and clear. Attributes and `class` reach the root.
- A `name` ships the data URL in a hidden input.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `string \| null` | no | — | The signature data URL, controlled — the `v-model` target. |
| `defaultValue` | `string \| null` | no | `null` | The initial signature when uncontrolled. |
| `format` | `SignatureFormat` | no | `'svg'` | The export format. |
| `penColor` | `string` | no | text color | The ink color. |
| `penWidth` | `number` | no | `2.5` | The stroke width in CSS pixels. |
| `placeholder` | `string` | no | `'Sign here'` | The hint on an empty pad; localized as `SignatureInput.placeholder`. |
| `isDisabled` | `boolean` | no | Field state | Blocks drawing and the controls. |
| `isReadOnly` | `boolean` | no | Field state | Keeps the signature but blocks drawing. |
| `isInvalid` | `boolean` | no | Field state | Styles the pad as invalid. |
| `name` | `string` | no | — | The hidden input name. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [signature: string \| null];` | Fires when a stroke ends, on undo and on clear. |

## Slots

None.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [SignatureInput.dom.test.ts](../../../../tests/unit/presentation/forms/SignatureInput.dom.test.ts) — SVG paths, dots, undo, clear, saved signatures, read-only and localization; [SignatureInput.browser.test.ts](../../../../tests/unit/presentation/forms/SignatureInput.browser.test.ts) — real canvas ink at the device pixel ratio and PNG export.
