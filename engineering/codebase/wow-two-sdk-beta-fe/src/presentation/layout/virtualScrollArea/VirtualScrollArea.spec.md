# VirtualScrollArea

Renders a scroll area that keeps only the rows near its viewport in the DOM.

Source: [VirtualScrollArea.vue](VirtualScrollArea.vue).

Public import: `import { VirtualScrollArea } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Generic over the item type `T`; the default slot renders one item and receives it with its index.
- Built on `foundation/virtualization`'s `useVirtualList`: a spacer sized to the whole list keeps the scrollbar honest, and rows are positioned by transform.
- Size the area through `class` or `style`; it scrolls its own content and renders only the viewport plus `overscan` rows each side.
- Fixed rows take `itemSize` exactly. With `hasVariableSize`, rows render at their natural size, one `ResizeObserver` measures them, and above-the-fold growth is scroll-anchored so content does not jump.
- `getKey` keeps measurements with their items across reorders; a new `itemSize` re-lays out the list.
- `end-reached` fires once per list length when the rendered window comes within `endThreshold` items of the end — the hook for loading the next page.
- Server rendering and the first client frame render no rows until the viewport is measured.
- Horizontal areas lay out left to right; right-to-left horizontal scrolling is not supported.
- Attributes and `class` reach the scrolling element; a `role="list"` there pairs with `role="listitem"` and `aria-posinset` / `aria-setsize` in the slot.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `items` | `ReadonlyArray<T>` | yes | — | The full item list. |
| `itemSize` | `number \| ((index: number) => number)` | yes | — | Each item's size along the axis in px — exact, or the estimate with `hasVariableSize`. |
| `hasVariableSize` | `boolean` | no | `false` | Measures rendered rows so they settle to their real size. |
| `overscan` | `number` | no | `3` | Extra rows rendered beyond each edge. |
| `isHorizontal` | `boolean` | no | `false` | Scrolls horizontally instead of vertically. |
| `getKey` | `(item: T, index: number) => string \| number` | no | index | Stable identity per item. |
| `endThreshold` | `number` | no | `5` | How close to the end the window must come to report `end-reached`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `end-reached` | `'end-reached': [];` | Fires once per list length when the rendered window nears the end. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(props: { item: T; index: number }): unknown` | One rendered item. |
| `empty` | `empty?(): unknown` | The content for an empty list. |

## Exposed handle

`{ el, scrollToIndex(index, align?) }` — the scrolling element, and a scroll that reveals one item (`'auto'` · `'start'` · `'center'` · `'end'`).

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts).
- Focused tests: [StickyAndVirtual.dom.test.ts](../../../../tests/unit/presentation/layout/StickyAndVirtual.dom.test.ts) — windowing, scrolling, end reporting, the exposed scroll, the empty slot and measured rows.
