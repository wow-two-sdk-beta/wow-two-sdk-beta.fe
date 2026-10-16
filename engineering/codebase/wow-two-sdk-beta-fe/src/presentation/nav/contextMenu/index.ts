export { default as ContextMenu, type ContextMenuProps } from './ContextMenu.vue';
/* An SFC's generated default export cannot carry statics cleanly, so these ship as siblings
   rather than `ContextMenu.Trigger` / `.Content`; the menu parts (`.Item` / `.Group` /
   `.LabelText` / `.SeparatorLayout`) are imported from `nav/menu` directly. */
export { default as ContextMenuTrigger, type ContextMenuTriggerProps } from './ContextMenuTrigger.vue';
export { default as ContextMenuContent, type ContextMenuContentProps } from './ContextMenuContent.vue';
export { contextMenuContextKey, useContextMenuContext, type ContextMenuContextValue } from './ContextMenuContext';
