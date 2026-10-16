# StickyLayout

Renders a region that pins to the top or bottom edge of its scroll area and reports whether it is pinned.

Source: [StickyLayout.vue](StickyLayout.vue).

Public import: `import { StickyLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- The region is `position: sticky` on the `z-sticky` tier, offset by `offset` px from its `side`.
- A zero-height sentinel beside the region feeds one `IntersectionObserver`; the region counts as pinned only once the sentinel passes the pinned edge, not while it is still ahead of the viewport.
- Pass the scroll container as `root` when the region sticks inside one; the default root is the viewport.
- Server rendering and browsers without `IntersectionObserver` report "not pinned" and still stick through CSS.
- Attributes and `class` reach the region; the exposed handle is the region element.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `side` | `StickyLayoutSide` | no | `'top'` | The edge the region pins to. |
| `offset` | `number` | no | `0` | The gap between the pinned region and the edge in px; negative values count as 0. |
| `root` | `HTMLElement \| null` | no | `null` | The scroll container used for pin detection; `null` is the viewport. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `stuck-change` | `'stuck-change': [isStuck: boolean];` | Fires when the region pins or unpins. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(props: { isStuck: boolean }): unknown` | The pinned content. |

## Exposed handle

`{ el }` — the region element.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts).
- Focused tests: [StickyAndVirtual.dom.test.ts](../../../../tests/unit/presentation/layout/StickyAndVirtual.dom.test.ts) — offsets, observer margins, pin transitions and the bottom edge.

## Interaction guarantees

The region carries `data-stuck` while pinned and `data-side`, so pinned styling needs no script; the sentinel is `aria-hidden` and takes no space.
