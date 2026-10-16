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

/** Renders the muted supporting line under a `CardTitle`, at body-text scale. */
defineOptions({ name: 'CardDescription', inheritAttrs: false });

/** The description copy — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLParagraphElement>('el');

/* Follows the nearest `Card` or `DataRegion` skeleton: the copy keeps its lines and turns into bars. */
const skeleton = useSkeletonState();

const classes = computed(() => cn('text-sm text-muted-foreground', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <p ref="el" :data-skeleton="skeleton.isSkeleton.value || undefined" v-bind="rest" :class="classes">
    <SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value"><slot /></SkeletonStateLine>
  </p>
</template>
