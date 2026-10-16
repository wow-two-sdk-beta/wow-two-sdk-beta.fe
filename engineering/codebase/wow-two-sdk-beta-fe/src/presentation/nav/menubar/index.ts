export { default as Menubar, type MenubarProps } from './Menubar.vue';
/* An SFC's generated default export cannot carry statics cleanly, so these ship as siblings
   rather than `Menubar.Menu` / `.Trigger` / `.Content`; the menu parts (`.Item` / `.Group` /
   `.LabelText` / `.SeparatorLayout`) are imported from `nav/menu` directly. */
export { default as MenubarMenu, type MenubarMenuProps } from './MenubarMenu.vue';
export { default as MenubarTrigger, type MenubarTriggerProps } from './MenubarTrigger.vue';
export { default as MenubarContent, type MenubarContentProps } from './MenubarContent.vue';
export {
  menubarContextKey,
  menubarMenuContextKey,
  useMenubarContext,
  useMenubarMenuContext,
  type MenubarContextValue,
  type MenubarMenuContextValue,
  type MenubarTriggerEntry,
} from './MenubarContext';
