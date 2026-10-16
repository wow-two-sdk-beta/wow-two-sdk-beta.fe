<script lang="ts">
/* No props of its own — every attribute falls through. The block itself is load-bearing:
   in a `<script setup>`-only SFC, `vue-eslint-parser` loses `ignoreRestSiblings` and the
   `const { class: _class, ...others }` omission below trips `no-unused-vars`. */
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { SkeletonStateLine } from '../../feedback/skeletonState/SkeletonStateLine';

/** Renders the `h3` title line of a `Card`, at heading weight and tight leading. */
defineOptions({ name: 'CardTitle', inheritAttrs: false });

/** The title copy — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLHeadingElement>('el');

/* Follows the nearest `Card` or `DataRegion` skeleton: the title keeps its line and turns into a bar. */
const skeleton = useSkeletonState();

const classes = computed(() => cn('text-lg font-semibold tracking-tight', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <h3 ref="el" :data-skeleton="skeleton.isSkeleton.value || undefined" v-bind="rest" :class="classes">
    <SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value"><slot /></SkeletonStateLine>
  </h3>
</template>
