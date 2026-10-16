<script lang="ts">
/**
 * The prop surface of `ModalTrigger`.
 *
 * React declared `extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>`;
 * attributes reach the root through `useAttrs` here, so only `asChild` remains.
 */
export interface ModalTriggerProps {
  /** Merge onto the single slot child instead of rendering a `<button>`. */
  readonly asChild?: boolean;
}
</script>

<script setup lang="ts">
import { resolveElement } from '../../../foundation/dom';
import { computed, useAttrs, useTemplateRef, watch, type ComponentPublicInstance } from 'vue';
import { OverlayExtensions } from '../OverlayExtensions';
import { Primitive } from '../../../foundation/primitives';
import { useModalContext } from './Modal.vue';

/** Renders the control that opens the enclosing `Modal` and takes focus back on close. */
defineOptions({ name: 'ModalTrigger', inheritAttrs: false });

/** The trigger content — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<ModalTriggerProps>(), { asChild: false });

const attrs = useAttrs();
const context = useModalContext();
const inner = useTemplateRef<ComponentPublicInstance>('inner');

/* Lifted to a setup const so the template auto-unwraps it (a plain injected object does not). */
const isOpen = context.open;

/* React composed a ref onto the trigger to seed `ctx.triggerRef`; a post-flush watch is the equivalent. */
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
  context.setOpen(true);
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
