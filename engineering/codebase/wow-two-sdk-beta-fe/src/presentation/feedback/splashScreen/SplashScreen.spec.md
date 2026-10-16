# SplashScreen

Renders an app's first-load screen: the product logo centred above a slim progress bar.

Source: [SplashScreen.vue](SplashScreen.vue).

Public import: `import { SplashScreen } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- The root is a `role="status"` region on the `background` token; a caller-supplied `role` or `class` wins.
- The page form fills its parent at least one dynamic viewport high; the overlay form is fixed over the viewport at the `modal` layer.
- The overlay traps keyboard focus while open and restores it when it closes; the page form leaves focus alone.
- It appears at once, with no enter fade, so it can take over from a static twin in the app's mount node.
- Closing plays a fade-out before the screen unmounts; reduced motion skips the fade.
- The progress bar is `sm`, `12rem` wide and carries `label` as its accessible name; omitting `value` makes it indeterminate.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isOpen` | `boolean` | no | `true` | The mount state. Default `true`; closing fades the screen out before it unmounts. |
| `isOverlay` | `boolean` | no | `false` | The overlay toggle — the screen covers the viewport above the app instead of filling its parent as a page. |
| `value` | `number` | no | — | The load progress, 0–`max`. Omit for indeterminate. |
| `max` | `number` | no | `100` | The value that completes the progress. Default `100`. |
| `tone` | `ProgressTone` | no | `ProgressToneToken.Brand` | The progress fill tone. Default `brand`. |
| `label` | `string` | no | `'Loading…'` | The accessible name of the progress. Default `"Loading…"`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `logo` | `logo?(): unknown;` | The product logo, centred above the progress bar. |
| `default` | `default?(): unknown;` | Extra content below the progress bar. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Behavior: [SplashScreen.dom.test.ts](../../../../tests/unit/presentation/feedback/SplashScreen.dom.test.ts) covers the page and overlay forms, progress, focus hand-back and the deferred unmount.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
