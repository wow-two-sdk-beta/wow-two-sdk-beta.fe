# NewItemsButton

Renders the `N new` pill over a long collection while live items wait for the reader; activating shows them.
Source: [NewItemsButton.vue](NewItemsButton.vue).

Public import: `import { NewItemsButton } from '@wow-two-beta/fe/presentation/actions';`.

## Contract

- Place it inside the scroller, before the list: `<NewItemsButton :loader="loader" />`. It sticks to the scroller's
  top and takes no height.
- Renders only while `loader.pendingCount > 0` — live items that arrived while the reader was away from the start.
- Activation calls `loader.showPending()`: the list scrolls to the start (instant under reduced motion), the pending
  items merge and focus moves to the first. A gap (the head shares no item with the list) resets the collection.
- `label(count)` sets the text; default `{count} new`.

## Props

| Prop | Type | Default |
| --- | --- | --- |
| `loader` | `LoadMore<any, any, any>` | required |
| `label` | `(count: number) => string` | `` (count) => `${count} new` `` |

## Verification

- [LoadMoreButton.browser.test.ts](../../../../tests/unit/presentation/actions/LoadMoreButton.browser.test.ts)
  (chromium, webkit): the pill renders at `pendingCount > 0`, activation scrolls, merges and focuses the first item.
