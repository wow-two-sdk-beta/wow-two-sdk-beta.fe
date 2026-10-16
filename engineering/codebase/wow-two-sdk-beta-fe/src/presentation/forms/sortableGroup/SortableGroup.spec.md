# SortableGroup

Renders a drag-to-reorder list, headless — consumers render their own rows.

Source: [SortableGroup.vue](SortableGroup.vue).

Public import: `import { SortableGroup } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The caller owns the ordered array and applies reorder(from,to).
- Handles support dragging and arrow-key movement; SortableGroupMoveButton provides a pointer alternative. Requests outside the mounted item bounds are suppressed.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

No declared props.

## Emits

| Event     | Signature                              | Meaning                                                                           |
| --------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| `reorder` | `reorder: [from: number, to: number];` | Fires when a drag or a keyboard move completes, with the `from` and `to` indices. |

## Slots

| Slot      | Signature            | Meaning                     |
| --------- | -------------------- | --------------------------- |
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [EditingBehavior.dom.test.ts](../../../../tests/unit/presentation/forms/EditingBehavior.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Only a drop inside the active group commits an order. Drag cancellation or an outside drop restores the original order without emitting a change. Invalid move indices are ignored; nested draggable ownership does not start the ancestor row.
