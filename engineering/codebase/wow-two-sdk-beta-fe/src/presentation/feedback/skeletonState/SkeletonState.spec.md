# SkeletonState

Renders a shimmering placeholder block standing in for content that is still loading.

Source: [SkeletonState.vue](SkeletonState.vue).

Public import: `import { SkeletonState } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- A placeholder whose layout is known stays a sized block; a value inside a layout that stays belongs in `SkeletonStateSlot`, and a region that loads as one belongs in `DataRegion`, where SDK components draw their own skeletons.
- Every placeholder animates under `motion-safe` only, and in forced colours draws a `GrayText` outline on `Canvas`.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `shape` | `SkeletonStateShape` | no | — | The placeholder shape. |
| `animation` | `SkeletonStateAnimation` | no | — | How the placeholder moves; defaults to the nearest `SkeletonStateGroup`'s, else `pulse`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The content shaping the placeholder. Sizing classes alone when omitted. |

## Component skeletons

- `useSkeletonState(override?)` resolves a component's skeleton mode: the `override` getter wins when it returns a
  boolean, else the nearest `DataRegion` first load decides. It returns `isSkeleton`, `animation` and the
  `paintClass` / `boxClass` / `lineClass` that draw placeholders; each class is empty outside skeleton mode.
- `provideSkeletonState(mode)` hands a container's resolved mode to its children, so one `isSkeleton` on a
  container switches everything inside.
- `skeletonPaintClass` paints a surface; `skeletonBoxClass` turns a component's own box into its placeholder and
  masks its text, border and children; `skeletonLineClass` draws one inline bar per line box.
- `useSkeletonItems(source, count = 3)` returns the loaded items, or `count` `undefined` stand-ins while `source`
  is nullish, so a first load renders the real layout; a loaded empty list stays empty.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
