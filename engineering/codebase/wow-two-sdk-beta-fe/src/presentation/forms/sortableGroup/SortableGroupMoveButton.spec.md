# SortableGroupMoveButton

Renders a single-pointer and keyboard alternative to dragging an item.

Source: [SortableGroupMoveButton.vue](SortableGroupMoveButton.vue).

Public import: `import { SortableGroupMoveButton } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Requires both SortableGroup and SortableGroupItem context.
- Previous/next actions use native buttons and disable at the first/last mounted item. The caller applies the root reorder event.
- Mount within the owner supplying `useSortableItem`, `useSortableRoot`; a compound part is not an independent root.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `direction` | `'previous' \| 'next'` | yes | — | The adjacent position to move this item into. |
| `label` | `string` | no | — | The localized action label; the default names the direction. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [EditingBehavior.dom.test.ts](../../../../tests/unit/presentation/forms/EditingBehavior.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
