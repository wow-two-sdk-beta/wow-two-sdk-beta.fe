# CarouselDot

Renders one pagination dot that jumps to its slide.

Source: [CarouselDot.vue](CarouselDot.vue).

Public import: `import { CarouselDot } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Mount within the owner supplying `useCarouselContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `slideIndex` | `number` | yes | — | The slide this dot jumps to. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
