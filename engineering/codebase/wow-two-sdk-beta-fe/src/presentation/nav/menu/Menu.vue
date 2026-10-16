<script lang="ts">
import type { Placement } from '@floating-ui/vue';
import type {
  SurfaceElevation,
  SurfacePadding,
  SurfaceRadius,
  SurfaceTone,
  SurfaceVariant,
} from '../../../foundation/styles';

/**
 * Represents the prop surface of `Menu`.
 *
 * React declared the surface axes by `extends SurfaceLayoutVariants`; they are
 * spelled out here because the SFC compiler's type resolver cannot follow a
 * `VariantProps<typeof …>` base and fails the build on it. The aliases below
 * are the canonical ones from `foundation/styles`, already locked against the
 * `surfaceVariants` config there, so the two cannot drift. `placement` is
 * `Placement` for the same reason — React read it back off `AnchoredPositioner`
 * with an indexed access, which the resolver cannot follow either.
 *
 * The accessible label is *not* a prop: a declared `'aria-label'` arrives as
 * `props.ariaLabel` and never renders. It stays a fallthrough attr and lands on
 * the menu surface through `v-bind="rest"` below.
 */
export interface MenuProps {
  /** Controlled axes use their canonical Vue model names; each update event requests caller state. */
  readonly open?: boolean;

  /** The element the surface anchors to. */
  readonly anchor: HTMLElement | null;

  /** The Floating UI placement. Default `bottom-start`. */
  readonly placement?: Placement;

  /** The distance between anchor and surface in px. Default 6. */
  readonly offset?: number;

  /** The visual recipe. Default `raised`. */
  readonly variant?: SurfaceVariant;

  /** The color tone the recipe is tinted with. */
  readonly tone?: SurfaceTone;

  /** The corner rounding. Default `md`. */
  readonly radius?: SurfaceRadius;

  /** The inner spacing step. Default `xs`. */
  readonly padding?: SurfacePadding;

  /** The shadow depth. */
  readonly elevation?: SurfaceElevation;

  /** Optional pre-gesture focus target, restored only while this menu owns focus. */
  readonly returnFocus?: () => HTMLElement | null;
}

/** @internal How long a hovered sibling row waits before closing an open submenu, in ms. */
const SubmenuCloseDelayMs = 250;
</script>

<script setup lang="ts">
import { computed, inject, onScopeDispose, provide, useAttrs, useTemplateRef } from 'vue';
import { cn, surfaceVariants } from '../../../foundation/styles';
import { AnchoredPositioner, DismissableLayer, FocusScope, Portal, Presence } from '../../../foundation/primitives';
import { DomOrderExtensions } from '../../../foundation/dom';
import { useTypeahead } from '../../../foundation/selection';
import {
  MenuKey,
  MenuSubKey,
  MenuSubOpenReason,
  MenuTreeKey,
  type MenuFocusTarget,
  type MenuItemEntry,
  type MenuSubmenuEntry,
  type MenuTreeContextValue,
} from './MenuContext';
import { MenuExtensions } from './MenuExtensions';
import { menuVariants } from './Menu.variants';

/** Renders the anchored, focus-trapped menu surface the arrow keys walk. */
defineOptions({ name: 'Menu', inheritAttrs: false });

/** The menu contents — `MenuItem` / `MenuGroup` / `MenuLabel` / `MenuSeparator`. React's `children`. */
defineSlots<{ default(): unknown }>();

/** `open` default to `undefined` so an absent prop cannot read as an explicit `false`. */
const props = withDefaults(defineProps<MenuProps>(), {
  open: undefined,
  placement: 'bottom-start',
  offset: 6,
  variant: undefined,
  tone: undefined,
  radius: undefined,
  padding: undefined,
  elevation: undefined,
});

const emit = defineEmits<{
  /** Fires when the menu should update:open — Escape, an outside pointerdown, Tab, or a selection. */
  'update:open': [open: boolean];

  /**
   * Fires when a key goes down on the menu container, ahead of the menu's own Tab
   * handling, so a wrapper (Menubar) can add navigation and opt out with `preventDefault()`.
   */
  keydown: [event: KeyboardEvent];
}>();

const attrs = useAttrs();
const layer = useTemplateRef<{ readonly el: HTMLElement | null }>('layer');

/* A menu rendered by `MenuSubContent` is a submenu of the tree its parent owns; any other menu roots
   a tree of its own. `MenuSubKey` is reset to `null` below, so only `MenuSub` can mark a submenu. */
