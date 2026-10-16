<script lang="ts">
import type { HTMLAttributes } from 'vue';

export interface ScrollViewportProps extends /* @vue-ignore */ HTMLAttributes {
  /**
   * The fixed viewport height. Number → pixels; string → any CSS length
   * (`'20rem'`, `'50vh'`). Content beyond this scrolls; the box does not grow.
   * Omit to let the container size to its context (still clips + scrolls via `maxHeight`).
   */
  readonly height?: number | string;

  /**
   * The height ceiling — grows with content up to this cap without pinning it,
   * then scrolls. Number → pixels; string → any CSS length.
   */
  readonly maxHeight?: number | string;

  /**
   * The height/opacity transition flag (a content swap, an expand). Respects
   * `prefers-reduced-motion` — the transition is dropped when the user opts out.
   * @default false
   */
  readonly isAnimated?: boolean;
  /** @deprecated Use `isAnimated`; this alias is removed next release. */
  readonly animate?: boolean;
}
</script>

<script setup lang="ts">
import { computed, normalizeStyle, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../styles/Cn';
import { useReducedMotion } from '../../device/hooks/UseReducedMotion';

/**
 * Renders the slot inside a headless fixed-height scroll container. A drop-in for
 * inline `h-[…] overflow-y-auto` viewport styling with two stability guarantees:
 *
 * - `scrollbar-gutter: stable` — reserves the scrollbar's track so content
 *   doesn't shift horizontally when the bar appears/disappears (an overflow-y
 *   toggle that would otherwise reflow the row).
 * - optional height/opacity transition (`isAnimated`) that short-circuits under
 *   `prefers-reduced-motion`, so motion-sensitive users get an instant swap.
 *
 * No visual styling beyond layout — border/padding/rounding stay with the
 * consumer. The scrollable node is exposed as `el` so callers can drive
 * `scrollTop` (scroll-to-top on filter, virtualization measurements, etc.) —
 * the Vue stand-in for the original's `forwardRef`.
 */
defineOptions({ name: 'ScrollViewport', inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    height?: number | string;
    maxHeight?: number | string;
    isAnimated?: boolean;
    animate?: boolean;
  }>(),
  { isAnimated: undefined, animate: undefined },
);

defineSlots<{
  /** The scrollable content inside the viewport. */
  default(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const reducedMotion = useReducedMotion();

const transitionsOn = computed(() => (props.isAnimated ?? props.animate ?? false) && !reducedMotion.value);

const sizeStyle = computed(() =>
  normalizeStyle([
    {
      height: typeof props.height === 'number' ? `${props.height}px` : props.height,
      maxHeight: typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight,
      scrollbarGutter: 'stable',
    },
    attrs.style,
  ]),
);

const classes = computed(() =>
  cn(
    'overflow-y-auto overflow-x-hidden',
    transitionsOn.value && 'transition-[height,opacity] duration-200 ease-out',
    attrs.class as string | undefined,
  ),
);

const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes" :style="sizeStyle"><slot /></div>
</template>
