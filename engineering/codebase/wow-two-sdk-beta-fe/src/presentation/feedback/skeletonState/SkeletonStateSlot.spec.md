# SkeletonStateSlot

Wraps a real value and, while loading, paints a placeholder exactly its size.

Source: [SkeletonStateSlot.vue](SkeletonStateSlot.vue).

Public import: `import { SkeletonStateSlot } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- The value stays mounted while loading: its text turns transparent and its elements invisible, so the placeholder takes the value's exact size and the layout around it holds still.
- Follows the nearest `SkeletonStateGroup` unless `isLoading` is set; outside a group it shows its value.
- Marks itself `aria-hidden` and `data-loading` while loading; the group owns the one announcement.
- The placeholder classes merge last, so a caller's text colour or background cannot show through.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isLoading` | `boolean` | no | `undefined` | Overrides the nearest `SkeletonStateGroup`'s loading flag. |
| `shape` | `SkeletonStateShape` | no | `text` | The placeholder's corners; its size always comes from the content. |
| `isBlock` | `boolean` | no | `false` | Renders a block-level wrapper for block content — bars, charts, cards. |
| `animation` | `SkeletonStateAnimation` | no | — | How the placeholder moves; defaults to the nearest `SkeletonStateGroup`'s. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The value; its size shapes the placeholder while loading. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount.

## Verification

- Focused test references: [SkeletonStateParts.dom.test.ts](../../../../tests/unit/presentation/feedback/SkeletonStateParts.dom.test.ts).
- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
