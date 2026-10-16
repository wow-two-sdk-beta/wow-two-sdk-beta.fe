# SkeletonStateGroup

Renders a loading region that switches every `SkeletonStateSlot` inside at the same moment.

Source: [SkeletonStateGroup.vue](SkeletonStateGroup.vue).

Public import: `import { SkeletonStateGroup } from '@wow-two-beta/fe/presentation/feedback';`.

## Contract

- The region's labels, headings and actions render as they are; only values inside `SkeletonStateSlot` turn into placeholders.
- Sets `aria-busy` and renders one `role="status"` announcement while loading; the placeholders stay decorative.
- Shares its `animation` with every `SkeletonState`, `SkeletonStateSlot` and `SkeletonStateText` inside that sets none.
- Drive it with `useRefresh` for a refresh the user asked for; a region's first load belongs in `DataRegion`.
- Inside a loading region it keeps loading until the outer region settles: its slots keep painting and its
  components keep their skeletons, whatever its own `isLoading` says.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isLoading` | `boolean` | yes | — | Whether the region is loading; every `SkeletonStateSlot` inside follows it. |
| `label` | `string` | no | `Loading…` | The one announcement for the region while it loads. |
| `animation` | `SkeletonStateAnimation` | no | — | How every skeleton inside moves. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The region: its labels, headings and actions render as they are; its values sit in slots. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount.

## Verification

- Focused test references: [SkeletonStateParts.dom.test.ts](../../../../tests/unit/presentation/feedback/SkeletonStateParts.dom.test.ts).
- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
