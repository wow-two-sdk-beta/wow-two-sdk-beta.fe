# useLoadMore

Loads a long collection page by page: the first page, a `Show more` gate, then pages sized and timed by the reader's
scroll speed, with live inserts, failure episodes and view restore. Source: [UseLoadMore.ts](UseLoadMore.ts).

Public import:
`import { useLoadMore, cursorPaging, offsetPaging, fromTokenPage, fromOffsetPage, LoadMoreState } from '@wow-two-beta/fe/foundation/virtualization';`.
The controls are `LoadMoreButton` and `NewItemsButton` from `@wow-two-beta/fe/presentation/actions`.

## Contract

- The consumer supplies a `source` (`cursorPaging(read)` or `offsetPaging(read)`), a `key` per item and the `list`
  element whose direct children are the items. It renders `rows` — each row carries `item` (or `undefined` for a
  skeleton stand-in), `index` and `key` — spreads `itemAttrs(row.index)` on each child and `listAttrs` on the list.
- States (`LoadMoreState`): `firstLoad` → `gated` (more exist, `Show more` visible) → `automatic` (pages load by
  scroll) → `end`; a failed first page is `unavailable`. `next: null` on any page ends the collection; an empty first
  page ends it with `region.isEmpty`.
- First load: `firstPageSize` stand-ins (default `pageSizes.minimum`) until the page lands. The first read runs after
  mount on the client only; a server render holds `firstLoad`, reads no DOM and sends no request.
- `showMore()` reads `pageSizes.minimum`, appends, turns `automatic` and focuses the first new item (its
  `focusTarget`, else its first focusable descendant, else the item with `tabindex="-1"`, `preventScroll`).
- Once `Show more` was pressed in the view, a query change stays `automatic` until the view unmounts; a view where it
  was never pressed is gated after each first page.
- Automatic reads follow `useAdaptiveWindow`: the lookahead and the page size grow with scroll speed, one read is in
  flight, follow-ups run while the end stays in range. While a next page is in flight and the window reaches the end,
  `rows` ends with 3 stand-ins in a list or one row of `columns` stand-ins in a grid. No `Loading…` text is rendered.
- De-duplication by `key`: a row the server returns again appears once.
- Failures: a next-page failure returns to `gated`; a first-page failure is `unavailable` with `region.error`.
  `onFailure(failure, phase)` runs once per failure episode and phase (`first`, `next`, `head`); a success ends the
  episode. A cancellation (aborted signal, or `isCancellation(failure)`, default `code === 'cancelled'`) changes
  nothing and never notifies.
- Query change: `query` is serialised with sorted keys (`loadMoreQueryKey`); a change aborts every read, scrolls the
  list top into view, keeps `min(firstPageSize, previous count)` stand-ins and reads the first page. A late page of
  the old query never lands. Unmount aborts and drops late answers.
- Offline (`useOnlineStatus`) and `isEnabled: false` hold every read; back online, the next scroll or press reads.
- Live data: `refreshHead()` re-reads the first page — new items at the start are prepended when the reader is at the
  start, else held as pending (`pendingCount`, `NewItemsButton`); known items upsert in place (`isSameItem` keeps the
  current object); a head page sharing no item with the list is a gap, held until `showPending()` resets. A failed
  head read sets `isStale` and keeps the content. `visibilitychange` to visible runs `refreshHead()` unless
  `refreshesOnFocus` is `false`.
- `insertAtStart(items)`, `upsert(item)` and `remove(key)` apply pushed changes; offset paging shifts its next offset
  by the items added or removed (no repeat, no skip); cursor paging is unchanged. Every change above the reader is
  anchored: the first visible item keeps its on-screen top. Scrolling back to the start merges pending items.
- `showPending()` scrolls to the start (instant under `prefers-reduced-motion: reduce`, else smooth), merges the
  pending items and focuses the first.
- A focused item stays rendered while the window moves (up to 200 rendered items); past that the list element takes
  focus, so focus never falls to `body`.
- `snapshot()` captures items, cursor, mode, totals and scroll offset; a new instance with `initial` restores them
  when `initial.queryKey` equals the current query key and ignores it otherwise.

## Options

