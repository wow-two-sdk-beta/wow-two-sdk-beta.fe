<script lang="ts">
/* `TimelineAlign` is imported here (not in `<script setup>`) so the one binding serves as both
   the prop type below and the runtime value used in `withDefaults` / the rail-side check. */
import { TimelineAlign } from './TimelineContext';

export interface TimelineProps {
  /** The side the rail sits on. Default `left`. */
  readonly align?: TimelineAlign;
}
</script>

<script setup lang="ts">
import { cloneVNode, computed, provide, useAttrs, useSlots, useTemplateRef, type VNode } from 'vue';
import { cn } from '../../../foundation/styles';
import { renderableChildren } from '../../../foundation/primitives';
import { TimelineKey } from './TimelineContext';

/** Renders a vertical rail of `TimelineItem` nodes joined by connectors, suppressed on the last. */
defineOptions({ name: 'Timeline', inheritAttrs: false });

/** The `TimelineItem` nodes — React's required `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<TimelineProps>(), { align: TimelineAlign.Left });

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLOListElement>('el');

const total = computed(() => renderableChildren(slots.default?.()).length);

/**
 * MarkText the last item so the connector line is suppressed. React rebuilt the child's props
 * object; a Vue slot hands over vnodes, so the flag is cloned onto the last one — it lands
 * in the item's fallthrough attrs exactly as `data-last` did in React.
 *
 * A function, not a `computed`: the slot is re-invoked on every render, so the vnodes handed
 * to `v-for` are always fresh rather than a cached array of already-mounted ones.
 */
function items(): Array<VNode> {
  const children = renderableChildren(slots.default?.());
  const last = children.length - 1;
  return children.map((child, index) => (index === last ? cloneVNode(child, { 'data-last': '' }) : child));
}

provide(TimelineKey, {
  get align() {
    return props.align;
  },
  get total() {
    return total.value;
  },
});

const classes = computed(() =>
  cn('flex list-none flex-col', props.align === TimelineAlign.Right && 'items-end', attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <ol ref="el" v-bind="rest" :class="classes">
    <component :is="node" v-for="(node, index) in items()" :key="node.key ?? index" />
  </ol>
</template>
