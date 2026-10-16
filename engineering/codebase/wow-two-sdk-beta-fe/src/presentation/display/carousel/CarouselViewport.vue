<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an
   exported name: React declared `CarouselViewportProps` and consumers import it.
   Its only member was `aria-label`, which stays a FALLTHROUGH attr — declaring a
   hyphenated prop name would have Vue camelize it to `ariaLabel`, so the
   `'Carousel'` default below would never apply. */
export interface CarouselViewportProps {}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useCarouselContext } from './CarouselContext';

const locale = useLocale();

/** Renders the clipping frame and owns the arrow-key seam; React shipped it as `Carousel.Viewport`. */
defineOptions({ name: 'CarouselViewport', inheritAttrs: false });

/** The `CarouselSlides` content — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const carousel = useCarouselContext();

/** The accessible label for the viewport. Default `'Carousel'`. */
const ariaLabel = computed(
  () => (attrs[AriaAttribute.Label] as string | undefined) ?? locale.t('CarouselViewport.label', undefined, 'Carousel'),
);

/**
 * Runs after a consumer's own `keydown` — `rest` sits ahead of this binding in
 * the template, which is what makes the `defaultPrevented` check meaningful, the
 * same way React's explicit `onKeyDown?.(e)` call did.
 */
function onKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing || event.target !== event.currentTarget) return;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    carousel.prev();
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    carousel.next();
  }
}

const classes = computed(() =>
  cn(
    'relative overflow-hidden rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class` and `aria-label`, both re-applied explicitly above. */
const rest = computed(() => {
  const { class: _class, [AriaAttribute.Label]: _ariaLabel, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div
    ref="el"
    role="group"
    :aria-roledescription="locale.t('CarouselViewport.carousel', undefined, 'carousel')"
    :aria-label="ariaLabel"
    :tabindex="0"
    v-bind="rest"
    :class="classes"
    @keydown="onKeydown"
  >
    <slot />
  </div>
</template>
