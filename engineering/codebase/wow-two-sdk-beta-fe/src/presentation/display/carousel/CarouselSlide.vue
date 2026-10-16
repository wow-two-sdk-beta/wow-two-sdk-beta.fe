<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an
   exported name: React declared `CarouselSlideProps` (an alias of the div's HTML
   attributes) and consumers import it. Every attribute falls through here. */
export interface CarouselSlideProps {}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/** Renders one slide's content box; React shipped it as `Carousel.Slide`. */
defineOptions({ name: 'CarouselSlide', inheritAttrs: false });

/** The slide content — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() => cn('h-full w-full', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes"><slot /></div>
</template>