| Option | Type | Meaning |
| --- | --- | --- |
| `source` | `LoadMoreSource<TItem, TCursor, TMeta, TFailure>` | The paging strategy over one endpoint. |
| `key` | `(item) => string \| number` | Stable identity for de-duplication, upsert, live inserts, focus and row keys. |
| `list` | `MaybeRefOrGetter<Element \| ComponentPublicInstance \| null>` | The element whose direct children are the items. |
| `query` | `MaybeRefOrGetter<unknown>` | Everything that selects the collection; a change resets. |
| `pageSizes` | `MaybeRefOrGetter<PageSizeBounds>` | Default `{ minimum: 20, maximum: 100 }`, clamped (`minimum ≥ 1`, `maximum ≥ minimum`, whole numbers). |
| `firstPageSize` | `MaybeRefOrGetter<number>` | Default `pageSizes.minimum`. |
| `layout` | `MaybeRefOrGetter<'list' \| 'grid'>` | Default `'list'`. |
| `estimatedRowHeight` | `number` | A list row's estimate, px; default 48. |
| `cardAspectRatio` | `number` | A grid card's width / height before it is measured; default 1. |
| `isWindowed` | `MaybeRefOrGetter<boolean>` | Default `true`; DOM windowing in `automatic`. |
| `isEnabled` | `MaybeRefOrGetter<boolean>` | Default `true`; `false` holds every request. |
| `isSameItem` | `(current, next) => boolean` | `true` keeps the current object on upsert. |
| `focusTarget` | `(element) => HTMLElement \| null` | Where focus lands inside an item. |
| `onFailure` | `(failure, phase) => void` | Once per failure episode and phase; never for a cancellation. |
| `isCancellation` | `(failure) => boolean` | Default `failure.code === 'cancelled'`. |
| `refreshesOnFocus` | `boolean` | Default `true`. |
| `initial` | `LoadMoreSnapshot` | Restores a view with the same query key. |

## Returns

`LoadMore<TItem, TCursor, TMeta>`: `items`, `rows`, `window` (`{ start, end, paddingStart, paddingEnd }`), `state`,
`isLoadingNext`, `isRefreshingHead`, `isStale`, `total`, `meta`, `pendingCount`, `lastAdded`, `region` (`v-bind` on
`DataRegion`: `isFirstLoad`, `isRefreshing`, `error`, `hasData`, `isEmpty`), `listAttrs` (`aria-busy` while a next
page loads, `overflow-anchor: none` and the window padding), `itemAttrs(index)`, and the operations `showMore`,
`refresh`, `refreshHead`, `reset`, `insertAtStart`, `upsert`, `remove`, `showPending`, `snapshot`.

Paging helpers: `cursorPaging(read)` (`shift` is identity), `offsetPaging(read)` (`next` = offset + length, ends at
an empty page, at `total` or at a short page without `total`; `shift` moves by the delta, floored at 0),
`fromTokenPage` / `fromOffsetPage` map the http `TokenPage` / `Page` contracts, `clampPageSizes` bounds a page size.

## Verification

- [LoadMorePaging.test.ts](../../../tests/unit/foundation/virtualization/LoadMorePaging.test.ts) (node): offset and
  cursor paging, page mappers, page-size clamping.
- [UseLoadMore.dom.test.ts](../../../tests/unit/foundation/virtualization/UseLoadMore.dom.test.ts) (happy-dom): the
  states, gate, focus, de-duplication, failure episodes, cancellation, query change mid-flight, head refresh, offset
  shift, snapshot, unmount, offline hold, `visibilitychange` and the list's tail stand-ins.
- [UseLoadMore.ssr.test.ts](../../../tests/unit/foundation/virtualization/UseLoadMore.ssr.test.ts): `firstLoad`, no
  DOM read, no request.
- [UseLoadMore.browser.test.ts](../../../tests/unit/foundation/virtualization/UseLoadMore.browser.test.ts) (chromium,
  webkit; real layout): slow-network tail stand-ins with one read in flight, a filter change mid-flight, a fast fling
  (maximum page, ≤ 200 DOM items, non-empty window), live insert held while away, upsert anchoring ±1 px, reduced
  motion, the grid's tallest-card rows and the focused-row cap.
- Not covered: the learned-latency lookahead in real time (proven with supplied time in
  `UseAdaptiveWindow.dom.test.ts`), and Firefox where its browser project does not start.
