# DataGridEditor

Renders an editable data grid with keyboard navigation between cells and per-cell edit.

Source: [DataGridEditor.vue](DataGridEditor.vue).

Public import: `import { DataGridEditor } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop      | Type                                     | Required | Default                         | Meaning                                                                                                                                               |
| --------- | ---------------------------------------- | -------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `columns` | `ReadonlyArray<DataGridEditorColumn<T>>` | yes      | `() => []`                      | Declared by the source contract.                                                                                                                      |
| `rows`    | `ReadonlyArray<T>`                       | yes      | `() => []`                      | Declared by the source contract.                                                                                                                      |
| `rowKey`  | `(row: T) => string`                     | yes      | `(row: unknown) => String(row)` | Returns the stable key of a row. Kept a prop rather than an emit: it is called as a plain function on every render, which is not what an emit models. |
| `isDense` | `boolean`                                | no       | `undefined`                     | The dense row height. Default `false`.                                                                                                                |

## Emits

| Event        | Signature                                                 | Meaning                                                                           |
| ------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `row-change` | `'row-change': [row: T, colKey: string, value: unknown];` | Fires when a cell edit commits, with the row, the column key, and the cast value. |

## Slots

| Slot     | Signature                                                                                                | Meaning                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `header` | `header(props: { column: DataGridEditorColumn<T> }): unknown;`                                           | Overrides a column header. Falls back to the column's own `header`.                                     |
| `cell`   | `cell(props: { row: T; column: DataGridEditorColumn<T>; rowIndex: number; colIndex: number }): unknown;` | Overrides a body cell in read mode. Falls back to the column's `cell` renderer, then to its `accessor`. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DisplayRequiredProps.dom.test.ts](../../../../tests/unit/presentation/display/DisplayRequiredProps.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Editing belongs to the logical row key and column key across reorder. Removing the cell, changing its external value or making it read-only cancels its draft. Commit emits once; blur does not steal focus back from another control. Empty numeric drafts remain empty rather than becoming zero. Empty-grid navigation exposes no nonexistent active descendant. `isDisabled` and `isReadOnly` inherit Field state; the grid uses one tab stop. Header and cell slots are optional.
