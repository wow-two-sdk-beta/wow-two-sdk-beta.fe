export { default as NavigationMenu, type NavigationMenuProps } from './NavigationMenu.vue';
/* React attached these as `NavigationMenu.List` / `.Item` / `.Trigger` /
   `.Content` / `.Link` via `Object.assign`. An SFC's generated default export
   cannot carry statics cleanly, so they ship as siblings. */
export { default as NavigationMenuList, type NavigationMenuListProps } from './NavigationMenuList.vue';
export { default as NavigationMenuItem, type NavigationMenuItemProps } from './NavigationMenuItem.vue';
export { default as NavigationMenuTrigger, type NavigationMenuTriggerProps } from './NavigationMenuTrigger.vue';
export { default as NavigationMenuContent, type NavigationMenuContentProps } from './NavigationMenuContent.vue';
export { default as NavigationMenuLink, type NavigationMenuLinkProps } from './NavigationMenuLink.vue';
export {
  navigationMenuContextKey,
  navigationMenuItemContextKey,
  useNavigationMenuContext,
  useNavigationMenuItemContext,
  type NavigationMenuContextValue,
  type NavigationMenuItemContextValue,
} from './NavigationMenuContext';
