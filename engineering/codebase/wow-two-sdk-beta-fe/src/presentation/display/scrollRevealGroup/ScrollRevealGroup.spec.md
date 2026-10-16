# ScrollRevealGroup

Renders children hidden until they enter the viewport, then fades and slides them in.

Source: [ScrollRevealGroup.vue](ScrollRevealGroup.vue).

Public import: `import { ScrollRevealGroup } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `effect` | `ScrollRevealGroupEffect` | no | `'fade'` | The enter animation. Default `fade`. |
| `duration` | `number` | no | `600` | The transition length in ms. Default `600`. |
| `delay` | `number` | no | `0` | The transition delay in ms. Default `0`. |
| `threshold` | `number` | no | `0.1` | The IntersectionObserver visibility ratio that counts as revealed. Default `0.1`. |
| `isOnce` | `boolean` | no | `true` | The reveal-once flag — `false` re-hides when scrolled back out. Default `true`. |
| `as` | `ElementTag` | no | `'div'` | The rendered tag. Default `div`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
