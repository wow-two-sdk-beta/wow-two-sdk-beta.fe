# useAdaptiveList

Returns a cursor-paged list that loads its next page before the reader reaches the end. Source: [UseAdaptiveList.ts](UseAdaptiveList.ts).

Public import: `import { useAdaptiveList } from '@wow-two-beta/fe/foundation/virtualization';`.

> **Deprecated** since `0.0.72`: use [`useLoadMore`](UseLoadMore.spec.md) with `LoadMoreButton`. It stays until its
> last consumers (fe-events `EventsFeed.vue`, the playground `FormsGroup.vue`) move, then it is removed.

## Contract

- Headless and network-free: the consumer supplies `load(cursor, signal)`, binds `sentinel` to an empty element after the last item and renders `items`.
- `load` receives `null` for the first page, then the previous page's `next`. It resolves `{ items, next, hasMore }`; `items` append in load order, and `hasMore: false` ends the loading.
- The first page loads after mount, on the client only. A server render holds an empty list.
- An `IntersectionObserver` with `rootMargin` (default `'0px 0px 75% 0px'`) watches the sentinel, so a page starts loading while the sentinel is still that far below the fold. `root` names a scroll container; omit it for the viewport.
- The observer is rebuilt after every page that lands. A fresh observer reports the sentinel's current state, so a viewport that is still not full keeps loading, and a sentinel that scrolled away loads nothing.
- One page loads at a time. `loadMore()` joins the load in flight and is a no-op once `hasMore` is `false` or while `isEnabled` is `false`.
- A rejected `load` sets `error`, keeps the loaded items and `hasMore`, and drops the observer. Nothing retries on its own; `loadMore()` clears `error` and tries again.
- `reset()` aborts the load in flight (its `signal`), ignores that request's late answer, clears the items, the cursor and `error`, and loads the first page. Call it when a filter or search changes.
- Without `IntersectionObserver` nothing loads by itself; `loadMore()` still works.
- It never removes an item from the DOM. Pair `items` with `useVirtualList` for a feed long enough to need windowing.

## Options

| Option       | Type                                                                                          | Required | Default             | Meaning                                                       |
| ------------ | --------------------------------------------------------------------------------------------- | -------- | ------------------- | ------------------------------------------------------------- |
| `load`       | `(cursor: TCursor \| null, signal: AbortSignal) => Promise<AdaptiveListPage<TItem, TCursor>>` | yes      | —                   | Loads one page.                                               |
| `root`       | `MaybeRefOrGetter<Element \| Document \| null \| undefined>`                                  | no       | the viewport        | The scroll container the sentinel is measured against.        |
| `rootMargin` | `string`                                                                                      | no       | `'0px 0px 75% 0px'` | The margin that starts a load before the sentinel is visible. |
| `isEnabled`  | `MaybeRefOrGetter<boolean>`                                                                   | no       | `true`              | Suspends loading, the first page included, while `false`.     |

`TItem` is the item type and `TCursor` the cursor type (default `string`).

## Returns

| Member      | Type                                  | Meaning                                                            |
| ----------- | ------------------------------------- | ------------------------------------------------------------------ |
| `items`     | `Readonly<Ref<ReadonlyArray<TItem>>>` | Every item loaded so far. Replaced on each page, never mutated.    |
| `isLoading` | `Readonly<Ref<boolean>>`              | Whether a page is loading.                                         |
| `error`     | `Readonly<Ref<unknown>>`              | What the last `load` rejected with, or `null`.                     |
| `hasMore`   | `Readonly<Ref<boolean>>`              | Whether another page may follow.                                   |
| `sentinel`  | `Ref<HTMLElement \| null>`            | The element to bind after the last item: `<div ref="sentinel" />`. |
| `loadMore`  | `() => Promise<void>`                 | Loads the next page now; the retry after an `error`.               |
| `reset`     | `() => Promise<void>`                 | Starts over from the first page.                                   |

## Verification

- Focused tests: [UseAdaptiveList.dom.test.ts](../../../tests/unit/foundation/virtualization/UseAdaptiveList.dom.test.ts) — the first page, the next page with its cursor through a mocked `IntersectionObserver` and its `rootMargin`, no load while outside the margin, a refilled viewport, the stop at `hasMore: false`, `reset()` with a request in flight and after the end, error and retry, `isEnabled`.
