<script lang="ts">
export interface ResizablePanelProps {
  readonly defaultSize?: number;
  readonly minSize?: number;
  readonly maxSize?: number;
}
</script>

<script setup lang="ts">
import { computed, onUnmounted, useAttrs, useTemplateRef, watch, type CSSProperties } from 'vue';
import { cn, Orientation } from '../../../foundation/styles';
import { useResizableContext } from './ResizablePanelsLayout.vue';

/**
 * Renders one pane of a `<ResizablePanelsLayout>` group.
 *
 * React's `ResizablePanel` was an inert marker the parent swapped for an inner
 * impl through `Children.map`. Vue cannot rewrite slot children, so this is the
 * real component and it claims its index by registering with the group.
 */
defineOptions({ name: 'ResizablePanel', inheritAttrs: false });

const props = withDefaults(defineProps<ResizablePanelProps>(), {
  defaultSize: 100,
  minSize: 0,
  maxSize: 100,
});

defineSlots<{
  /** The pane content. */
  default?(): unknown;
}>();

const context = useResizableContext();
const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const token = Symbol('wow-two.resizablePanel');
context.registerPanel(token, {
  defaultSize: props.defaultSize,
  minSize: props.minSize,
  maxSize: props.maxSize,
});

watch(
  () => [props.defaultSize, props.minSize, props.maxSize] as const,
  ([defaultSize, minSize, maxSize]) => {
    context.updatePanel(token, { defaultSize, minSize, maxSize });
  },
);

onUnmounted(() => context.unregisterPanel(token));

const index = computed(() => context.panelIndex(token));
const size = computed(() => context.sizes[index.value] ?? props.defaultSize);

const styles = computed<CSSProperties>(() =>
  context.orientation === Orientation.Horizontal
    ? { width: `${size.value}%`, height: '100%' }
    : { height: `${size.value}%`, width: '100%' },
);

const classes = computed(() => cn('overflow-auto', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" :data-panel-index="index" v-bind="rest" :class="classes" :style="styles">
    <slot />
  </div>
</template>
