# SkeletonStateText

Renders a paragraph placeholder — `lines` text skeletons with a shorter last line.

Source: [SkeletonStateText.vue](SkeletonStateText.vue).

Public import: `import { SkeletonStateText } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Reach for it where a paragraph has no content yet; a value inside a layout that stays belongs in `SkeletonStateSlot`.
- Decorative: the whole block is `aria-hidden`; the enclosing `SkeletonStateGroup` announces loading.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `lines` | `number` | no | `3` | The number of lines. |
| `lastLineWidth` | `string` | no | `60%` | The last line's width, so the block reads as a paragraph. |
| `animation` | `SkeletonStateAnimation` | no | — | How the lines move; defaults to the nearest `SkeletonStateGroup`'s. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount.

## Verification

- Focused test references: [SkeletonStateParts.dom.test.ts](../../../../tests/unit/presentation/feedback/SkeletonStateParts.dom.test.ts).
