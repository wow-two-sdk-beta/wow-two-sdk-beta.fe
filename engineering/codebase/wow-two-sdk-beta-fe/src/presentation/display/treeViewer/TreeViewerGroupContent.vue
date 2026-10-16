<script lang="ts">
/** Internal — the animated wrapper `Presence` mounts for an expanded branch. */
export interface TreeViewerGroupContentProps {
  /** The nesting depth published to the rows inside. */
  readonly level: number;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { TreeViewerLevelKey, type TreeViewerLevelValue } from './TreeViewerContext';

/**
 * Renders the animating inner element of a `TreeViewerGroup`, growing its height as the branch expands.
 *
 * `<Presence>` clones this component's vnode with `data-state` + a ref, both of which reach the root
 * `<div>` through `rest`. Height animates via grid-template-rows 0fr -> 1fr, and the inner
 * `min-h-0 overflow-hidden` track clips the group so it can shrink to zero. No fade (height only) —
 * the chevron handles the rotate. Motion-safe-gated; reduced-motion gets an instant snap.
 */
defineOptions({ name: 'TreeViewerGroupContent', inheritAttrs: false });

/** The nested `TreeViewerGroup` / `TreeViewerItem` children. */
defineSlots<{ default(): unknown }>();

const props = defineProps<TreeViewerGroupContentProps>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

/* Live getter, not a snapshot — React re-provided on every render. */
provide<TreeViewerLevelValue>(TreeViewerLevelKey, {
  get level() {
    return props.level;
  },
});

const classes = computed(() =>
  cn(
    'grid',
    'motion-safe:transition-[grid-template-rows] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out) motion-reduce:transition-none',
    'data-[state=open]:grid-rows-[1fr] data-[state=closed]:grid-rows-[0fr]',
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
  <div ref="el" v-bind="rest" :class="classes">
    <div class="min-h-0 overflow-hidden">
      <ul role="group" class="flex flex-col">
        <slot />
      </ul>
    </div>
  </div>
</template>
