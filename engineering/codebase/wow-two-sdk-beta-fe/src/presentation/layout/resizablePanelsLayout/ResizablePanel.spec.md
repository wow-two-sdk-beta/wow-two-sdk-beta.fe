# ResizablePanel

Renders one pane of a `<ResizablePanelsLayout>` group.

Source: [ResizablePanel.vue](ResizablePanel.vue).

Public import: `import { ResizablePanel } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Mount within the owner supplying `useResizableContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `defaultSize` | `number` | no | `100` | Declared by the source contract. |
| `minSize` | `number` | no | `0` | Declared by the source contract. |
| `maxSize` | `number` | no | `100` | Declared by the source contract. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The pane content. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
