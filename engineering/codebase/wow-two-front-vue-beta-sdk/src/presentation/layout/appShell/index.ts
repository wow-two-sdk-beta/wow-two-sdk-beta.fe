export {
  default as AppShell,
  AppShellNavigation,
  AppShellScroll,
  Breakpoint,
  useAppShell,
  type AppShellProps,
  type AppShellContextValue,
} from './AppShell.vue';

/*
 * The regions, flat. React attached them as `AppShell.Header` / `AppShell.Sidebar`
 * / … via `Object.assign`; Vue has no component statics, so the flat names are the
 * whole API — and they are the names React already exported alongside.
 */
export { default as AppShellHeader, AppShellHeaderHeight, type AppShellHeaderProps } from './AppShellHeader.vue';
export { default as AppShellSidebar, type AppShellSidebarProps } from './AppShellSidebar.vue';
export { default as AppShellMain, type AppShellMainProps } from './AppShellMain.vue';
export { default as AppShellContent, AppShellContentGutter, type AppShellContentProps } from './AppShellContent.vue';
export { default as AppShellAside, type AppShellAsideProps } from './AppShellAside.vue';
export { default as AppShellFooter, type AppShellFooterProps } from './AppShellFooter.vue';
