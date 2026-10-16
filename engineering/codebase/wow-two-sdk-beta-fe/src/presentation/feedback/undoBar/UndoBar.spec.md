# UndoBar

Renders a snackbar carrying one message and a single "Undo" action.

Source: [UndoBar.vue](UndoBar.vue).

Public import: `import { UndoBar } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Hover and descendant keyboard focus independently pause expiration; moving the pointer away cannot resume a focused Undo action.
- Changing `duration` while open starts a fresh duration budget; `Infinity` keeps the bar sticky.

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop              | Type              | Required | Default                             | Meaning                                                                        |
| ----------------- | ----------------- | -------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| `open`            | `boolean`         | yes      | —                                   | Declared by the source contract.                                               |
| `message`         | `string`          | no       | —                                   | The snackbar copy. Rich content → the `message` slot. Supply this or the slot. |
| `undoLabel`       | `string`          | no       | `'Undo'`                            | Declared by the source contract.                                               |
| `duration`        | `number`          | no       | `5000`                              | The auto-dismiss delay in ms; `Infinity` = sticky. Default 5000.               |
| `canPauseOnHover` | `boolean`         | no       | `true`                              | Declared by the source contract.                                               |
| `position`        | `OverlayPosition` | no       | `OverlayPositionToken.BottomCenter` | Declared by the source contract.                                               |
| `hasCountdown`    | `boolean`         | no       | `false`                             | Declared by the source contract.                                               |

## Emits

| Event         | Signature                         | Meaning                                                                              |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| `update:open` | `'update:open': [open: boolean];` | Fires when the bar opens or closes — it closes on auto-dismiss and right after Undo. |
| `undo`        | `undo: [];`                       | Fires when the reader presses Undo; omitting `@undo` omits the button.               |

## Slots

| Slot      | Signature              | Meaning                                                 |
| --------- | ---------------------- | ------------------------------------------------------- |
| `message` | `message?(): unknown;` | The snackbar message. Falls back to the `message` prop. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
