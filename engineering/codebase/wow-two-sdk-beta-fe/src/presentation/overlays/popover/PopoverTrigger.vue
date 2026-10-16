<script lang="ts">
/**
 * The prop surface of `PopoverTrigger`.
 *
 * React declared `extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>`;
 * attributes reach the root through `useAttrs` here, so only `asChild` remains.
 */
export interface PopoverTriggerProps {
  /** Merge onto the single slot child instead of rendering a `<button>`. */
  readonly asChild?: boolean;
}
</script>

<script setup lang="ts">
import { resolveElement } from '../../../foundation/dom';
import { computed, useAttrs, useTemplateRef, watch, type ComponentPublicInstance } from 'vue';
import { OverlayExtensions } from '../OverlayExtensions';
import { Primitive } from '../../../foundation/primitives';
import { usePopoverContext } from './Popover.vue';

/** Renders the control that toggles the enclosing `Popover` and anchors its panel. */
defineOptions({ name: 'PopoverTrigger', inheritAttrs: false });

/** The trigger content — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<PopoverTriggerProps>(), { asChild: false });

const attrs = useAttrs();
const context = usePopoverContext();
const inner = useTemplateRef<ComponentPublicInstance>('inner');

/* Lifted to a setup const so the template auto-unwraps it (a plain injected object does not). */
const isOpen = context.open;

watch(
  inner,
  (instance) => {
    context.triggerEl.value = OverlayExtensions.toHtmlElement(instance?.$el);
  },
  { immediate: true, flush: 'post' },
);

/**
 * `@click` is declared after `v-bind="attrs"`, so Vue chains the caller's own
 * handler first and this one second — React's `onClick?.(e)` order, which is
 * what makes the `defaultPrevented` opt-out work.
 */
function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  context.setOpen(!context.open.value);
}

/** `Primitive` renders the real element, so its `$el` is this component's root. */
const el = computed(() => resolveElement(inner.value));

defineExpose({ el });
</script>

<template>
  <Primitive
    ref="inner"
    as="button"
    :as-child="props.asChild"
    type="button"
    aria-haspopup="dialog"
    :aria-expanded="isOpen"
    :data-state="isOpen ? 'open' : 'closed'"
    v-bind="attrs"
    @click="handleClick"
  >
    <slot />
  </Primitive>
</template>
