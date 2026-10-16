<script lang="ts">
import type { ElementTag } from '../../../foundation/dom';

export interface TiltLayoutProps {
  /** The maximum rotation in degrees at the edges. Default `12`. */
  readonly maxAngle?: number;

  /** The px perspective depth. Default `800`. */
  readonly perspective?: number;

  /** The cursor-following highlight. */
  readonly hasGlare?: boolean;

  /** The scale applied while tilted. Default `1`. */
  readonly scale?: number;

  /** The rendered tag. Default `div`. */
  readonly as?: ElementTag;
}

interface TiltLayoutState {
  rotateX: number;
  rotateY: number;
  glareX: number;
  glareY: number;
  active: boolean;
}

const RestingTilt: TiltLayoutState = { rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, active: false };
</script>

<script setup lang="ts">
import { computed, normalizeStyle, ref, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useReducedMotion } from '../../../foundation/device';

/**
 * Renders children on a 3D tilt that follows the cursor through `rotateX` / `rotateY`.
 *
 * Disabled under `prefers-reduced-motion`. `hasGlare` paints a cursor-following highlight.
 */
defineOptions({ name: 'TiltLayout', inheritAttrs: false });

/** The tilted content. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<TiltLayoutProps>(), {
  maxAngle: 12,
  perspective: 800,
  hasGlare: undefined,
  scale: 1,
  as: 'div',
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');
const reducedMotion = useReducedMotion();

const tilt = ref<TiltLayoutState>({ ...RestingTilt });

/*
 * A caller's `onPointerMove` / `onPointerLeave` stay in the fallthrough bag:
 * Vue's `mergeProps` chains them with the handlers bound below, caller first
 * (`v-bind="rest"` precedes `@pointermove` in the template).
 */
function handleMove(e: PointerEvent): void {
  if (reducedMotion.value) return;
  const node = el.value;
  if (!node) return;
  const rect = node.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  tilt.value = {
    rotateX: (0.5 - y) * 2 * props.maxAngle,
    rotateY: (x - 0.5) * 2 * props.maxAngle,
    glareX: x * 100,
    glareY: y * 100,
    active: true,
  };
}

function handleLeave(): void {
  tilt.value = { ...RestingTilt };
}

const classes = computed(() => cn('relative', attrs.class as string | undefined));

/**
 * Vue does not append `px` to a numeric `:style` value, so `perspective` is
 * spelled out. `normalizeStyle` merges left → right, so a caller's `style`
 * lands last and wins.
 */
const styles = computed(() =>
  normalizeStyle([
    {
      perspective: `${props.perspective}px`,
      transform:
        tilt.value.active && !reducedMotion.value
          ? `rotateX(${tilt.value.rotateX}deg) rotateY(${tilt.value.rotateY}deg) scale(${props.scale})`
          : 'rotateX(0) rotateY(0) scale(1)',
      transition: tilt.value.active ? 'transform 80ms ease-out' : 'transform 220ms ease-out',
      transformStyle: 'preserve-3d',
    },
    attrs.style,
  ]),
);

const showGlare = computed(() => Boolean(props.hasGlare) && !reducedMotion.value && tilt.value.active);

const glareStyle = computed(() => ({
  background: `radial-gradient(circle at ${tilt.value.glareX}% ${tilt.value.glareY}%, rgba(255,255,255,0.35) 0%, transparent 50%)`,
}));

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
    v-bind="rest"
    :class="classes"
    :style="styles"
    @pointermove="handleMove"
    @pointerleave="handleLeave"
  >
    <slot />
    <span
      v-if="showGlare"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay"
      :style="glareStyle"
    />
  </component>
</template>
