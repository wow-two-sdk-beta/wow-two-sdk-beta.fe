<script lang="ts">
/* No props of its own — `aria-label` and `type` both stay FALLTHROUGH attrs, and
   the shared `CarouselNavButtonProps` name lives in `CarouselContext.ts`. The block
   itself is load-bearing: in a `<script setup>`-only SFC, `vue-eslint-parser` loses
   `ignoreRestSiblings` and the `const { class: _class, ...others }` omission below
   trips `no-unused-vars`. */
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { useCarouselContext } from './CarouselContext';

const locale = useLocale();

/** Renders the step-forward nav button; React shipped it as `Carousel.Next`. */
defineOptions({ name: 'CarouselNext', inheritAttrs: false });

/** Overrides the chevron — React's `children ?? <Icon …>`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLButtonElement>('el');
const carousel = useCarouselContext();

const isDisabled = computed(() => !carousel.loop && carousel.index === carousel.count - 1);

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
    'absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow ring-1 ring-border transition-colors hover:bg-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40',
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
    v-bind="rest"
    :class="classes"
    @click="onClick"
  >
    <slot><Icon :icon="ChevronRight" :size="16" /></slot>
  </button>
</template>
