# DataRegion

Renders one data region through its first load, refresh, failure and empty states.

Source: [DataRegion.vue](DataRegion.vue).

Public import: `import { DataRegion } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Wrap each region that loads as one in a single `DataRegion`; drive it with `useAppQuery`'s `isFirstLoad`,
  `isRefreshing` and `error`.
- First load renders the default slot as it is: every SDK component inside draws its own skeleton in its own box,
  and `SkeletonStateSlot` values paint. Render the real layout over `useSkeletonItems` stand-ins.
- First load sets `aria-busy`, renders one `role="status"` announcement, and makes the content `inert`: no pointer,
  keyboard or accessibility-tree access until it loads.
- A refresh keeps the content with no skeleton and sets `data-refreshing`; `SkeletonStateGroup` + `useRefresh`
  owns a refresh the user asked for.
- A failure with `hasData` renders a `role="alert"` `Alert` above the content; without it the error state replaces
  the content. The retry button renders only when `@retry` is bound or the `retry` slot is filled.
- `isEmpty` replaces the content with the plain `EmptyState`.
- Precedence: first load, then a failure without data, then empty, then the content.
- A region inside a region on its first load draws its skeleton too, whatever its own flags say.
- The content wrapper is `display: contents`, so the region's own grid or flex lays out the content in every state.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough
  attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isFirstLoad` | `boolean` | no | `false` | The first load: the content renders as component skeletons. |
| `isRefreshing` | `boolean` | no | `false` | A fetch while data shows; the content stays. |
| `error` | `DataRegionError \| null` | no | `null` | The failure — a message, or anything carrying `message`. |
| `hasData` | `boolean` | no | `false` | Loaded data is still on screen, so a failure shows inline. |
| `isEmpty` | `boolean` | no | `false` | The region loaded and holds nothing. |
| `emptyTitle` | `string` | no | `Nothing here yet` | The empty state's title. |
| `emptyDescription` | `string` | no | — | The empty state's description. |
| `errorTitle` | `string` | no | `Couldn't load this` | The error state's title above the message. |
| `loadingLabel` | `string` | no | `Loading…` | The one announcement during the first load. |
| `retryLabel` | `string` | no | `Retry` | The retry button's label. |
| `animation` | `SkeletonStateAnimation` | no | `pulse` | How every skeleton inside moves. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `retry` | `retry: [];` | Fires when the reader asks to load again; binding it shows the retry button. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The real layout — rendered as component skeletons on the first load. |
| `skeleton` | `skeleton?(): unknown;` | Replaces the content on the first load, for a layout that cannot render without data. |
| `error` | `error?(props: { message: string; retry: () => void }): unknown;` | Replaces the error state. |
| `retry` | `retry?(props: { retry: () => void }): unknown;` | Replaces the retry button in both error forms. |
| `emptyIcon` | `emptyIcon?(): unknown;` | The empty state's icon. |
| `emptyActions` | `emptyActions?(): unknown;` | The empty state's actions. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount.

## Verification

- Focused test references: [DataRegion.dom.test.ts](../../../../tests/unit/presentation/feedback/DataRegion.dom.test.ts),
  [SkeletonShape.browser.test.ts](../../../../tests/unit/presentation/feedback/SkeletonShape.browser.test.ts).
- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts).
