<script lang="ts">
import type { ElementTag } from '../../../foundation/dom';

/** Defines the ScrollRevealGroup enter-viewport animation. */
export const ScrollRevealGroupEffect = {
  /** Refers to a plain opacity fade. */
  Fade: 'fade',
  /** Refers to a fade + upward slide. */
  SlideUp: 'slide-up',
  /** Refers to a fade + downward slide. */
  SlideDown: 'slide-down',
  /** Refers to a fade + leftward slide. */
  SlideLeft: 'slide-left',
  /** Refers to a fade + rightward slide. */
  SlideRight: 'slide-right',
  /** Refers to a fade + scale-in zoom. */
  Zoom: 'zoom',
} as const;

export type ScrollRevealGroupEffect = (typeof ScrollRevealGroupEffect)[keyof typeof ScrollRevealGroupEffect];

export interface ScrollRevealGroupProps {
  /** The enter animation. Default `fade`. */
  readonly effect?: ScrollRevealGroupEffect;

  /** The transition length in ms. Default `600`. */
  readonly duration?: number;

  /** The transition delay in ms. Default `0`. */
  readonly delay?: number;

  /** The IntersectionObserver visibility ratio that counts as revealed. Default `0.1`. */
  readonly threshold?: number;

  /** The reveal-once flag — `false` re-hides when scrolled back out. Default `true`. */
  readonly isOnce?: boolean;

  /** The rendered tag. Default `div`. */
  readonly as?: ElementTag;
}

const HiddenTransforms: Record<ScrollRevealGroupEffect, string> = {
  fade: '',
  'slide-up': 'translateY(20px)',
  'slide-down': 'translateY(-20px)',
  'slide-left': 'translateX(20px)',
  'slide-right': 'translateX(-20px)',
  zoom: 'scale(0.95)',
};
</script>

<script setup lang="ts">
import { computed, normalizeStyle, onBeforeUnmount, onMounted, ref, useAttrs, useTemplateRef, watch } from 'vue';
import { cn } from '../../../foundation/styles';
import { useReducedMotion } from '../../../foundation/device';

/**
 * Renders children hidden until they enter the viewport, then fades and slides them in.
 *
 * CSS-driven (opacity + transform); an IntersectionObserver toggles `data-revealed`. Reduced motion shows content
 * from the start, with no transform or opacity at all.
 */
defineOptions({ name: 'ScrollRevealGroup', inheritAttrs: false });

/** The revealed content — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<ScrollRevealGroupProps>(), {
  effect: 'fade',
  duration: 600,
  delay: 0,
  threshold: 0.1,
  isOnce: true,
  as: 'div',
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');
/* Called before the lifecycle hooks below so its own `onMounted` subscription
   lands first and the flag is already settled when `observe` fires. */
const reducedMotion = useReducedMotion();

const revealed = ref(false);

/*
 * React's `useEffect` on `[reduced, threshold, isOnce]`. Kicked off from
 * `onMounted` rather than an `immediate` watcher because the observer needs the
 * element, which only exists after mount.
 */
let observer: IntersectionObserver | undefined;

function disconnect(): void {
  observer?.disconnect();
  observer = undefined;
}

function observe(): void {
  disconnect();

  if (reducedMotion.value) {
    revealed.value = true;
    return;
  }

  const node = el.value;
  if (!node || typeof IntersectionObserver === 'undefined') {
    revealed.value = true;
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          revealed.value = true;
          if (props.isOnce) disconnect();
        } else if (!props.isOnce) {
          revealed.value = false;
        }
      }
    },
    { threshold: props.threshold },
  );
  observer.observe(node);
}

onMounted(observe);

watch([reducedMotion, () => props.threshold, () => props.isOnce], observe);

onBeforeUnmount(disconnect);

const classes = computed(() => cn(attrs.class as string | undefined));

/** `normalizeStyle` merges left → right, so a caller's `style` lands last and wins. */
const styles = computed(() =>
  normalizeStyle([
    {
      opacity: revealed.value || reducedMotion.value ? 1 : 0,
      transform: revealed.value || reducedMotion.value ? 'none' : HiddenTransforms[props.effect],
      transition: reducedMotion.value
        ? undefined
        : `opacity ${props.duration}ms ease-out ${props.delay}ms, transform ${props.duration}ms ease-out ${props.delay}ms`,
    },
    attrs.style,
  ]),
);

/** Everything but `class` / `style`, both re-applied above. */
const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <component
    :is="props.as"
    ref="el"
    :data-revealed="revealed || undefined"
    v-bind="rest"
    :class="classes"
    :style="styles"
  >
    <slot />
  </component>
</template>
