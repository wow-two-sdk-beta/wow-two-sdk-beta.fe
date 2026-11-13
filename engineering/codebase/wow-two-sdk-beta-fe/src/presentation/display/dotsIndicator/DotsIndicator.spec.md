# DotsIndicator

Renders a row of dots for a position in a longer series, calculating its own window of dots around the current item.

Source: [DotsIndicator.vue](DotsIndicator.vue); the window rule is [DotsIndicatorWindow.ts](DotsIndicatorWindow.ts).

Public import: `import { DotsIndicator } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- It is presentational: it holds no state, emits nothing and its dots are not buttons. `Carousel.Dots` is the interactive row inside a `Carousel`; this is the compact one for a card or a header.
- With `count` at most `visibleCount` it shows every item. With more items it shows `visibleCount` dots, keeps the current item's dot highlighted on the centre dot while it can, and slides along as `index` moves. At the first and last items the window stops and the highlighted dot moves toward that edge.
- An even `visibleCount` centres one dot early. 10 items with the third current show items 2–4 for `visibleCount` 3 (current in the middle) and items 1–5 for 5 (current in the middle).
- When more items lie beyond a window's edge dot, that dot is drawn smaller and fainter (`data-edge="start" | "end"`), so the row reads as "more this way".
- `index` is clamped into range and a non-finite `count`, `index` or `visibleCount` falls back to a safe value; with no items nothing renders.
- The dots take the current text colour (`bg-current`): the current dot is solid, the rest faded. Set the colour with a text utility on the root, such as `text-white` over a photograph.
- The root is one image, `role="img"`, named by position (`3 of 10`) through the locale key `DotsIndicator.position`; the dots are hidden from assistive technology.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type     | Required | Default | Meaning                                               |
| -------------- | -------- | -------- | ------- | ----------------------------------------------------- |
| `count`        | `number` | yes      | —       | The total number of items the dots stand for.         |
| `index`        | `number` | yes      | —       | The current item, zero-based; clamped into range.     |
| `visibleCount` | `number` | no       | `5`     | The most dots shown; every item when there are fewer. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted or when there are no items.

## Window function

`dotsIndicatorWindowOf(count, index, visibleCount)` returns the dots to draw as `{ position, isActive, edge? }`, `position` being the zero-based item. It is exported for a consumer that draws its own dots.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused tests: [DotsIndicator.dom.test.ts](../../../../tests/unit/presentation/display/DotsIndicator.dom.test.ts) covers the window rule and the rendered dots.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
