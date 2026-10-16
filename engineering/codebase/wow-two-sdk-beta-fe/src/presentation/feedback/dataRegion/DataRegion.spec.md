# DataRegion

Renders one data region through its first load, refresh, failure and empty outcomes.

Source: [DataRegion.vue](DataRegion.vue).

Public import: `import { DataRegion } from '@wow-two-beta/fe/presentation/feedback';`.

## Contract

- Wrap each region that loads as one in a single `DataRegion`; drive it with `useAppQuery`'s `isFirstLoad`,
  `isRefreshing` and `error`.
- First load renders the default slot as it is: every SDK component inside draws its own skeleton in its own box,
  and `SkeletonStateSlot` values paint. Render the real layout over `useSkeletonItems` stand-ins.
- First load sets `aria-busy`, renders one screen-reader-only `role="status"` announcement and no visible loading
  copy, and makes the content `inert`: no pointer, keyboard or accessibility-tree access until it loads.
- A background refresh keeps the content with no skeleton and sets `data-refreshing`; a refresh the user asked for
  belongs to `SkeletonStateGroup` + `useRefresh` inside the region.
- A failed refresh keeps the last good content (`hasData`) and sets `data-stale`; it renders no failure card.
- A failed first load settles into neutral plain centred copy; the failure text belongs to the toast host, so the
  region renders neither the message nor an alert.
- Retry is opt-in: the button renders only on a failed first load, and only when `@retry` is bound or the `retry`
  slot is filled. An ordinary collection keeps refresh in its toolbar and binds neither.
- `isEmpty` replaces the content with plain centred `EmptyState` copy naming the absent collection; `emptyActions`
  is opt-in, as page actions belong in the toolbar.
- Precedence: first load, then a failed first load, then empty, then the content.
- A region inside a region on its first load draws its skeleton too, whatever its own flags say.
- The content wrapper is `display: contents`, so the region's own grid or flex lays out the content.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough
  attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isFirstLoad` | `boolean` | no | `false` | The first load: the content renders as component skeletons. |
| `isRefreshing` | `boolean` | no | `false` | A fetch while data shows; the content stays. |
| `error` | `DataRegionError \| null` | no | `null` | The failure the last fetch settled on — a message, or anything carrying `message`. |
| `hasData` | `boolean` | no | `false` | The last good content is on screen, so a failure keeps it. |
| `isEmpty` | `boolean` | no | `false` | The region loaded and holds nothing. |
| `emptyTitle` | `string` | no | `Nothing here yet` | The empty copy, naming the absent collection. |
| `emptyDescription` | `string` | no | — | The empty copy's second line. |
| `unavailableTitle` | `string` | no | `Not available right now` | The neutral copy a failed first load settles into. |
| `loadingLabel` | `string` | no | `Loading…` | The one screen-reader announcement during the first load. |
| `retryLabel` | `string` | no | `Retry` | The opt-in retry button's label. |
| `animation` | `SkeletonStateAnimation` | no | `pulse` | How every skeleton inside moves. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `retry` | `retry: [];` | Fires when the reader asks a failed first load to run again; binding it opts into the button. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The real layout — rendered as component skeletons on the first load. |
| `skeleton` | `skeleton?(): unknown;` | Replaces the content on the first load, for a layout that cannot render without data. |
| `unavailable` | `unavailable?(props: { message: string; retry: () => void }): unknown;` | Opts a failed first load into its own copy. |
| `retry` | `retry?(props: { retry: () => void }): unknown;` | Opts a failed first load into its own retry control. |
| `emptyActions` | `emptyActions?(): unknown;` | Opts the empty copy into actions. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount.

## Verification

- Focused test references: [DataRegion.dom.test.ts](../../../../tests/unit/presentation/feedback/DataRegion.dom.test.ts),
  [SkeletonShape.browser.test.ts](../../../../tests/unit/presentation/feedback/SkeletonShape.browser.test.ts).
- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts).
