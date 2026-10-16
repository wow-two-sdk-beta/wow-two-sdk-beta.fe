# JsonEditorTreeView

Renders the document as an ARIA tree of nodes, and carries the surrounding field's labelling.

Source: [JsonEditorTreeView.vue](JsonEditorTreeView.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Mount within the owner supplying `useJsonEditorContext`; a compound part is not an independent root.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `unknown` | yes | — | The document rendered as a tree. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
