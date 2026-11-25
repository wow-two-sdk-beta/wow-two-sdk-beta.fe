# PhotoPreviewGrid

Renders up to five photos of a post as a collage of buttons and reports which one the reader opens. It shows the
previews and nothing else: the viewer that opens at the reported index belongs to the caller.

Source: [PhotoPreviewGrid.vue](PhotoPreviewGrid.vue).

Public import: `import { PhotoPreviewGrid, PhotoPreviewLimit } from '@wow-two-beta/fe/presentation/display';`.

## Anatomy

```
<div @container>                     ← the root; nothing at all when `images` is empty
  └── <div mosaic>                   ← strip below 36rem, grid from 36rem; carries the sizing variables
        └── <div column>*            ← 1 to 3; `display: contents` in the strip, a flex column in the grid
              └── <button photo>+
                    ├── <img>        ← a resolved `src`
                    ├── <span>       ← "Photo unavailable", with no `src` and `unavailable`
                    └── <span +N>    ← the last photo only, while photos are left out (aria-hidden)
```

## Contract

- At most `PhotoPreviewLimit` (5) photos of `images` render; later entries are ignored. An empty `images` renders
  nothing, whatever `total` says.
- The lead photo stands alone in the first column and the others stack in reading order within the columns that
  follow: 1 photo is `[1]`, 2 are `[1] [1]`, 3 are `[1] [2]`, 4 are `[1] [1] [2]`, 5 are `[1] [2] [2]`. The tab and
  reading order is the order of `images`.
- Below `36rem` of container width the collage is a horizontal strip, `14rem` tall, every photo as wide as its aspect
  allows (at most `80cqw`), snapping to the photo start. From `36rem` it is a grid of the same columns without
  scrolling, centred in the container: its height is the lesser of `30rem` (`24rem` with `isHeightFixed`) and the height
  at which the columns fill the container width, and its width follows from that height and the columns' combined
  aspect. The switch is a container query, so it follows the box the grid sits in, not the viewport.
- Each photo starts at a `4 / 5` aspect and takes its natural `width / height` when its image loads, clamped to
  `0.45` to `2.5`. A load that reports no size changes nothing. The aspect is kept per `key`, so it follows a photo
  through a reorder and through a new `src`. A column's weight is the aspect of its photos stacked at one width; the
  stacked photos share the column's height in proportion to their height per width.
- Photos are drawn whole (`object-contain`) on a muted tile; nothing is cropped. The image is decorative (`alt=""`),
  loads `eager` for the lead and `lazy` for the rest, decodes `async`, and sends no referrer. Hover dims it.
- A photo with a `src` shows its image, whatever `unavailable` says. Without a `src`, `unavailable` shows the
  "Photo unavailable" text; with neither the tile stays empty, so a caller can resolve each `src` later under the same
  `key` and keep the layout.
- `total` is the number of photos the post has when the caller resolves only the visible ones. The count of photos left
  out is the larger of `total` and `images.length`, less the previews shown. While it is above zero the last preview
  carries `+N` over a dark wash and is named "View all N photos". It opens like the others, with the index of the last
  preview; opening the whole set from there is the caller's.
- `isMuted` draws the images in grayscale. It leaves the "unavailable" text and the `+N` count alone.
- The caller's attributes, `class` and `style` fall through to the root element and are appended to its classes, not
  merged with them. With no photos the root is an empty comment and they have nothing to land on.
- The server renders the same markup. The layout is CSS alone; only the aspect reading waits for the client, on the
  image's `load` event.

## Props

| Prop            | Type                          | Required | Default | Meaning                                                                             |
| --------------- | ----------------------------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `images`        | `readonly PhotoPreviewItem[]` | yes      | —       | The photos to preview, in reading order. Only the first `PhotoPreviewLimit` render. |
| `total`         | `number`                      | no       | —       | The post's photo count when `images` holds only the visible previews.               |
| `isHeightFixed` | `boolean`                     | no       | `false` | Caps the collage at `24rem` instead of `30rem` from `36rem` of container width.     |
| `isMuted`       | `boolean`                     | no       | `false` | Draws the photos in grayscale: a subject that is gone or inactive.                  |

`PhotoPreviewItem`:

| Field         | Type      | Required | Meaning                                                                                  |
| ------------- | --------- | -------- | ---------------------------------------------------------------------------------------- |
| `key`         | `string`  | yes      | The photo's stable identity, kept when a protected preview URL arrives after the render. |
| `src`         | `string`  | no       | The preview image address. Absent while it resolves.                                     |
| `unavailable` | `boolean` | no       | The preview could not be resolved: shows "Photo unavailable" while `src` is absent.      |

`PhotoPreviewLimit` is `5`, the most previews that render.

## Emits

| Event  | Payload         | Meaning                                                                                    |
| ------ | --------------- | ------------------------------------------------------------------------------------------ |
| `open` | `index: number` | A photo was activated: its position in `images`, from `0`. Unavailable photos emit it too. |

## Slots

None declared.

## Localization

Labels come from the locale provider with an English fallback; `{index}` counts from 1.

| Key                            | Default                   |
| ------------------------------ | ------------------------- |
| `PhotoPreviewGrid.open`        | `Open photo {index}`      |
| `PhotoPreviewGrid.viewAll`     | `View all {count} photos` |
| `PhotoPreviewGrid.unavailable` | `Photo unavailable`       |

## Accessibility

- Every photo is a native `<button type="button">`: Tab reaches it, and Enter and Space activate it.
- A photo's name is its `aria-label` ("Open photo 3"; "View all 12 photos" on the last preview while photos are left
  out), never its image, which is decorative. The `+N` wash is `aria-hidden` and ignores the pointer.
- The focus ring is a `2px` white outline inside the photo's edge, raised above its neighbours.

## Exposed handle

None declared.

## Verification

- Focused tests: [PhotoPreviewGrid.dom.test.ts](../../../../tests/unit/presentation/display/PhotoPreviewGrid.dom.test.ts)
  covers the empty list, the column arrangement of one to five photos and the limit, the sizing variables with and
  without `isHeightFixed`, attribute fall-through, the image attributes, `isMuted`, the unavailable and pending states,
  the count and label on the last photo for `total` above, equal to and below the previews, the `open` index (the
  last photo, an unavailable one, a listener prop), the native button semantics and focus, the aspect read on load (the
  clamps, a zero size, a reorder, a new `src`) and provider messages;
  [PhotoPreviewGrid.ssr.test.ts](../../../../tests/unit/presentation/display/PhotoPreviewGrid.ssr.test.ts) renders
  it with no DOM globals.
- Not covered: the geometry in a real browser — the switch at `36rem`, the strip's snapping and the fitted height. The
  DOM tests check the values the component sets, not the layout the browser makes of them.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