const parentTree = inject(MenuTreeKey, null);
const sub = inject(MenuSubKey, null);
const isSubmenu = parentTree !== null && sub !== null;

const isMenuOpen = computed(() => props.open ?? false);

/** The live item registry — a plain array, not reactive: the ordering is read imperatively. */
const items: Array<MenuItemEntry> = [];

/** The surfaces a root tree has registered — its own and every mounted submenu's. */
const surfaces = new Set<() => HTMLElement | null>();

/** The submenu opened from one of this menu's rows, if any. */
let openSubmenu: MenuSubmenuEntry | null = null;

let submenuCloseTimer: ReturnType<typeof setTimeout> | null = null;

/** The tree this surface belongs to — its own when it is a root. */
const tree: MenuTreeContextValue =
  isSubmenu && parentTree
    ? parentTree
    : {
        closeTree: () => emit('update:open', false),
        contains: (node) =>
          node !== null &&
          (props.anchor?.contains(node) === true || [...surfaces].some((resolve) => resolve()?.contains(node))),
        registerSurface: (resolve) => {
          surfaces.add(resolve);
          return () => surfaces.delete(resolve);
        },
      };

if (!isSubmenu) provide(MenuTreeKey, tree);
provide(MenuSubKey, null);

const unregisterSurface = tree.registerSurface(surface);

/** Registers an item, replacing the entry when its id is already known. */
function registerItem(entry: MenuItemEntry): void {
  const index = items.findIndex((i) => i.id === entry.id);
  if (index >= 0) items[index] = entry;
  else items.push(entry);
}

/** Removes an item's registration. */
function unregisterItem(id: string): void {
  const index = items.findIndex((i) => i.id === id);
  if (index >= 0) items.splice(index, 1);
}

/** Resolves the rendered menu surface. */
function surface(): HTMLElement | null {
  return layer.value?.el ?? null;
}

/** Closes the open submenu unless `focused` is the row that opened it. */
function closeSubmenuUnlessOwner(focused: HTMLElement | null): void {
  if (openSubmenu && openSubmenu.trigger() !== focused) openSubmenu.close();
}

/** Focuses an item's row and closes any submenu another row opened. */
function focusItem(item: MenuItemEntry | undefined): void {
  if (!item?.el) return;
  item.el.focus();
  closeSubmenuUnlessOwner(item.el);
}

/** Moves focus across the enabled items in document order, wrapping at the edges. */
function moveFocus(fromId: string, target: MenuFocusTarget): void {
  const list = DomOrderExtensions.inDocumentOrder(
    items.filter((i) => !i.disabled),
    (item) => item.el,
  );
  if (list.length === 0) return;
  if (target === 'first' || target === 'last') {
    focusItem(list[target === 'first' ? 0 : list.length - 1]);
    return;
  }
  const index = list.findIndex((i) => i.id === fromId);
  let nextIndex = index + target;
  if (index === -1) nextIndex = target === 1 ? 0 : list.length - 1;
  if (nextIndex < 0) nextIndex = list.length - 1;
  if (nextIndex >= list.length) nextIndex = 0;
  focusItem(list[nextIndex]);
}

/** Applies the Arrow/Home/End walk; returns whether the key was consumed. */
function navigate(fromId: string, event: KeyboardEvent): boolean {
  switch (event.key) {
    case 'ArrowDown':
      moveFocus(fromId, 1);
      break;
    case 'ArrowUp':
      moveFocus(fromId, -1);
      break;
    case 'Home':
      moveFocus(fromId, 'first');
      break;
    case 'End':
      moveFocus(fromId, 'last');
      break;
    default:
      return false;
  }
  event.preventDefault();
  return true;
}

/** Moves focus from a row back to the surface, so no row stays highlighted. */
function focusSurface(): void {
  const node = surface();
  const active = node?.ownerDocument.activeElement ?? null;
  if (node && active && active !== node && node.contains(active)) node.focus({ preventScroll: true });
}

/** Cancels a pending hover close of the open submenu. */
function clearSubmenuTimer(): void {
  if (submenuCloseTimer === null) return;
  clearTimeout(submenuCloseTimer);
  submenuCloseTimer = null;
}

/** Schedules the open submenu to close when the pointer rests on a row that does not own it. */
function hoverItem(ownerSubmenuId: string | null): void {
  if (!openSubmenu) return;
  if (openSubmenu.id === ownerSubmenuId) {
    clearSubmenuTimer();
    return;
  }
  if (submenuCloseTimer !== null) return;
  const pending = openSubmenu;
  submenuCloseTimer = setTimeout(() => {
    submenuCloseTimer = null;
    if (openSubmenu === pending) pending.close();
  }, SubmenuCloseDelayMs);
}

