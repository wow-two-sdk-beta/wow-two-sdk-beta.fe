# LightboxModal

Renders uncropped photos on a black viewport-sized stage. A thumbnail strip below the photo selects any image in the set.

Source: [LightboxModal.vue](LightboxModal.vue) · built on [Modal](../modal/Modal.spec.md).

Public import: `import { LightboxModal, type LightboxImage } from '@wow-two-beta/fe/presentation/overlays';`.

## Contract

- The default slot holds the triggers and receives `openAt(index)`, which opens the viewer on that image. `open` / `update:open` and `index` / `update:index` (with `defaultOpen` / `defaultIndex`) follow the shared controlled-state helper; out-of-range positions clamp.
- The viewer is a modal dialog with a focus trap and scroll lock, named by `label` (localized `LightboxModal.label`, `'Image viewer'`). The close button and Escape dismiss it and return focus to the trigger.
- Stepping: the previous / next buttons, ArrowLeft / ArrowRight (mirrored in right-to-left layouts), Home / End, and a horizontal touch or pen swipe of 48px or more. Mouse drags never step. With `isLooping` (default) the ends wrap; without it they hold and the matching button disables.
- Each change is announced politely as `2 of 12: <alt>`. The visible counter is decorative. One image uses the stage without a counter, navigation or thumbnails.
- The preview strip scrolls horizontally when needed. The current preview has a visible selected border and `aria-current`. Arrow keys move focus with the selection when the strip has focus.
- The neighbouring images are fetched ahead while open. Captions render under the image in a `figure`.
- Attributes and `class` reach the dialog panel.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `images` | `ReadonlyArray<LightboxImage>` | yes | — | The images, in viewing order. Each has `src`, `alt` and optional `caption`, `srcset` and `thumbnailSrc`. The preview uses `src` when `thumbnailSrc` is absent. |
| `open` | `boolean` | no | `undefined` | The open state, controlled — the `v-model:open` target. |
| `defaultOpen` | `boolean` | no | `false` | The initial open state when uncontrolled. |
| `index` | `number` | no | `undefined` | The shown position, controlled — the `v-model:index` target. |
| `defaultIndex` | `number` | no | `0` | The initial position when uncontrolled. |
| `isLooping` | `boolean` | no | `true` | Wraps past either end. |
| `label` | `string` | no | `'Image viewer'` | The dialog's name. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the viewer opens or closes. |
| `update:index` | `'update:index': [index: number];` | Fires when the reader steps to another image. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(props: { openAt: (index: number) => void }): unknown` | The triggers, typically thumbnails. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts).
- Focused tests: [LightboxModal.dom.test.ts](../../../../tests/unit/presentation/overlays/LightboxModal.dom.test.ts) — opening from a trigger, naming, announcements, stepping, looping, swipes and Escape; [LightboxModal.browser.test.ts](../../../../tests/unit/presentation/overlays/LightboxModal.browser.test.ts) — stage size and colour, keyboard stepping and focus return in real browsers.
