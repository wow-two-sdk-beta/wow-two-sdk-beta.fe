<script lang="ts">
import type { MenuItemState } from './Menu.variants';

/** Defines props for the row that opens a submenu. */
export interface MenuSubTriggerProps {
  /** The visual state of the row. */
  readonly state?: MenuItemState;

  /** The disabled state — the submenu cannot open. */
  readonly isDisabled?: boolean;
}

/** @internal How long the mouse rests on the row before its submenu opens, in ms. */
const OpenDelayMs = 100;
</script>

<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, useAttrs, watch } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { dataAttr } from '../../../foundation/dom';
import { Icon } from '../../../foundation/icons';
import { MenuSubOpenReason, useMenuContext, useMenuSubContext } from './MenuContext';
import { MenuExtensions } from './MenuExtensions';
import { MenuItemState as MenuItemStateToken, menuItemVariants, menuSubIndicatorVariants } from './Menu.variants';

/** Renders the menu row that opens its `MenuSub`'s submenu beside it, with a trailing chevron. */
defineOptions({ name: 'MenuSubTrigger', inheritAttrs: false });

/** The row label. */
defineSlots<{ default(): unknown }>();

/** `isDisabled` defaults to `undefined`, not `false` — an absent optional boolean must stay absent. */
const props = withDefaults(defineProps<MenuSubTriggerProps>(), {
  state: undefined,
  isDisabled: undefined,
});

const attrs = useAttrs();
const menu = useMenuContext();
const sub = useMenuSubContext();
const el = shallowRef<HTMLButtonElement | null>(null);

/* Lifted to a setup const so the template auto-unwraps it (a plain injected object does not). */
const isOpen = sub.open;

let openTimer: ReturnType<typeof setTimeout> | null = null;

const itemState = computed(
  () => props.state ?? (props.isDisabled ? MenuItemStateToken.Disabled : MenuItemStateToken.Default),
);

const classes = computed(() =>
  cn(menuItemVariants({ state: itemState.value }), 'data-[state=open]:bg-muted', attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** Registers the row with the parent menu's arrow walk and publishes it as the submenu's anchor. */
watch(
  [el, () => props.isDisabled],
  ([node, isDisabled]) => {
    sub.triggerEl.value = node;
    menu.registerItem({ id: sub.triggerId, el: node, disabled: isDisabled === true });
  },
  { immediate: true, flush: 'post' },
);

/** Closes the submenu when its trigger becomes disabled. */
watch(
  () => props.isDisabled,
  (isDisabled) => {
    if (isDisabled && sub.open.value) sub.setOpen(false);
  },
);

onScopeDispose(() => {
  clearOpenTimer();
  menu.unregisterItem(sub.triggerId);
});

/** Cancels a pending hover open. */
function clearOpenTimer(): void {
  if (openTimer === null) return;
  clearTimeout(openTimer);
  openTimer = null;
}

/** Focuses the first enabled row of the open submenu. */
function focusFirstRow(): void {
  const content = el.value?.ownerDocument.getElementById(sub.contentId);
  content?.querySelector<HTMLElement>('[role^="menuitem"]:not([disabled])')?.focus();
}

/** Opens the submenu from the keyboard, or moves into it when it is already open. */
function openFromKeyboard(): void {
  clearOpenTimer();
  if (sub.open.value) focusFirstRow();
  else sub.setOpen(true, MenuSubOpenReason.Keyboard);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || props.isDisabled) return;
  if (menu.navigate(sub.triggerId, event)) return;
  const openKey = MenuExtensions.isRightToLeft(el.value) ? 'ArrowLeft' : 'ArrowRight';
  if (event.key === 'Enter' || event.key === ' ' || event.key === openKey) {
    event.preventDefault();
    openFromKeyboard();
  }
}

function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented || props.isDisabled || sub.open.value) return;
  clearOpenTimer();
  sub.setOpen(true, MenuSubOpenReason.Pointer);
}

/** Highlights the row under a mouse pointer and opens its submenu after a short rest. */
function handlePointerMove(event: PointerEvent): void {
  if (!MenuExtensions.isMousePointer(event) || props.isDisabled) return;
  menu.hoverItem(sub.id);
  MenuExtensions.focusRow(el.value);
  if (sub.open.value || openTimer !== null) return;
  openTimer = setTimeout(() => {
    openTimer = null;
    sub.setOpen(true, MenuSubOpenReason.Pointer);
  }, OpenDelayMs);
}

/** Cancels a pending open; an open submenu keeps its trigger highlighted while the pointer travels to it. */
function handlePointerLeave(event: PointerEvent): void {
  if (!MenuExtensions.isMousePointer(event)) return;
  clearOpenTimer();
  if (!sub.open.value) menu.focusSurface();
}

defineExpose({ el });
</script>

<template>
  <!-- The id is bound after the fallthrough set: the submenu surface is named by it. -->
  <button
    ref="el"
    type="button"
    role="menuitem"
    aria-haspopup="menu"
    :aria-expanded="isOpen"
    :aria-controls="isOpen ? sub.contentId : undefined"
    :disabled="isDisabled"
    :aria-disabled="isDisabled || undefined"
    :data-disabled="dataAttr(isDisabled)"
    :data-state="isOpen ? 'open' : 'closed'"
    v-bind="rest"
    :id="sub.triggerId"
    :class="classes"
    @click="handleClick"
    @keydown="handleKeydown"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <slot />
    <Icon :icon="ChevronRight" :size="14" :class="menuSubIndicatorVariants()" />
  </button>
</template>
