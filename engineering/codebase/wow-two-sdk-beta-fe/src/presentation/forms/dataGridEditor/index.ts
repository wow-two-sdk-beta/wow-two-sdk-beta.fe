export { default as DataGridEditor, type DataGridEditorProps } from './DataGridEditor.vue';
/* React declared these beside the component; here they sit in a sibling module so
   the private `CellEditor.vue` can share them. The exported surface is unchanged —
   `DataGridEditorMove` stays internal, exactly as it was in `DataGridEditor.tsx`. */
export { DataGridEditorCellType, DataGridEditorColumnAlign, type DataGridEditorColumn } from './DataGridEditorTypes';
