# LoadMoreButton

Renders the end of a long collection loaded by `useLoadMore`: the `Show more` gate, its hidden automatic twin and one
status line. Source: [LoadMoreButton.vue](LoadMoreButton.vue).

Public import: `import { LoadMoreButton } from '@wow-two-beta/fe/presentation/actions';`.

## Contract

- Place it right after the list, bound to the same handle: `<LoadMoreButton :loader="loader" />`.
- `gated`: an outline `Button` with `label` (default `Show more`) and a fade over the list's last rows; the fade is
  `aria-hidden` and lets the pointer through. Activation calls `loader.showMore()`; focus moves to the first new item
  without a visible ring after a pointer press. The button shows its loading state while the page is in flight.
- `automatic`: the button stays in the tab order but is visually hidden (`sr-only` on a wrapper) until it holds focus,
  so a keyboard reader can still load the next page on Enter; the pointer reader loads by scrolling.
- `firstLoad`, `unavailable` and `end`: no button.
- One `role="status"` `aria-live="polite"` line: it says nothing during the first load (`DataRegion` announces that),
  `announceLoaded(added, loaded, total)` once per landed page (default `{added} more loaded, {loaded} of {total}`) and
  `announceEnd(loaded)` once at the end (default `All {loaded} loaded`).
- Every string is a prop. The button's coarse-pointer hit area uses `::before`.

## Props

| Prop | Type | Default |
| --- | --- | --- |
| `loader` | `LoadMore<any, any, any>` | required |
| `label` | `string` | `'Show more'` |
| `announceLoaded` | `(added: number, loaded: number, total?: number) => string` | `{added} more loaded, {loaded} of {total}` |
| `announceEnd` | `(loaded: number) => string` | `All {loaded} loaded` |

## Verification

- [LoadMoreButton.browser.test.ts](../../../../tests/unit/presentation/actions/LoadMoreButton.browser.test.ts)
  (chromium, webkit): keyboard only (Tab to `Show more`, Enter focuses item 31, Tab never lands on `body`, the button
  leaves at the end), the automatic twin revealed on focus, pointer press without a ring, one polite status line,
  `aria-busy`, the `aria-hidden` fade and no axe violations in `gated` and `automatic`.
