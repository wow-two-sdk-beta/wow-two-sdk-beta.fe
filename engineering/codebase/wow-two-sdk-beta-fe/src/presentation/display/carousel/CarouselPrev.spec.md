# CarouselPrev

Renders the step-back nav button.

Source: [CarouselPrev.vue](CarouselPrev.vue).

Public import: `import { CarouselPrev } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Mount within the owner supplying `useCarouselContext`; a compound part is not an independent root.
- Disabled on the first slide unless the carousel loops, and always with one slide or none: dimmed to 40%, it lets pointer
  input through. With one slide it is also `inert`, so a click lands on whatever lies beneath — a card's link.
- Shows per the root's `controls`: with `hover`, hidden until the carousel is hovered or holds focus within, always under
  `(hover: none)`; a disabled arrow reveals at 40%.
- `aria-label` and `type` stay fallthrough attributes over the localized defaults.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `variant` | `CarouselNavVariant` | no | `CarouselNavVariant.Surface` | The arrow's surface: `surface` (page chip with a hairline ring) or `glass` (a frosted dark chip with light text that reads over any photo; solid under reduced transparency). |

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
