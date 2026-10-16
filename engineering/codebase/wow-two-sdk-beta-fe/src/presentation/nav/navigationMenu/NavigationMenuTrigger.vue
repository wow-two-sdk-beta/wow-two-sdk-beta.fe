<script lang="ts">
/**
 * The prop surface of `NavigationMenuTrigger`.
 *
 * React declared `extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>`;
 * attributes reach the root through `useAttrs` here and `children` is the default
 * slot, which leaves no declared prop.
 */
export type NavigationMenuTriggerProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, nextTick, shallowRef, useAttrs } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import { NavExtensions } from '../NavExtensions';
import { cn } from '../../../foundation/styles';
import { useRovingFocusItem } from '../../../foundation/primitives';
import { useNavigationMenuContext, useNavigationMenuItemContext } from './NavigationMenuContext';

/** Renders the button that expands an item's panel, and anchors the panel's position. */
defineOptions({ name: 'NavigationMenuTrigger', inheritAttrs: false });

/** The trigger label — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const nav = useNavigationMenuContext();
const item = useNavigationMenuItemContext();

// Reactive object: read its members, never destructure them.
const roving = useRovingFocusItem();

const el = shallowRef<HTMLButtonElement | null>(null);

/* One element, three consumers of `ref` — the roving group needs the node, the
   item context anchors the panel to it, and `defineExpose` publishes it. React
   composed them in a single callback ref; this is the same composition. */
function setRef(node: unknown): void {
  const button = (node ?? null) as HTMLButtonElement | null;
  el.value = button;
  item.triggerEl.value = button;
  roving.ref(node);
}

/* Lifted to a setup const so the template auto-unwraps it (a plain injected object does not). */
const isOpen = item.open;

/* Set when a pointer hover-swap opened this panel. With a real pointer the
   `pointerenter` swap always precedes the click, so without this guard the click
   would land on an already-open trigger and toggle it straight back closed
   (Radix guards the same way). Cleared on pointerleave: once the pointer leaves,
   the next click is a deliberate toggle again. Plain mutable box, never rendered. */
let wasOpenedByPointer = false;

function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented || NavExtensions.isDisabled(el.value)) return;
  if (wasOpenedByPointer) {
    // The hover-swap just opened this panel — keep it open.
    wasOpenedByPointer = false;
    return;
  }
  nav.setActiveId(item.open.value ? null : item.value);
}

function handlePointerEnter(): void {
  if (NavExtensions.isDisabled(el.value)) return;
  if (nav.activeId.value !== null && nav.activeId.value !== item.value) {
    nav.setActiveId(item.value);
    wasOpenedByPointer = true;
  }
}

function handlePointerLeave(): void {
  wasOpenedByPointer = false;
}

function handleFocus(): void {
  roving.onFocus();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.defaultPrevented || NavExtensions.isDisabled(el.value)) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    nav.setActiveId(item.value);
    void nextTick(() => {
      if (!item.open.value || NavExtensions.isDisabled(el.value)) return;
      const panel = el.value?.ownerDocument.getElementById(item.contentId);
      panel?.querySelector<HTMLElement>('a[href],button:not(:disabled),[tabindex="0"]')?.focus();
    });
    return;
  }
  roving.onKeydown(event);
}

const classes = computed(() =>
  cn(
    'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted',
    attrs.class as string | undefined,
  ),
);

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
    :id="item.triggerId"
    type="button"
    aria-haspopup="true"
    :aria-expanded="isOpen"
    :aria-controls="item.contentId"
    :data-state="isOpen ? 'open' : 'closed'"
    :tabindex="roving.tabindex"
    :data-roving-focus-item="true"
    v-bind="rest"
    :ref="setRef"
    :class="classes"
    @click="handleClick"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
    @focus="handleFocus"
    @keydown="handleKeydown"
  >
    <slot />
    <ChevronDown :class="cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')" />
  </button>
</template>
