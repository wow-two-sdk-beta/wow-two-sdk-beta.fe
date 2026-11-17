<script lang="ts">
import { CarouselNavVariant } from './Carousel.variants';
/* `aria-label` and `type` stay FALLTHROUGH attrs; the props are the shared `CarouselNavButtonProps` in
   `CarouselContext.ts`. The block is load-bearing besides: in a `<script setup>`-only SFC, `vue-eslint-parser` loses
   `ignoreRestSiblings` and the `const { class: _class, ...others }` omission below trips `no-unused-vars`. */
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { useCarouselContext, type CarouselNavButtonProps } from './CarouselContext';
import { carouselNavVariants } from './Carousel.variants';

const locale = useLocale();

/** Renders the step-forward nav button; React shipped it as `Carousel.Next`. */
defineOptions({ name: 'CarouselNext', inheritAttrs: false });

/** Overrides the chevron — React's `children ?? <Icon …>`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<CarouselNavButtonProps>(), { variant: CarouselNavVariant.Surface });

const attrs = useAttrs();
const el = useTemplateRef<HTMLButtonElement>('el');
const carousel = useCarouselContext();

/** One slide (or none yet) has nowhere to go, looping or not; past the edge only an unlooped carousel stops. */
const isSingle = computed(() => carousel.count <= 1);
const isDisabled = computed(() => isSingle.value || (!carousel.loop && carousel.index === carousel.count - 1));

/**
 * Runs after a consumer's own `click` — `rest` sits ahead of this binding in the
 * template, which is what makes the `defaultPrevented` check meaningful, the same
 * way React's explicit `onClick?.(e)` call did.
 */
function onClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  carousel.next();
}

const classes = computed(() =>
  cn(
    carouselNavVariants({ variant: props.variant, controls: carousel.controls, isDisabled: isDisabled.value }),
    'right-2',
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
  <!-- `type` and `aria-label` sit ahead of `rest`, so a consumer's own value wins —
       React's `type = 'button'` / `'aria-label' = 'Next slide'` destructured defaults. -->
  <button
    ref="el"
    type="button"
    :aria-label="locale.t('CarouselNext.nextSlide', undefined, 'Next slide')"
    :disabled="isDisabled"
    :inert="isSingle || undefined"
    v-bind="rest"
    :class="classes"
    @click="onClick"
  >
    <slot><Icon :icon="ChevronRight" :size="16" /></slot>
  </button>
</template>
