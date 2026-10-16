# SortableGroupItem

Renders one reorderable row, `draggable` only while its `SortableGroupHandle` is pressed.

Source: [SortableGroupItem.vue](SortableGroupItem.vue).

Public import: `import { SortableGroupItem } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useSortableRoot`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `index` | `number` | yes | — | The zero-based position of this item in the list. |

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
- Focused test references: [EditingBehavior.dom.test.ts](../../../../tests/unit/presentation/forms/EditingBehavior.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