/** Tracks a newly opened submenu and closes the sibling that was open before it. */
function trackSubmenu(entry: MenuSubmenuEntry): void {
  clearSubmenuTimer();
  const previous = openSubmenu;
  openSubmenu = entry;
  if (previous && previous.id !== entry.id) previous.close();
}

/** Stops tracking a submenu that closed. */
function untrackSubmenu(id: string): void {
  if (openSubmenu?.id !== id) return;
  clearSubmenuTimer();
  openSubmenu = null;
}

provide(MenuKey, {
  registerItem,
  unregisterItem,
  items,
  close: () => tree.closeTree(),
  moveFocus,
  navigate,
  focusSurface,
  hoverItem,
  trackSubmenu,
  untrackSubmenu,
  holdSubmenu: clearSubmenuTimer,
});

onScopeDispose(() => {
  clearSubmenuTimer();
  unregisterSurface();
});

const classes = computed(() =>
  cn(
    surfaceVariants({
      variant: props.variant ?? 'raised',
      tone: props.tone,
      radius: props.radius ?? 'md',
      padding: props.padding ?? 'xs',
      elevation: props.elevation,
    }),
    menuVariants(),
    'motion-safe:data-[state=open]:animate-(--animate-pop-in)',
    'motion-safe:data-[state=closed]:animate-(--animate-pop-out)',
    'motion-reduce:animate-none',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. Carries `aria-label` onto the surface. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

function handleEscape(): void {
  emit('update:open', false);
}

function handleOutsidePointerDown(event: PointerEvent): void {
  const target = event.target as Node | null;
  if (props.anchor?.contains(target)) return;
  // A submenu keeps its tree open for a press on a sibling surface, and closes it for one on the page.
  if (isSubmenu && !tree.contains(target)) {
    tree.closeTree();
    return;
  }
  emit('update:open', false);
}

/** Keeps focus on the trigger row when a submenu opened from the pointer. */
function handleMountAutoFocus(event: CustomEvent): void {
  if (isSubmenu && sub?.openReason.current === MenuSubOpenReason.Pointer) event.preventDefault();
}

const orderedItems = () => DomOrderExtensions.inDocumentOrder(items, (item) => item.el);
const typeahead = useTypeahead({
  items: orderedItems,
  enabled: isMenuOpen,
  getLabel: (item) => item.el?.textContent?.trim() ?? '',
  isDisabled: (item) => item.disabled || !item.el?.isConnected,
  getActiveIndex: () => orderedItems().findIndex((item) => item.el === item.el?.ownerDocument.activeElement),
  onMatch: (item) => focusItem(item),
});

function handleKeydown(event: KeyboardEvent): void {
  emit('keydown', event);
  if (event.defaultPrevented || event.isComposing) return;
  const target = event.target as HTMLElement;
  if (!target.closest('input,textarea,[contenteditable="true"]') && typeahead.onKeyDown(event)) {
    event.preventDefault();
    return;
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    tree.closeTree();
    return;
  }
  if (isSubmenu && event.key === (MenuExtensions.isRightToLeft(surface()) ? 'ArrowRight' : 'ArrowLeft')) {
    event.preventDefault();
    emit('update:open', false);
  }
}
</script>

<template>
  <!-- No hard `v-if="isMenuOpen"` — Presence keeps the surface mounted through its
       pop-out exit, flipping data-state to "closed" and deferring unmount until the
       animation ends. `FocusScope as-child` relays Presence's cloned `ref` +
       `data-state` down onto the DismissableLayer's div, which *is* the surface.
       A submenu does not trap focus: its root menu's scope already owns the tree. -->
  <Portal>
    <AnchoredPositioner :anchor="props.anchor" :placement="props.placement" :offset="props.offset" class="z-dropdown">
      <Presence :is-present="isMenuOpen">
        <FocusScope
          as-child
          :is-trapped="!isSubmenu"
          can-loop
          :return-focus="props.returnFocus"
          :on-mount-auto-focus="handleMountAutoFocus"
        >
          <DismissableLayer
            ref="layer"
            role="menu"
            :on-escape="handleEscape"
            :on-outside-pointer-down="handleOutsidePointerDown"
            v-bind="rest"
            :class="classes"
            @keydown="handleKeydown"
          >
            <slot />
          </DismissableLayer>
        </FocusScope>
      </Presence>
    </AnchoredPositioner>
  </Portal>
</template>
