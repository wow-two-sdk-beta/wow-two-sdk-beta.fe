# CarouselViewport

Renders the clipping frame and owns the arrow-key seam.

Source: [CarouselViewport.vue](CarouselViewport.vue).

Public import: `import { CarouselViewport } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Mount within the owner supplying `useCarouselContext`; a compound part is not an independent root.
- `ArrowLeft` / `ArrowRight` on the focused frame step one slide.
- A horizontal touch or pen swipe of at least 48 px, further across than down, steps exactly one slide on release —
  leftward forward, rightward back. A mouse does not swipe: it has the arrows and the keys, and its drag selects text.
- The swipe never captures the pointer, so a tap on a link or button inside a slide still clicks it. The click a pen
  release fires after a swipe is swallowed.
- Strokes that start on `input`, `textarea`, `select` or editable content stay with that control; a second finger
  drops the stroke; `pointercancel` (the browser taking a vertical scroll) drops it too.
- While a swipe can move (`canSwipe` and two slides or more) the frame sets `touch-action: pan-y pinch-zoom`, leaving
  vertical scroll and pinch zoom to the page; otherwise the page's own touch handling stays untouched.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `canSwipe` | `boolean` | no | `true` | Lets a horizontal touch or pen swipe step one slide; turn it off when a slide owns horizontal drags, such as a map. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Behavior tests: [CarouselControls.dom.test.ts](../../../../tests/unit/presentation/display/CarouselControls.dom.test.ts), [CarouselSwipe.browser.test.ts](../../../../tests/unit/presentation/display/CarouselSwipe.browser.test.ts).
- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
