<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an
   exported name that consumers import; the slides arrive through the default
   slot, so the interface carries no members. */
export interface CarouselSlidesProps {}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, onMounted, onUpdated, useAttrs, useSlots, useTemplateRef, type VNode } from 'vue';
import { cn } from '../../../foundation/styles';
import { renderableChildren } from '../../../foundation/primitives';
import { useCarouselContext } from './CarouselContext';

const locale = useLocale();

/** Renders the sliding track, wrapping each child in its own `role="group"` slide frame. */
defineOptions({ name: 'CarouselSlides', inheritAttrs: false });

/** The slides. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');
const carousel = useCarouselContext();

/**
 * A function, not a `computed`: the slot is re-invoked on every render, so the
 * vnodes handed to `v-for` are always fresh rather than a cached array of
 * already-mounted ones. Call it — `v-for` over a bare function iterates nothing.
 */
function slideChildren(): Array<VNode> {
  return renderableChildren(slots.default?.());
}

/**
 * No children array exists to depend on, so the count is re-read after every
 * render of this component — which is precisely when the slot content can have
 * changed. Writing an unchanged count is a no-op on a ref, so this cannot loop.
 */
function syncCount(): void {
  carousel.setCount(slideChildren().length);
}

onMounted(syncCount);
onUpdated(syncCount);

const classes = computed(() =>
  cn('flex transition-transform duration-300 ease-out', attrs.class as string | undefined),
);

/** Vue does not append units to a numeric `:style` value — spelled out. */
const trackStyle = computed(() => ({ transform: `translateX(-${carousel.index * 100}%)` }));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" :aria-live="carousel.autoPlay ? 'off' : 'polite'" v-bind="rest" :class="classes" :style="trackStyle">
    <!-- The single-element `v-for` hoists the slot call into a template local, so
         the slot is invoked once per render and `length` is the live child count
         rather than the injected count, which lags by a tick. -->
    <template v-for="(children, hoist) in [slideChildren()]" :key="hoist">
      <div
        v-for="(child, slideIndex) in children"
        :key="child.key ?? slideIndex"
        role="group"
        :aria-roledescription="locale.t('CarouselSlides.slide', undefined, 'slide')"
        :aria-label="
          locale.t('CarouselSlides.position', { index: slideIndex + 1, total: children.length }, '{index} of {total}')
        "
        :aria-hidden="slideIndex !== carousel.index || undefined"
        :inert="slideIndex !== carousel.index || undefined"
        class="w-full shrink-0"
      >
        <component :is="child" />
      </div>
    </template>
  </div>
</template>
