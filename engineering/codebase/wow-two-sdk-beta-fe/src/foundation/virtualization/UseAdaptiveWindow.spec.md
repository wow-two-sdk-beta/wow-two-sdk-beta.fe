# useAdaptiveWindow

Windows an already-paged list inside its scroller and asks for the next page before the reader reaches the end, sizing
the page by how fast they scroll. Source: [UseAdaptiveWindow.ts](UseAdaptiveWindow.ts).

Public import: `import { useAdaptiveWindow, continuationSize } from '@wow-two-beta/fe/foundation/virtualization';`.

## Contract

- Headless and network-free: the consumer owns the items and the requests. It binds `list` to the element whose direct
  children are the rows (a list) or the cards (a grid), renders the items from `start` up to but not including `end`,
  pads the rest with `paddingStart` and `paddingEnd` pixels, and supplies `load` to fetch and append the next page.
- Nothing is read until `list` holds an element, so a server render, or any render before the first measurement, gets
  the whole list: `start` `0`, `end` `count`, no padding. It does the same while `isWindowed()` is `false`; requests
  then still follow `canLoad()` alone. `useLoadMore` builds on this hook; prefer it for a new paged collection.
- The scroller is the nearest ancestor whose computed `overflow-y` is `auto`, `scroll` or `overlay`; with none, the page
  scrolls and the viewport is the document's. The list may start anywhere inside it: the offset is the part of the list
  already scrolled past, and the viewport is the part of the scroller below the list's top.
- A read happens in an animation frame, after any of: a scroll of the scroller (or the window), a window resize, a
  resize of the list or the scroller, a change of `count`, `isWindowed` or `canLoad`, or a new range. One read measures
  the layout, the viewport and the scroll speed, and decides whether to ask for a page.
- **List** (`grid()` is `false`): one item per row. Each child of the list that `rowIndex` maps to a row is measured
  with `getBoundingClientRect().height`; a row that never rendered keeps `estimatedRowHeight`. The window is six rows
  past the viewport on each side. Measurements are dropped when the list's width changes, and when the list or `grid`
  changes.
- **Grid** (`grid()` is `true`): the columns are the tracks of the list's computed `grid-template-columns`. A rendered
  row is as tall as its tallest card plus the row gap (each child `rowIndex` maps is measured); a row never rendered is
  `cardWidth / cardAspectRatio` plus the row gap, where `cardWidth` is the list's width less the gaps, shared by the
  columns. The window is two rows past the viewport on each side, and `start` is always a multiple of the column
  count, `end` the end of a row or `count`.
- `keepIndex()` names an item to keep rendered (the focused one): the window widens to its row while the widened
  window holds at most `MaxKeptWindowItems` (200) items; past that the item leaves the window.
- A page is requested when `canLoad()` is true, no request is in flight, the scroller has a height,
  the list's top is above the viewport's bottom and the list's bottom is no farther below the viewport's bottom than
  the lookahead:
  `min(4 viewports, 0.75 viewport + speed * (latency + 150ms))`. The `speed` is the downward scroll speed in px/ms,
  smoothed (each sample weighs 65%, the previous speed 35%, decayed by `exp(-elapsed / 300ms)`) and decaying to zero
  while the page rests; scrolling up adds nothing. The `latency` starts at `250ms` and moves 30% of the way toward the
  time each request that appended items took. At rest the lookahead is 75% of a viewport.
- The request is `load(continuationSize(speed, viewportHeight, minimum, maximum))`, with `minimum` and `maximum` read
  from `pageSizes()` at that moment: the minimum page at rest, more the faster the reader goes, never more than the
  maximum.
- One request is in flight at a time, across scrolls, resizes and a switch between list and grid.
- `load` resolves `true` when it appended items. The hook then reads again at once and asks again while the end is
  still in range, until a page lands that moves it out of range. A `load` that resolves `true` without growing the
  list is asked again on every frame.
- `load` resolving `false` or rejecting schedules no read. The next scroll, resize or change of an option asks again,
  so turn `canLoad` off when nothing is left and after a failure, as the consumer's own state allows.
- At unmount, or when `list` changes, it removes its listeners, disconnects its observer and cancels a waiting frame.
  A request that lands afterwards schedules nothing.
- It needs `requestAnimationFrame` and `ResizeObserver` once an element is attached, and reads no DOM before that.

## Options

