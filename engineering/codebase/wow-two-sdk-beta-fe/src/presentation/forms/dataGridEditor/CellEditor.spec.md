# CellEditor

Renders the editor for the active `DataGridEditor` cell, focusing itself on mount.

Source: [CellEditor.vue](CellEditor.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `type` | `DataGridEditorCellType` | no | `undefined` | The cell's editable data type — decides which editor renders. Default `text`. |
| `options` | `Array<{ value: string \| number; label: string \| number }>` | no | `undefined` | The choices for a `select` cell. |
| `modelValue` | `string` | yes | — | The draft text under edit. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the reader types or picks a value, with the editor's current text. |
| `commit` | `commit: [move?: DataGridEditorMove, rawValue?: string];` | Fires when the edit commits, with the cursor advance and the fresh raw text. |
| `cancel` | `cancel: [];` | Fires when the edit is abandoned. |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
