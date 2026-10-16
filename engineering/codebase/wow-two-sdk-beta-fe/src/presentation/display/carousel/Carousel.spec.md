# Carousel

Renders the carousel root that owns the index, the slide count, and the auto-play pause flag.

Source: [Carousel.vue](Carousel.vue).

Public import: `import { Carousel } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Autoplay starts only after client mount; SSR never accesses window for its timer.
- User pause, pointer hover and focus within are independent reasons to suspend autoplay.
- Reduced motion suppresses autoplay.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `index` | `number` | no | `undefined` | The controlled active slide index. |
| `defaultIndex` | `number` | no | `0` | The uncontrolled initial slide index. Default `0`. |
| `canLoop` | `boolean` | no | `false` | The wrap-around state. Default `false`. |
| `autoPlay` | `number` | no | `undefined` | The auto-advance interval in ms. Omit to disable. |
| `pauseLabel` | `string` | no | `'Pause slides'` | The localized pause action label. |
| `resumeLabel` | `string` | no | `'Resume slides'` | The localized resume action label. |
| `slidesCount` | `number` | no | `undefined` | The explicit slide count — overrides the automatic count (use for virtualised slides). |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:index` | `'update:index': [index: number];` | Fires when the reader moves to a different slide, with the new index. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [CarouselAutoplay.ssr.test.ts](../../../../tests/unit/presentation/display/CarouselAutoplay.ssr.test.ts), [MotionControls.dom.test.ts](../../../../tests/unit/presentation/display/MotionControls.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
