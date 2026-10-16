export { default as JsonEditor, type JsonEditorProps } from './JsonEditor.vue';
export { JsonEditorMode } from './JsonEditorContext';
/* `JsonEditorTreeView` / `JsonEditorTreeNode` / `JsonEditorTextView` + `JsonEditorExtensions`
   stay internal — React kept the same subviews module-private inside `JsonEditor.tsx`. */
