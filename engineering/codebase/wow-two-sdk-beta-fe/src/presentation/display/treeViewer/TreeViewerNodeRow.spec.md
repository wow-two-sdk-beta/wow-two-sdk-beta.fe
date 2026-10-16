# TreeViewerNodeRow

Renders one tree row — chevron, label, and the `treeitem` ARIA state of a branch or a leaf.

Source: [TreeViewerNodeRow.vue](TreeViewerNodeRow.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Mount within the owner supplying `useRovingFocusItem`; a compound part is not an independent root.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `level` | `number` | yes | — | The 1-based nesting depth. |
| `isSelected` | `boolean` | yes | — | The selected state. |
| `isExpanded` | `boolean` | no | `undefined` | The expanded state — only meaningful when `hasChildren`. |
| `hasChildren` | `boolean` | yes | — | Whether the row owns a child group. |
| `isDisabled` | `boolean` | yes | — | The disabled state. |
| `onActivate` | `() => void` | yes | — | Toggles a branch or selects a leaf. Required, so it stays a prop rather than an emit. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
