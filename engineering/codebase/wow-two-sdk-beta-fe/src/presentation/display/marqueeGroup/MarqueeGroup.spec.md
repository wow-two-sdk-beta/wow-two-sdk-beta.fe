# MarqueeGroup

Renders children scrolling continuously, duplicated once for a seamless loop.

Source: [MarqueeGroup.vue](MarqueeGroup.vue).

Public import: `import { MarqueeGroup } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- The built-in button pauses animation persistently until resumed; leaving hover does not clear the user choice.
- The second rendered copy is aria-hidden and inert; it cannot duplicate keyboard targets.
- Reduced motion removes scrolling and hides the pause action.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `direction` | `MarqueeGroupDirection` | no | `'left'` | The scroll direction. Default `left`. |
| `speed` | `number` | no | `30` | The seconds for one full traversal of the inner content. |
| `canPauseOnHover` | `boolean` | no | `true` | The pause-while-hovered behaviour. Default `true`. |
| `pauseLabel` | `string` | no | `'Pause animation'` | The localized pause action label. |
| `resumeLabel` | `string` | no | `'Resume animation'` | The localized resume action label. |
| `gap` | `number` | no | `48` | The px gap between repeated items. Default `48`. |

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
- Focused test references: [MotionControls.dom.test.ts](../../../../tests/unit/presentation/display/MotionControls.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
