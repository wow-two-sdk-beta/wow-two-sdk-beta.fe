# JsonEditorTreeNode

Renders one tree row — a collapsible object/array summary or an editable primitive leaf, plus copy-path.

Source: [JsonEditorTreeNode.vue](JsonEditorTreeNode.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Mount within the owner supplying `useJsonEditorContext`; a compound part is not an independent root.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `keyName` | `string \| number \| null` | yes | — | The key this node sits under; `null` at the document root. |
| `value` | `unknown` | yes | — | The node's value. |
| `path` | `JsonPath` | yes | — | The node's address inside the document. |
| `depth` | `number` | yes | — | The nesting depth — drives indentation and the initial open state. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
