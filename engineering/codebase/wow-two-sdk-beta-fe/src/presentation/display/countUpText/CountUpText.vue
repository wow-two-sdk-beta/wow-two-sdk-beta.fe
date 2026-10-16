<script lang="ts">
import type { ElementTag } from '../../../foundation/dom';

export interface CountUpTextProps {
  /** The target value. */
  readonly to: number;

  /** The starting value. Default `0`. */
  readonly from?: number;

  /** The tween length in ms. Default `1500`. */
  readonly duration?: number;

  /** The easing applied to the tween's normalized time. Default `easeOutCubic`. */
  readonly easing?: (t: number) => number;

  /** The value formatter. Rich content → the `value` slot. */
  readonly format?: (value: number) => string;

  /** The start-when-scrolled-into-view mode. Default `false` (starts on mount). */
  readonly canTriggerOnView?: boolean;

  /** The rendered tag. Default `span`. */
  readonly as?: ElementTag;
}

/* Module scope, not `<script setup>`: `withDefaults` defaults are hoisted into the
   component options object outside `setup()`, so they cannot reference a setup local. */
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const defaultFormat = (v: number): string => v.toFixed(0);
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useAttrs, useTemplateRef, watch } from 'vue';
import { cn } from '../../../foundation/styles';
import { useReducedMotion } from '../../../foundation/device';

/**
 * Renders a number that counts up to `to` on mount, or when it first enters the viewport.
 *
 * rAF tween; `prefers-reduced-motion` jumps straight to `to`. `canTriggerOnView` picks the viewport trigger.
 */
defineOptions({ name: 'CountUpText', inheritAttrs: false });

defineSlots<{
  /** The rich override for the formatted number — receives the live tween value. */
  value?(props: { value: number; display: string }): unknown;
}>();

const props = withDefaults(defineProps<CountUpTextProps>(), {
  from: 0,
  duration: 1500,
  easing: easeOutCubic,
  format: defaultFormat,
  canTriggerOnView: false,
  as: 'span',
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');
/* Called before the lifecycle hooks below so its own `onMounted` subscription
   lands first and the flag is already settled when `run` fires. */
const reducedMotion = useReducedMotion();

const current = ref(props.canTriggerOnView ? props.from : props.to);

/* React held both in `useRef`s — mutable non-render values, so plain `let`s. */
let started = false;
let cleanup: (() => void) | undefined;

function animate(): () => void {
  const from = props.from;
  const to = props.to;
  const duration = props.duration;
  const easing = props.easing;
  if (!Number.isFinite(duration) || duration <= 0 || from === to) {
    current.value = to;
    return () => undefined;
  }
  const start = performance.now();
  let raf = 0;

  const tick = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    current.value = t < 1 ? from + (to - from) * easing(t) : to;
    if (t < 1) raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/** Cancels stale work and observes the current root until its first viewport entry. */
function run(): void {
  cleanup?.();
  cleanup = undefined;

  if (reducedMotion.value) {
    current.value = props.to;
    return;
  }

  const node = el.value;
  if (!node) return;
  if (props.canTriggerOnView && !started && typeof IntersectionObserver !== 'undefined') {
    let cancel: (() => void) | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started) {
            started = true;
            observer.disconnect();
            cancel = animate();
          }
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    cleanup = () => {
      observer.disconnect();
      cancel?.();
    };
    return;
  }

  cleanup = animate();
}

watch(
  [
    el,
    reducedMotion,
    () => props.to,
    () => props.from,
    () => props.duration,
    () => props.easing,
    () => props.canTriggerOnView,
  ],
  run,
  { flush: 'post' },
);

onBeforeUnmount(() => cleanup?.());

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
