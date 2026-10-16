export { default as Drawer, type DrawerProps } from './Drawer.vue';
export { default as DrawerTrigger, type DrawerTriggerProps } from './DrawerTrigger.vue';
export { default as DrawerContent, DrawerSize, type DrawerContentProps } from './DrawerContent.vue';

/*
 * Shared chrome re-exported under the Drawer namespace. React attached these as
 * `Drawer.Header` / `Drawer.Title` / … via `Object.assign`; Vue has no component
 * statics, so the flat names are the whole API.
 */
export { default as DrawerHeader } from '../OverlayHeader.vue';
export { default as DrawerTitle } from '../OverlayTitle.vue';
export { default as DrawerDescription } from '../OverlayDescription.vue';
export { default as DrawerBody } from '../OverlayBody.vue';
export { default as DrawerFooter } from '../OverlayFooter.vue';
export { default as DrawerClose } from '../OverlayCloseButton.vue';
