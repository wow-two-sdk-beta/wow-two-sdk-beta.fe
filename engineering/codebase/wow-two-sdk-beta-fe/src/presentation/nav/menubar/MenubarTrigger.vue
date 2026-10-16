<script lang="ts">
/**
 * The prop surface of `MenubarTrigger`.
 *
 * React declared `extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>`;
 * attributes reach the root through `useAttrs` here and `children` is the default
 * slot, which leaves no declared prop.
 */
export type MenubarTriggerProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs, watch } from 'vue';
import { NavExtensions } from '../NavExtensions';
import { cn } from '../../../foundation/styles';
import { useRovingFocusItem } from '../../../foundation/primitives';
import { useMenubarContext, useMenubarMenuContext } from './MenubarContext';
import { menubarTriggerVariants } from './Menubar.variants';

/** Renders one `role="menuitem"` button in the bar, and anchors its menu. */
defineOptions({ name: 'MenubarTrigger', inheritAttrs: false });

/** The trigger label — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const bar = useMenubarContext();
const menu = useMenubarMenuContext();

// Roving tab stop — one trigger is tabbable; the stop follows focus.
// Reactive object: read its members, never destructure them.
const item = useRovingFocusItem();

const el = shallowRef<HTMLButtonElement | null>(null);

/* One element, three consumers of `ref` — the roving group needs the node, the
   menu context anchors to it, and `defineExpose` publishes it. React composed
   them with `composeRefs`; this is the same composition. */
function setRef(node: unknown): void {
  const button = (node ?? null) as HTMLButtonElement | null;
  el.value = button;
  menu.triggerEl.value = button;
  item.ref(node);
}

watch(
  [() => menu.id, el],
  ([id, node], _, onCleanup) => {
    bar.registerTrigger(id, node);
    onCleanup(() => bar.unregisterTrigger(id));
  },
  { immediate: true, flush: 'post' },
);

/* Lifted to a setup const so the template auto-unwraps it (a plain injected object does not). */
const isOpen = menu.open;

function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented || NavExtensions.isDisabled(el.value)) return;
  menu.setOpen(!menu.open.value);
}

function handlePointerEnter(): void {
  if (NavExtensions.isDisabled(el.value)) return;
  // If any menu is open, moving the pointer onto a trigger switches the active menu.
  if (bar.activeId.value !== null && bar.activeId.value !== menu.id) {
    bar.setActiveId(menu.id);
  }
}

function handleFocus(): void {
  // The roving stop follows focus — however it arrived (arrows, moveAcross from
  // an open popup, focus return on close).
  item.onFocus();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.defaultPrevented || NavExtensions.isDisabled(el.value)) return;
  switch (event.key) {
    case 'ArrowDown':
    case 'Enter':
    case ' ':
      event.preventDefault();
      menu.setOpen(true);
      return;
    case 'ArrowRight':
    case 'ArrowLeft':
      // A menu is open → switching semantics: focus AND open state move to the
      // adjacent menu together.
      if (bar.activeId.value !== null) {
        event.preventDefault();
        bar.moveAcross(menu.id, event.key === 'ArrowRight' ? 1 : -1);
        return;
      }
      break;
  }
  // Closed menubar: arrows / Home / End rove the single tab stop
  // (disabled triggers skipped, RTL-aware).
  item.onKeydown(event);
}

const classes = computed(() => cn(menubarTriggerVariants(), attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!-- Own attrs, then `v-bind="rest"`, then own handlers last — a consumer's
       handler therefore runs first, the order React got from calling
       `onClick?.(e)` ahead of its own logic. -->
  <button
    type="button"
    role="menuitem"
    aria-haspopup="menu"
    :aria-expanded="isOpen"
    :data-state="isOpen ? 'open' : 'closed'"
    :tabindex="item.tabindex"
    :data-roving-focus-item="true"
    v-bind="rest"
    :ref="setRef"
    :class="classes"
    @click="handleClick"
    @pointerenter="handlePointerEnter"
    @focus="handleFocus"
    @keydown="handleKeydown"
  >
    <slot />
  </button>
</template>
