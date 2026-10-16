export { default as DropdownMenu, type DropdownMenuProps } from './DropdownMenu.vue';
/* An SFC's generated default export cannot carry statics cleanly, so these ship as siblings
   rather than `DropdownMenu.Trigger` / `.Content`; the menu parts (`.Item` / `.Group` /
   `.LabelText` / `.SeparatorLayout`) are imported from `nav/menu` directly. */
export { default as DropdownMenuTrigger, type DropdownMenuTriggerProps } from './DropdownMenuTrigger.vue';
export { default as DropdownMenuContent, type DropdownMenuContentProps } from './DropdownMenuContent.vue';
export { dropdownMenuContextKey, useDropdownMenuContext, type DropdownMenuContextValue } from './DropdownMenuContext';
