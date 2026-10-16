<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an
   exported name: React declared `CarouselDotsProps` (an alias of the div's HTML
   attributes) and consumers import it. Every attribute falls through here. */
export interface CarouselDotsProps {}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useCarouselContext } from './CarouselContext';
import CarouselDot from './CarouselDot.vue';

/** Renders the pagination dot row, one dot per slide; React shipped it as `Carousel.Dots`. */
defineOptions({ name: 'CarouselDots', inheritAttrs: false });

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const carousel = useCarouselContext();

const slideIndexes = computed(() => Array.from({ length: carousel.count }, (_unused, i) => i));

const classes = computed(() => cn('mt-3 flex items-center justify-center gap-1.5', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <CarouselDot v-for="slideIndex in slideIndexes" :key="slideIndex" :slide-index="slideIndex" />
  </div>
</template>
