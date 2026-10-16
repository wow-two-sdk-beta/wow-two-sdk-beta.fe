import {
  Tooltip,
  TourPopover,
  CommandPaletteModal,
  ConfirmPopover,
  LightboxModal,
  CommandPaletteModalContent,
  CommandPaletteModalInput,
  CommandPaletteModalList,
  CommandPaletteModalGroup,
  CommandPaletteModalItem,
  CommandPaletteModalEmpty,
  CommandPaletteModalSeparator,
  ActionSheet,
  ActionSheetAction,
  ActionSheetCancel,
  AlertModal,
  AlertModalAction,
  AlertModalCancel,
  AlertModalContent,
  BackdropOverlay,
  BottomSheet,
  BottomSheetDescription,
  BottomSheetTitle,
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  HoverCard,
  HoverCardArrow,
  HoverCardContent,
  HoverCardTrigger,
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from '../../../../../src/presentation/overlays';
import { h, type VNode } from 'vue';
import { smokeCase, type SmokeCase } from './Example';

const inCommandPalette = (node: VNode): VNode => h(CommandPaletteModal, { defaultOpen: true }, () => node);

const inCommandPaletteContent = (node: VNode): VNode =>
  inCommandPalette(h(CommandPaletteModalContent, null, () => node));

const inCommandPaletteList = (node: VNode): VNode =>
  inCommandPaletteContent(h(CommandPaletteModalList, null, () => node));

/*
 * Wrappers for the compound parts. Each root is opened via its UNCONTROLLED path (`defaultOpen`),
 * never by passing `open` — which is also the regression guard for the port's `boolean` cast
 * bug: Vue coerces an absent `boolean` prop to `false` unless the declaration owns an explicit
 * `undefined` default, and a root that got that wrong reads as controlled-and-closed, so every
 * part below would render nothing and these cases would fail.
 */
const inOpenModal = (node: VNode): VNode => h(Modal, { defaultOpen: true }, () => h(ModalContent, null, () => node));

const inOpenDrawer = (node: VNode): VNode => h(Drawer, { defaultOpen: true }, () => h(DrawerContent, null, () => node));

const inOpenBottomSheet = (node: VNode): VNode => h(BottomSheet, { defaultOpen: true }, () => node);

const inOpenAlertModal = (node: VNode): VNode =>
  h(AlertModal, { defaultOpen: true }, () => h(AlertModalContent, null, () => node));

const inOpenActionSheet = (node: VNode): VNode => h(ActionSheet, { defaultOpen: true }, () => node);

const inPopover = (node: VNode): VNode => h(Popover, { defaultOpen: true }, () => node);
const inHoverCard = (node: VNode): VNode => h(HoverCard, { defaultOpen: true }, () => node);

/**
 * Every component `@wow-two-beta/ui-vue/presentation/overlays` exports, as smoke cases.
 *
 * The deprecated `Dialog*` aliases are deliberately absent: they re-export the very same SFCs
 * as `Modal*`, so mounting them again asserts nothing the `Modal*` rows do not. That the
 * aliases still resolve is pinned once, by identity, in `Overlays.aliases.dom.test.ts`.
 */
export const overlaysExamples: readonly SmokeCase[] = [
  smokeCase('BackdropOverlay', BackdropOverlay, {}, { slot: true }),

  smokeCase('Modal', Modal, {}, { slot: true }),

  smokeCase(
    'ModalTrigger',
    ModalTrigger,
    {},
    {
      slot: true,
      wrap: (node) => h(Modal, null, () => node),
    },
  ),

  smokeCase(
    'ModalContent',
    ModalContent,
    {},
    {
      slot: true,
      wrap: (node) => h(Modal, { defaultOpen: true }, () => node),
    },
  ),

  smokeCase('ModalHeader', ModalHeader, {}, { slot: true, wrap: inOpenModal }),

  smokeCase('ModalTitle', ModalTitle, {}, { slot: true, wrap: inOpenModal }),

  smokeCase('ModalDescription', ModalDescription, {}, { slot: true, wrap: inOpenModal }),

  smokeCase('ModalBody', ModalBody, {}, { slot: true, wrap: inOpenModal }),

  smokeCase('ModalFooter', ModalFooter, {}, { slot: true, wrap: inOpenModal }),

  smokeCase('ModalClose', ModalClose, {}, { slot: true, wrap: inOpenModal }),

  smokeCase('AlertModal', AlertModal, {}, { slot: true }),

  smokeCase(
    'AlertModalContent',
    AlertModalContent,
    {},
    {
      slot: true,
      wrap: (node) => h(AlertModal, { defaultOpen: true }, () => node),
    },
  ),

  smokeCase('AlertModalAction', AlertModalAction, {}, { slot: true, wrap: inOpenAlertModal }),

  smokeCase('AlertModalCancel', AlertModalCancel, {}, { slot: true, wrap: inOpenAlertModal }),

  smokeCase('Drawer', Drawer, {}, { slot: true }),

  smokeCase(
    'DrawerTrigger',
    DrawerTrigger,
    {},
    {
      slot: true,
      wrap: (node) => h(Drawer, null, () => node),
    },
  ),

  smokeCase(
    'DrawerContent',
    DrawerContent,
    {},
    {
      slot: true,
      wrap: (node) => h(Drawer, { defaultOpen: true }, () => node),
    },
  ),

  smokeCase('DrawerHeader', DrawerHeader, {}, { slot: true, wrap: inOpenDrawer }),

  smokeCase('DrawerTitle', DrawerTitle, {}, { slot: true, wrap: inOpenDrawer }),

  smokeCase('DrawerDescription', DrawerDescription, {}, { slot: true, wrap: inOpenDrawer }),

  smokeCase('DrawerBody', DrawerBody, {}, { slot: true, wrap: inOpenDrawer }),

  smokeCase('DrawerFooter', DrawerFooter, {}, { slot: true, wrap: inOpenDrawer }),

  smokeCase('DrawerClose', DrawerClose, {}, { slot: true, wrap: inOpenDrawer }),

  smokeCase('Popover', Popover, {}, { slot: true }),

  smokeCase('PopoverTrigger', PopoverTrigger, {}, { slot: true, wrap: inPopover }),

  smokeCase('PopoverContent', PopoverContent, {}, { slot: true, wrap: inPopover }),

  smokeCase(
    'PopoverArrow',
    PopoverArrow,
    {},
    {
      wrap: (node) => inPopover(h(PopoverContent, null, () => node)),
    },
  ),

  smokeCase('ConfirmPopover', ConfirmPopover, { title: 'Delete this code?', defaultOpen: true }, { slot: true }),

  smokeCase(
    'LightboxModal',
    LightboxModal,
    { images: [{ src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', alt: 'Pixel' }] },
    { slot: true },
  ),

  smokeCase('HoverCard', HoverCard, {}, { slot: true }),

  smokeCase('HoverCardTrigger', HoverCardTrigger, {}, { slot: true, wrap: inHoverCard }),

  smokeCase('HoverCardContent', HoverCardContent, {}, { slot: true, wrap: inHoverCard }),

  smokeCase(
    'HoverCardArrow',
    HoverCardArrow,
    {},
    {
      wrap: (node) => inHoverCard(h(HoverCardContent, null, () => node)),
    },
  ),

  // Opened via the uncontrolled path so the slot is actually rendered — these two roots host
  // their content directly rather than through a `*Content` part.
  smokeCase('ActionSheet', ActionSheet, { defaultOpen: true }, { slot: true }),

  smokeCase('ActionSheetAction', ActionSheetAction, {}, { slot: true, wrap: inOpenActionSheet }),

  smokeCase('ActionSheetCancel', ActionSheetCancel, {}, { slot: true, wrap: inOpenActionSheet }),

  smokeCase('BottomSheet', BottomSheet, { defaultOpen: true }, { slot: true }),

  smokeCase('BottomSheetTitle', BottomSheetTitle, {}, { slot: true, wrap: inOpenBottomSheet }),

  smokeCase(
    'BottomSheetDescription',
    BottomSheetDescription,
    {},
    {
      slot: true,
      wrap: inOpenBottomSheet,
    },
  ),

  smokeCase('Tooltip', Tooltip, {}, { slot: true }),

  smokeCase('TourPopover', TourPopover, { steps: [{ target: '#tour-anchor', title: 'Step one' }] }),

  smokeCase('CommandPaletteModal', CommandPaletteModal, {}, { slot: true }),

  smokeCase('CommandPaletteModalContent', CommandPaletteModalContent, {}, { slot: true, wrap: inCommandPalette }),

  smokeCase('CommandPaletteModalInput', CommandPaletteModalInput, {}, { wrap: inCommandPaletteContent }),

  smokeCase('CommandPaletteModalList', CommandPaletteModalList, {}, { slot: true, wrap: inCommandPaletteContent }),

  smokeCase('CommandPaletteModalGroup', CommandPaletteModalGroup, {}, { slot: true, wrap: inCommandPaletteList }),

  smokeCase(
    'CommandPaletteModalItem',
    CommandPaletteModalItem,
    { value: 'open-settings' },
    { slot: true, wrap: inCommandPaletteList },
  ),

  smokeCase('CommandPaletteModalEmpty', CommandPaletteModalEmpty, {}, { slot: true, wrap: inCommandPaletteList }),

  smokeCase('CommandPaletteModalSeparator', CommandPaletteModalSeparator, {}, { wrap: inCommandPaletteList }),
];
