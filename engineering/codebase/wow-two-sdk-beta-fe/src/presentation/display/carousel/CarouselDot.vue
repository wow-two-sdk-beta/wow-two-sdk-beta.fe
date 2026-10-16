<script lang="ts">
export interface CarouselDotProps {
  /** The slide this dot jumps to. */
  readonly slideIndex: number;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useCarouselContext } from './CarouselContext';

const locale = useLocale();

/** Renders one pagination dot that jumps to its slide; React shipped it as `Carousel.Dot`. */
defineOptions({ name: 'CarouselDot', inheritAttrs: false });

const props = defineProps<CarouselDotProps>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLButtonElement>('el');
const carousel = useCarouselContext();

const isActive = computed(() => carousel.index === props.slideIndex);

/**
 * Runs after a consumer's own `click` — `rest` sits ahead of this binding in the
 * template, which is what makes the `defaultPrevented` check meaningful, the same
 * way React's explicit `onClick?.(e)` call did.
 */
function onClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  carousel.setIndex(props.slideIndex);
}

const classes = computed(() =>
  cn(
    'h-1.5 rounded-full bg-border transition-all hover:bg-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    isActive.value ? 'w-6 bg-primary hover:bg-primary' : 'w-1.5',
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
  <!-- `type` sits ahead of `rest` so a consumer's own value wins — React's `type = 'button'`. -->
  <button
    ref="el"
    type="button"
    :aria-label="locale.t('CarouselDot.goToSlide', { index: slideIndex + 1 }, 'Go to slide {index}')"
    :aria-current="isActive || undefined"
    v-bind="rest"
    :class="classes"
    @click="onClick"
  />
</template>
