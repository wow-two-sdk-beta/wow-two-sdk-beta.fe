# GradientText

Renders text filled with a gradient through `background-clip: text`.

Source: [GradientText.vue](GradientText.vue).

Public import: `import { GradientText } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Animated gradients have a persistent pause/resume button; reduced motion disables animation and hides that button.

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `from` | `string` | no | `'var(--color-primary)'` | The first color stop. Default `var(--color-primary)`. |
| `via` | `string` | no | `undefined` | The optional middle color stop. |
| `to` | `string` | no | `'var(--color-accent, var(--color-primary))'` | The last color stop. Default `var(--color-accent, var(--color-primary))`. |
| `direction` | `GradientTextDirection` | no | `'r'` | The sweep direction. Default `r`. |
| `isAnimated` | `boolean` | no | `undefined` | The gradient-pan animation, skipped under `prefers-reduced-motion`. |
| `pauseLabel` | `string` | no | `'Pause animation'` | Localized pause label. |
| `resumeLabel` | `string` | no | `'Resume animation'` | Localized resume label. |
| `as` | `ElementTag` | no | `'span'` | The rendered tag. Default `span`. |

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
