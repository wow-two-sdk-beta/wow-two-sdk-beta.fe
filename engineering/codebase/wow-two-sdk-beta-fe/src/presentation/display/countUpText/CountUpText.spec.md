# CountUpText

Renders a number that counts up to `to` on mount, or when it first enters the viewport.

Source: [CountUpText.vue](CountUpText.vue).

Public import: `import { CountUpText } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Viewport entry triggers once; later target changes animate without waiting for another entry.

- Non-positive or non-finite durations settle at the target without starting animation frames.
- Enabling reduced motion cancels the active tween and displays the target.

- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop               | Type                        | Required | Default         | Meaning                                                                    |
| ------------------ | --------------------------- | -------- | --------------- | -------------------------------------------------------------------------- |
| `to`               | `number`                    | yes      | —               | The target value.                                                          |
| `from`             | `number`                    | no       | `0`             | The starting value. Default `0`.                                           |
| `duration`         | `number`                    | no       | `1500`          | The tween length in ms. Default `1500`.                                    |
| `easing`           | `(t: number) => number`     | no       | `easeOutCubic`  | The easing applied to the tween's normalized time. Default `easeOutCubic`. |
| `format`           | `(value: number) => string` | no       | `defaultFormat` | The value formatter. Rich content → the `value` slot.                      |
| `canTriggerOnView` | `boolean`                   | no       | `false`         | The start-when-scrolled-into-view mode. Default `false` (starts on mount). |
| `as`               | `ElementTag`                | no       | `'span'`        | The rendered tag. Default `span`.                                          |

## Emits

None declared.

## Slots

| Slot    | Signature                                                     | Meaning                                                                     |
| ------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `value` | `value?(props: { value: number; display: string }): unknown;` | The rich override for the formatted number — receives the live tween value. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
