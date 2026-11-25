<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useCollapsibleContext } from './CollapsibleGroupContext';

/**
 * Renders the animating inner pane of a `CollapsibleGroupContent`, growing its height as the pane opens.
 *
 * Height animates through grid-template-rows 0fr -> 1fr gated on `data-state`, with a fade layered on the inner pane.
 * Reduced-motion users get the resolved height / opacity with no transition (motion-safe / motion-reduce).
 */
defineOptions({ name: 'CollapsibleGroupContentInner', inheritAttrs: false });

/** The pane content. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const context = useCollapsibleContext();
const el = useTemplateRef<HTMLDivElement>('el');

/* Presence forwards its data-state through attrs. Merge custom classes into the pane's defaults. */
const paneAttrs = computed(() => {
  const { class: customClass, ...rest } = attrs;
  return {
    ...rest,
    class: cn(
      'grid grid-rows-[0fr] motion-safe:transition-[grid-template-rows]',
      'motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)',
      'data-[state=open]:grid-rows-[1fr] [&[data-state=open]>div]:opacity-100',
      customClass as string | undefined,
    ),
  };
});

defineExpose({ el });
</script>

<template>
  <div
    ref="el"
    :id="context.contentId"
    role="region"
    :aria-labelledby="context.triggerId"
    :inert="!context.open"
    :aria-hidden="!context.open"
    v-bind="paneAttrs"
  >
    <div
      class="min-h-0 overflow-hidden opacity-0 motion-safe:transition-opacity motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)"
    >
      <slot />
    </div>
  </div>
</template>
