import { inject, type InjectionKey, type Ref, type ShallowRef } from 'vue';

/** One registered `MenuItem` — the unit the arrow-key walk moves across. */
export interface MenuItemEntry {
  id: string;
  el: HTMLButtonElement | null;
  disabled: boolean;
}

/** Defines the focus targets the arrow-key walk accepts: a relative step or an edge. */
export type MenuFocusTarget = 1 | -1 | 'first' | 'last';

/** One open submenu, as its parent menu tracks it so only one sibling submenu stays open. */
export interface MenuSubmenuEntry {
  readonly id: string;

  /** The submenu's trigger row, which keeps the submenu open while it holds focus or the pointer. */
  readonly trigger: () => HTMLElement | null;

  /** Closes the submenu without moving focus. */
  readonly close: () => void;
}

/**
 * The seam between `Menu` and its `MenuItem` / `MenuGroup` / `MenuLabel` /
 * `MenuSeparator` children.
 *
 * React attached these as `Menu.Item` / `.Group` / … over a `createContext`. An
 * SFC's generated default export cannot carry statics cleanly, so they ship as
 * sibling components and share state through provide/inject instead.
 */
export interface MenuContextValue {
  registerItem: (entry: MenuItemEntry) => void;
  unregisterItem: (id: string) => void;

  /** The live registry — a plain array, read imperatively, exactly as React's `useRef` list was. */
  items: Array<MenuItemEntry>;

  /** Closes the menu after a selection. A submenu closes its whole menu tree. */
  close: () => void;

  /** Moves focus from the item `fromId` across the enabled items in document order, wrapping at the edges. */
  moveFocus: (fromId: string, target: MenuFocusTarget) => void;

  /** Applies the shared Arrow/Home/End walk for one item's keydown; returns whether the key was consumed. */
  navigate: (fromId: string, event: KeyboardEvent) => boolean;

  /** Returns focus to the menu surface, so no row stays highlighted after the pointer leaves it. */
  focusSurface: () => void;

  /** Records the pointer entering a row; `ownerSubmenuId` names the submenu that row opens, if any. */
  hoverItem: (ownerSubmenuId: string | null) => void;

  /** Tracks a submenu that just opened, closing any other open sibling submenu. */
  trackSubmenu: (entry: MenuSubmenuEntry) => void;

  /** Stops tracking a submenu that closed. */
  untrackSubmenu: (id: string) => void;

  /** Cancels a pending hover close — the pointer reached the open submenu. */
  holdSubmenu: () => void;
}

export const MenuKey: InjectionKey<MenuContextValue> = Symbol('wow-two.menu');

export function useMenuContext(): MenuContextValue {
  const context = inject(MenuKey, null);
  if (!context) {
    throw new Error('Menu rows, groups, labels and separators must be used inside <Menu>');
  }
  return context;
}

/**
 * The seam every `Menu` in one nested tree shares — the root menu and each submenu surface below it.
 *
 * The root `Menu` provides it; a submenu's `Menu` reads it, so a selection or a Tab anywhere closes the
 * whole tree and an outside pointerdown can tell a sibling surface from the page.
 */
export interface MenuTreeContextValue {
  /** Closes the root menu, which unmounts every submenu below it. */
  closeTree: () => void;

  /** Whether a node sits inside the root anchor or any mounted surface of the tree. */
  contains: (node: Node | null) => boolean;

  /** Registers one surface of the tree; returns the unregister. */
  registerSurface: (surface: () => HTMLElement | null) => () => void;
}

export const MenuTreeKey: InjectionKey<MenuTreeContextValue> = Symbol('wow-two.menuTree');

/** Defines how a submenu was opened — a keyboard open moves focus into it, a pointer open does not. */
export const MenuSubOpenReason = {
  /** Refers to an open from Enter, Space or the inline-end arrow key. */
  Keyboard: 'keyboard',
  /** Refers to an open from hover or a click. */
  Pointer: 'pointer',
} as const;

export type MenuSubOpenReason = (typeof MenuSubOpenReason)[keyof typeof MenuSubOpenReason];

/** The value `MenuSub` shares with its `MenuSubTrigger` and `MenuSubContent`. */
export interface MenuSubContextValue {
  readonly id: string;

  /** The resolved open state. */
  readonly open: Ref<boolean>;

  /** Requests the next open state; `reason` records how an open started. */
  readonly setOpen: (open: boolean, reason?: MenuSubOpenReason) => void;

  /** How the current open started. A plain box — a one-shot signal between two handlers, never rendered. */
  readonly openReason: { current: MenuSubOpenReason };

  /** The trigger row — the positioning anchor and the focus-return target. */
  readonly triggerEl: ShallowRef<HTMLElement | null>;

  /** The trigger row's id, which names the submenu surface. */
  readonly triggerId: string;

  /** The submenu surface's id, which the trigger's `aria-controls` points at. */
  readonly contentId: string;
}

/** `null` is provided below every `Menu`, so a menu nested without `MenuSub` stays a root menu. */
export const MenuSubKey: InjectionKey<MenuSubContextValue | null> = Symbol('wow-two.menuSub');

export function useMenuSubContext(): MenuSubContextValue {
  const context = inject(MenuSubKey, null);
  if (!context) throw new Error('MenuSubTrigger / MenuSubContent must be used inside <MenuSub>');
  return context;
}

/** The value `MenuRadioGroup` shares with its `MenuRadioItem` rows. */
export interface MenuRadioGroupContextValue {
  /** The selected value, or `null` when none is selected. */
  readonly value: Ref<string | null>;

  /** Requests a selection. */
  readonly select: (value: string) => void;

  /** Whether the whole group is disabled. */
  readonly isDisabled: Readonly<Ref<boolean>>;
}

export const MenuRadioGroupKey: InjectionKey<MenuRadioGroupContextValue> = Symbol('wow-two.menuRadioGroup');

export function useMenuRadioGroupContext(): MenuRadioGroupContextValue {
  const context = inject(MenuRadioGroupKey, null);
  if (!context) throw new Error('MenuRadioItem must be used inside <MenuRadioGroup>');
  return context;
}
