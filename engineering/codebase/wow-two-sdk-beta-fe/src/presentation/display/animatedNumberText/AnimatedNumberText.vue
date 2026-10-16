<script lang="ts">
import type { ElementTag } from '../../../foundation/dom';

export interface AnimatedNumberTextProps {
  /** The target value — every change tweens the display from where it currently sits. */
  readonly value: number;

  /** The tween length in ms. Default `500`. */
  readonly duration?: number;

  /** The easing applied to the tween's normalized time. Default `easeOutCubic`. */
  readonly easing?: (t: number) => number;

  /** The value formatter. Rich content → the `value` slot. */
  readonly format?: (value: number) => string;

  /** The rendered tag. Default `span`. */
  readonly as?: ElementTag;
}

/* Module scope, not `<script setup>`: `withDefaults` defaults are hoisted into the
   component options object outside `setup()`, so they cannot reference a setup local. */
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const defaultFormat = (v: number): string => v.toFixed(0);
</script>

<script setup lang="ts">
import { computed, ref, useAttrs, useTemplateRef, watch } from 'vue';
import { cn } from '../../../foundation/styles';
import { useReducedMotion } from '../../../foundation/device';

/**
 * Renders a number that tweens from its previous value to `value` on every change.
 *
 * rAF tween; respects `prefers-reduced-motion`.
 */
defineOptions({ name: 'AnimatedNumberText', inheritAttrs: false });

defineSlots<{
  /** The rich override for the formatted number — receives the live tween value. */
  value?(props: { value: number; display: string }): unknown;
}>();

const props = withDefaults(defineProps<AnimatedNumberTextProps>(), {
  duration: 500,
  easing: easeOutCubic,
  format: defaultFormat,
  as: 'span',
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');
const reducedMotion = useReducedMotion();

/** The live tween value driving the render. */
const current = ref(props.value);

/* React held this in a `useRef` — a mutable non-render value, so a plain `let`. */
let from = props.value;

/** Retargets from the displayed value and settles immediately when motion is disabled. */
watch(
  [reducedMotion, () => props.value, () => props.duration, () => props.easing],
  (_next, _previous, onCleanup) => {
    if (reducedMotion.value || !Number.isFinite(props.duration) || props.duration <= 0) {
      current.value = props.value;
      from = props.value;
      return;
    }
    const base = from;
    const to = props.value;
    if (base === to) return;

    const duration = props.duration;
    const easing = props.easing;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easing(t);
      const next = t < 1 ? base + (to - base) * eased : to;
      current.value = next;
      // Track the displayed value so an interrupting tween starts from
      // where the display actually is, not the stale pre-animation base.
      from = next;
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    onCleanup(() => cancelAnimationFrame(raf));
  },
  { immediate: true },
);

const display = computed(() => props.format(current.value));

const classes = computed(() => cn('tabular-nums', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <component :is="props.as" ref="el" v-bind="rest" :class="classes">
    <slot name="value" :value="current" :display="display">{{ display }}</slot>
  </component>
</template>
