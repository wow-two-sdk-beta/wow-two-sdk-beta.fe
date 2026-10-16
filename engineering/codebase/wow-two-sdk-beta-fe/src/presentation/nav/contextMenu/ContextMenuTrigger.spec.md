# ContextMenuTrigger

Renders the region a right-click, or a touch long-press, opens the menu over.

Source: [ContextMenuTrigger.vue](ContextMenuTrigger.vue).

Public import: `import { ContextMenuTrigger } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Mount within the owner supplying `useContextMenuContext`; a compound part is not an independent root.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop         | Type      | Required | Default     | Meaning                                                                   |
| ------------ | --------- | -------- | ----------- | ------------------------------------------------------------------------- |
| `asChild`    | `boolean` | no       | `false`     | The as-child toggle — renders the trigger as its single slot child.       |
| `isDisabled` | `boolean` | no       | `undefined` | The disabled state — blocks both the right-click and the long-press open. |

## Emits

None declared.

## Slots

| Slot      | Signature            | Meaning                     |
| --------- | -------------------- | --------------------------- |
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Interaction guarantees

The region is keyboard focusable. ContextMenu and Shift-F10 open at its lower-left edge. Touch movement beyond the gesture tolerance, pointer cancellation, teardown and disabling cancel pending long-press. Pre-pointer focus is retained for restoration.
