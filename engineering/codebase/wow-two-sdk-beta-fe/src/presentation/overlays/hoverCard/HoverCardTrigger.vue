<script lang="ts">
/** The prop surface of `HoverCardTrigger`. */
export interface HoverCardTriggerProps {
  /**
   * Merge onto the single slot child instead of rendering a `<span>`. Default `true`.
   *
   * React declared this prop but always cloned the child regardless; honouring it
   * gives the same default with an escape hatch when the slot is not a single element.
   */
  readonly asChild?: boolean;
}
</script>

<script setup lang="ts">
import { resolveElement } from '../../../foundation/dom';
import { computed, useAttrs, useTemplateRef, watch, type ComponentPublicInstance } from 'vue';
import { OverlayExtensions } from '../OverlayExtensions';
import { Primitive } from '../../../foundation/primitives';
import { useHoverCardContext } from './HoverCard.vue';

/** Renders the element that opens the enclosing `HoverCard` on hover or focus, and anchors it. */
defineOptions({ name: 'HoverCardTrigger', inheritAttrs: false });

/** The trigger element — React's `children`, typed there as a single `ReactElement`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<HoverCardTriggerProps>(), { asChild: true });

const attrs = useAttrs();
const context = useHoverCardContext();
const inner = useTemplateRef<ComponentPublicInstance>('inner');

/* React composed a ref onto the cloned child to seed `ctx.triggerRef`; a post-flush watch is the equivalent. */
watch(
  inner,
  (instance) => {
    context.triggerEl.value = OverlayExtensions.toHtmlElement(instance?.$el);
  },
  { immediate: true, flush: 'post' },
);

/* A touch has no hover: a tap would open the card late and leave it hanging over the page, so touch pointers
   neither open nor close it — the trigger's own tap action (a link, a button) runs as usual. */
function onPointerEnter(event: PointerEvent): void {
  if (event.pointerType !== 'touch') context.show();
}

function onPointerLeave(event: PointerEvent): void {
  if (event.pointerType !== 'touch') context.hide();
}

/** `Primitive` renders the real element, so its `$el` is this component's root. */
const el = computed(() => resolveElement(inner.value));

defineExpose({ el });
</script>

<template>
  <!--
    Handlers come after `v-bind="attrs"`, so Vue chains the caller's own first —
    React called `trigger.props.onPointerEnter?.(e)` before its own in each clone.
  -->
  <Primitive
    ref="inner"
    as="span"
    :as-child="props.asChild"
    v-bind="attrs"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @focus="context.show()"
    @blur="context.hide()"
  >
    <slot />
  </Primitive>
</template>
