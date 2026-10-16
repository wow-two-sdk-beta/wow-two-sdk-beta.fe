# ImageCropEditor

Renders an image with a movable, resizable crop box — pointer and keyboard — and reports the crop in the image's natural pixels; `toDataURL()` renders the cropped pixels.

Source: [ImageCropEditor.vue](ImageCropEditor.vue).

Public import: `import { ImageCropEditor, type CropRect } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The model is a `CropRect` (`{ x, y, width, height }`) in the image's natural pixels, rounded to whole pixels. `modelValue` / `update:modelValue` and `defaultValue` follow the shared controlled-state helper.
- With no value, the editor shows a default crop and reports nothing until the reader changes it. The default is the largest centered crop at `aspectRatio`, or the middle 80% when the ratio is free.
- Dragging the box moves it; dragging a handle resizes it with the opposite side anchored. A change is reported when the drag ends; thirds guides show while dragging. Every crop stays inside the image and at least `minSize` on each side.
- `aspectRatio` locks width ÷ height and offers corner handles only. A free crop also has edge handles.
- Keyboard: the crop box is one Tab stop named by the caller's `aria-label` or the localized `ImageCropEditor.label`, with a described hint. Arrow keys move it by one rendered pixel; Alt with arrows resizes from the bottom-right corner; Shift multiplies by ten. Each change is announced politely as `640 × 480 at 82, 80`.
- `toDataURL(type?, quality?)` (exposed) renders the crop at natural size. It returns `null` before the image loads, without a 2D canvas, or when a cross-origin image lacks CORS.
- The image renders at its natural width, capped by the container and by `maxHeight` through its ratio, so it keeps a size inside shrink-wrapping parents. Give SVGs a `width` and `height`; one with only a `viewBox` renders at the browser's default size.
- Disabled and read-only states fall back to the surrounding `Field`; both hide the handles and ignore input. Attributes and `class` reach the root.

## Props

| Prop           | Type               | Required | Default     | Meaning                                        |
| -------------- | ------------------ | -------- | ----------- | ---------------------------------------------- |
| `src`          | `string`           | yes      | —           | The image to crop.                             |
| `alt`          | `string`           | no       | `''`        | The image's text alternative.                  |
| `modelValue`   | `CropRect \| null` | no       | —           | The crop, controlled — the `v-model` target.   |
| `defaultValue` | `CropRect \| null` | no       | `null`      | The initial crop when uncontrolled.            |
| `aspectRatio`  | `number`           | no       | —           | The locked width ÷ height; unset crops freely. |
| `minSize`      | `number`           | no       | `16`        | The smallest side in natural pixels.           |
| `maxHeight`    | `string`           | no       | `'24rem'`   | The tallest the image renders.                 |
| `isDisabled`   | `boolean`          | no       | Field state | Blocks interaction and dims the editor.        |
| `isReadOnly`   | `boolean`          | no       | Field state | Shows the crop but blocks changes.             |

## Emits

| Event               | Signature                                | Meaning                                                    |
| ------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [crop: CropRect];` | Fires when a drag or key press finishes changing the crop. |

## Slots

None.

## Exposed handle

`{ toDataURL(type?: string, quality?: number): string | null }` — the cropped pixels as a data URL.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [ImageCropEditor.dom.test.ts](../../../../tests/unit/presentation/forms/ImageCropEditor.dom.test.ts) — default crops, keyboard moves and resizes, locked-ratio corner drags, edge clamping and read-only; [ImageCropEditor.browser.test.ts](../../../../tests/unit/presentation/forms/ImageCropEditor.browser.test.ts) — a real drag and pixel-exact export.
