<script lang="ts">
export interface DotsIndicatorProps {
  /** The total number of items the dots stand for. */
  readonly count: number;

  /** The current item, zero-based; clamped into range. */
  readonly index: number;

  /** The most dots shown; every item when there are fewer. Default 5. */
  readonly visibleCount?: number;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { useLocale } from '../../../foundation/i18n';
import { cn } from '../../../foundation/styles';
import { dotsIndicatorWindowOf, type DotsIndicatorDot } from './DotsIndicatorWindow';

const locale = useLocale();

/**
 * Renders a row of dots for a position in a longer series, such as the image a card shows. It calculates its own
 * window: with more items than `visibleCount` it shows that many dots, keeps the current item's dot highlighted on
 * the centre while it can, slides along as `index` moves, and draws the edge dot smaller when more items lie beyond it.
 *
 * The dots are drawn in the current text colour, so `text-white` on a photograph or `text-primary` on a page colours
 * them; the current dot is solid and the rest are faded. It is presentational: the row is one image named by its
 * position, `3 of 10`.
 */
defineOptions({ name: 'DotsIndicator', inheritAttrs: false });

const props = withDefaults(defineProps<DotsIndicatorProps>(), { visibleCount: 5 });
const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const dots = computed(() => dotsIndicatorWindowOf(props.count, props.index, props.visibleCount));
const current = computed(() => dots.value.find((dot) => dot.isActive)?.position ?? 0);
const label = computed(() =>
  locale.t(
    'DotsIndicator.position',
    { index: current.value + 1, total: Math.max(0, props.count) },
    '{index} of {total}',
  ),
);

const classes = computed(() => cn('inline-flex items-center gap-1', attrs.class as string | undefined));

/** One dot's size and fade: the current one solid, a window edge with more beyond it small and faint. */
function dotClasses(dot: DotsIndicatorDot): string {
  return cn(
    'shrink-0 rounded-full bg-current transition-all duration-200 motion-reduce:transition-none',
    dot.edge ? 'size-1 opacity-35' : 'size-1.5',
    dot.isActive ? 'opacity-100' : dot.edge ? '' : 'opacity-50',
  );
}

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div v-if="dots.length" ref="el" role="img" :aria-label="label" v-bind="rest" :class="classes">
    <span
      v-for="dot in dots"
      :key="dot.position"
      :class="dotClasses(dot)"
      aria-hidden="true"
      v-bind="{ 'data-dot': '', 'data-active': dot.isActive || undefined, 'data-edge': dot.edge }"
    ></span>
  </div>
</template>