| Option               | Type                                         | Meaning                                                                                     |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `count`              | `() => number`                               | How many items are loaded.                                                                  |
| `grid`               | `() => boolean`                              | Whether the list is a grid of cards rather than a column of rows.                           |
| `isWindowed`         | `() => boolean`                              | `true` renders only the window; `false` covers every item. Requests follow `canLoad` alone. |
| `keepIndex`          | `() => number \| undefined`                  | Optional. An item kept rendered (the focused one), up to `MaxKeptWindowItems` items.        |
| `canLoad`            | `() => boolean`                              | Whether a next page exists and may be requested: turn it off for the end and for a failure. |
| `pageSizes`          | `() => { minimum: number; maximum: number }` | The smallest and the largest page to request; the maximum wins if it is lower.              |
| `load`               | `(limit: number) => Promise<boolean>`        | Requests and appends a page of about `limit` items; resolves `true` when it appended.       |
| `rowIndex`           | `(element: Element) => number \| undefined`  | The row a child of the list stands for, or `undefined` to skip it. List mode only.          |
| `estimatedRowHeight` | `number`                                     | The height, in pixels, of a row not measured yet. The list's first guess.                   |
| `cardAspectRatio`    | `number`                                     | A card's width divided by its height. Grid mode only.                                       |

The function options are read when they are needed, so a reactive source behind them is followed;
`estimatedRowHeight` and `cardAspectRatio` are plain numbers.

## Arguments and returns

`useAdaptiveWindow(list, options)` takes `list: Ref<HTMLElement | null>` and returns an `AdaptiveWindow`:
`{ range, columns, viewport, scroller, scrollListTo, anchor }`. Before `0.0.72` it returned the range itself; read
`.range.value` now.

| Member         | Type                                    | Meaning                                                                         |
| -------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| `range`        | `ComputedRef<AdaptiveRange>`            | The window, below.                                                              |
| `columns`      | `ComputedRef<number>`                   | The grid's column count; 1 for a list.                                          |
| `viewport`     | `ShallowRef<{ offset, height }>`        | Pixels of the list scrolled past, and the list's visible height.                |
| `scroller`     | `ShallowRef<HTMLElement \| null>`       | The nearest scrolling ancestor; `null` for the document.                        |
| `scrollListTo` | `(offset, behavior) => void`            | Scrolls so `offset` px of the list sit above the viewport top.                  |
| `anchor`       | `(keyAt) => () => Promise<void>`        | Records the first visible item; the restore keeps its on-screen top after a DOM change. |

`AdaptiveRange`:

| Member         | Type     | Meaning                                                |
| -------------- | -------- | ------------------------------------------------------ |
| `start`        | `number` | The first item to render.                              |
| `end`          | `number` | One past the last item to render, never above `count`. |
| `paddingStart` | `number` | The pixels of rows skipped before `start`.             |
| `paddingEnd`   | `number` | The pixels of rows skipped after `end`.                |

`continuationSize(speed, viewportSize, minimum, maximum)` is the pure page-size rule, exported on its own:
`speed` in px/ms, `viewportSize` in px (floored at 1). The page is `minimum` for every started 1.5 viewports a second,
capped at `maximum`: `min(maximum, minimum * max(1, ceil(speed * 1000 / viewportSize / 1.5)))`. At rest, or while
scrolling up, that is `minimum`; the cap wins when `maximum` is below `minimum`.

## Verification

- Focused tests: [UseAdaptiveWindow.test.ts](../../../tests/unit/foundation/virtualization/UseAdaptiveWindow.test.ts)
  for `continuationSize` — speed 0, the 1.5 and 3 viewport-a-second step boundaries, the viewport floor, the maximum
  and a minimum above it; and
  [UseAdaptiveWindow.dom.test.ts](../../../tests/unit/foundation/virtualization/UseAdaptiveWindow.dom.test.ts) on
  happy-dom with the geometry, time and animation frames supplied by the test — the range before measurement and
  while disabled, list windowing, scrolling and padding, measured against estimated rows, a list that starts below the
  scroller's top, a page-level scroll, the grid's columns, rows and overscan, the line at 75% of a viewport, the page
  size by speed, the latency it learns, the follow-up and the stop after `false` or a rejection, one request in flight
  through a switch between list and grid, and the cleanup at unmount.
- Not covered: real layout. The tests feed the hook the rects and sizes a browser would report, not the ones a browser
  computes, and the pairing with a rendering component is the consumer's.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
