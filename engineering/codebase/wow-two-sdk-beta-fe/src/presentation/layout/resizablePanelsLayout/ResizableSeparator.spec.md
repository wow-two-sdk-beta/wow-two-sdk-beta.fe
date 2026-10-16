# ResizableSeparator

Renders the draggable rule between two `<ResizablePanel>`s — arrow keys nudge, double-click resets.

Source: [ResizableSeparator.vue](ResizableSeparator.vue).

Public import: `import { ResizableSeparator } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Mount within the owner supplying `useResizableContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isDisabled` | `boolean` | no | `false` | Declared by the source contract. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
