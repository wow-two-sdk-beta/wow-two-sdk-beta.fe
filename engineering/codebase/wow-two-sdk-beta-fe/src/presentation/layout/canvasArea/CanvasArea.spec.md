# CanvasArea

Renders caller content on a plane that pans and zooms inside a fixed box.

Source: [CanvasArea.vue](CanvasArea.vue).

Public import: `import { CanvasArea } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- The viewport is one controlled axis: `viewport` / `update:viewport`. Without `viewport` the area keeps its own, seeded by `initialZoom`; the opening placement emits nothing.
- Content lays out at actual size inside an unscaled plane; the area measures it and re-clamps when the area or the content resizes.
- `bounds: 'content'` keeps the content inside the area: an axis longer than the area pans between its edges, a shorter one centers. `bounds: 'none'` pans anywhere.
- A pointer drag pans once it passes 3 px (mouse) or 8 px (touch, pen); the click that ends a drag does not reach the content. A press without a drag clicks normally.
- Two pointers pinch-zoom about their midpoint and pan with it; the finger left behind continues the drag.
- A wheel with Ctrl or ⌘ held, which is also how a trackpad pinch arrives, zooms about the pointer and never zooms the page. An unmodified wheel pans (`wheel: 'pan'`) or zooms (`wheel: 'zoom'`); a pan that cannot move lets the page scroll.
- Keys while focus is inside and outside a field: `+` / `=` zoom in, `-` zoom out, `0` resets to 100%, arrows pan 40 px (160 px with Shift). An arrow that cannot move leaves the key to the page.
- The built-in controls zoom out, show the percentage (activating it resets to 100%), zoom in and fit. `fit` centers all content and never zooms above 100%. The `controls` slot replaces the buttons.
- Native drag of links and images inside the plane is suppressed so a drag always pans.
- Unmount disposes the wheel listener, the resize observer and every pointer capture.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes. `class` overrides the default `h-96` height, border and fill.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `viewport` | `CanvasViewport` | no | — | The controlled viewport. Pair it with `update:viewport`; omit it and the area keeps its own. |
| `initialZoom` | `number \| 'fit'` | no | `1` | Where an uncontrolled area opens: a zoom factor, or `'fit'` to show all content once measured. |
| `minZoom` | `number` | no | `0.25` | The lower zoom bound. |
| `maxZoom` | `number` | no | `4` | The upper zoom bound. |
| `zoomStep` | `number` | no | `1.25` | The factor one button or key step multiplies the zoom by. |
| `bounds` | `CanvasBounds` | no | `CanvasBounds.Content` | How far the plane may move. |
| `wheel` | `CanvasWheel` | no | `CanvasWheel.Pan` | What an unmodified wheel does. |
| `fitPadding` | `number` | no | `16` | The gap `fit` keeps around the content, in pixels. |
| `hasControls` | `boolean` | no | `true` | Whether the built-in zoom controls render in the bottom-end corner. |
| `labels` | `Partial<Record<'canvas' \| 'controls' \| 'zoomIn' \| 'zoomOut' \| 'reset' \| 'fit', string>>` | no | — | Localized labels for the built-in controls and the area's role description. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:viewport` | `'update:viewport': [viewport: CanvasViewport];` | Requests the next viewport after a drag, wheel, pinch, key or control. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The content placed on the plane, laid out at actual size. |
| `controls` | `controls?(props: CanvasControls): unknown;` | Replaces the built-in zoom buttons inside the corner group. |

## Exposed handle

`{ el, zoomIn, zoomOut, zoomTo, reset, fit, panBy }`. `zoomTo(zoom, anchor?)` keeps the anchor (default: the area's center) over the same content point; `panBy(dx, dy)` returns whether the plane moved. Read these through a component template ref after mount.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [CanvasArea.dom.test.ts](../../../../tests/unit/presentation/layout/CanvasArea.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
