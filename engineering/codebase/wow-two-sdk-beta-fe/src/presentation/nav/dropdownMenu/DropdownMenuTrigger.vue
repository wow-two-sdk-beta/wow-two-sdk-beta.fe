<script lang="ts">
/**
 * The prop surface of `DropdownMenuTrigger`.
 *
 * React declared `extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>`;
 * attributes reach the root through `useAttrs` here, so only `asChild` remains.
 */
export interface DropdownMenuTriggerProps {
  /** The as-child toggle — renders the trigger as its single slot child (e.g. `<Button>`). */
  readonly asChild?: boolean;
}
</script>

<script setup lang="ts">
import { resolveElement } from '../../../foundation/dom';
import { computed, useAttrs, useTemplateRef, watch, type ComponentPublicInstance } from 'vue';
import { Primitive } from '../../../foundation/primitives';
import { NavExtensions } from '../NavExtensions';
import { useDropdownMenuContext } from './DropdownMenuContext';

/** Renders the button that toggles the enclosing `DropdownMenu` and anchors its panel. */
defineOptions({ name: 'DropdownMenuTrigger', inheritAttrs: false });

/** The trigger content — React's `children`. */
defineSlots<{ default(): unknown }>();

/* Not bound to a `props` const: with every reference now in the template — where the bare
   name compiles to `$props`, which survives a setup throw — the binding would be unused. */
withDefaults(defineProps<DropdownMenuTriggerProps>(), { asChild: false });

const attrs = useAttrs();
const context = useDropdownMenuContext();
const inner = useTemplateRef<ComponentPublicInstance>('inner');

/* Lifted to a setup const so the template auto-unwraps it (a plain injected object does not). */
const isOpen = context.open;

watch(
  inner,
  (instance) => {
    context.triggerEl.value = NavExtensions.toHtmlElement(instance?.$el);
  },
  { immediate: true, flush: 'post' },
);

function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  context.openFocus.current = 'first';
  context.setOpen(!context.open.value);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    // APG menu-button pattern: ArrowUp-open focuses the last item.
    context.openFocus.current = event.key === 'ArrowUp' ? 'last' : 'first';
    context.setOpen(true);
  }
}

/** `Primitive` renders the real element, so its `$el` is this component's root. */
const el = computed(() => resolveElement(inner.value));

defineExpose({ el });
</script>

<template>
  <!-- Own attrs, then `v-bind="attrs"`, then own handlers last — Vue chains the
       caller's handler first and ours second, React's `onClick?.(e)` order, which
       is what makes the `defaultPrevented` opt-out work. -->
  <Primitive
    ref="inner"
    as="button"
    :as-child="asChild"
    type="button"
    aria-haspopup="menu"
    :aria-expanded="isOpen"
    :data-state="isOpen ? 'open' : 'closed'"
    v-bind="attrs"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <slot />
  </Primitive>
</template>
