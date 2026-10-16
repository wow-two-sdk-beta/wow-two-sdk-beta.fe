<script lang="ts">
export interface LiveCursorIndicatorProps {
  /** The pixel offset from the parent's top-left corner. */
  readonly x: number;
  readonly y: number;
  /** The display name shown beside the pointer. Rich content → the `name` slot. */
  readonly name?: string;

  /** The CSS color used for the pointer fill and label background. */
  readonly color?: string;

  /** The smooth-movement toggle between updates. Defaults to true; auto-disables with reduced motion. */
  readonly isSmooth?: boolean;

  /** The pixel offset for the label relative to the pointer. */
  readonly labelOffset?: { x?: number; y?: number };

  /** The pointer-only toggle — hides the label and shows only the pointer. */
  readonly isPointerOnly?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef, type CSSProperties } from 'vue';
import { cn } from '../../../foundation/styles';
import { useReducedMotion } from '../../../foundation/device';

/**
 * Renders a remote user's cursor and name label on a collaborative canvas.
 * Wrap in a `relative` parent; places itself absolutely at `(x, y)`, smoothing movement unless
 * reduced-motion.
 */
defineOptions({ name: 'LiveCursorIndicator', inheritAttrs: false });

const props = withDefaults(defineProps<LiveCursorIndicatorProps>(), {
  color: 'var(--color-primary)',
  isSmooth: true,
});

defineSlots<{
  /** The cursor name label. Falls back to the `name` prop. */
  name?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');

const reducedMotion = useReducedMotion();
const useTransition = computed(() => props.isSmooth && !reducedMotion.value);

const lx = computed(() => props.labelOffset?.x ?? 12);
const ly = computed(() => props.labelOffset?.y ?? 16);

const hasName = computed(() => Boolean(props.name) || Boolean(slots.name));

const wrapperStyle = computed<CSSProperties>(() => ({
  transform: `translate3d(${props.x}px, ${props.y}px, 0)`,
  transition: useTransition.value ? 'transform 80ms linear' : undefined,
}));

const labelStyle = computed<CSSProperties>(() => ({
  backgroundColor: props.color,
  transform: `translate(${lx.value}px, ${ly.value}px)`,
}));

const classes = computed(() =>
  cn('pointer-events-none absolute left-0 top-0 z-tooltip select-none', attrs.class as string | undefined),
);

/**
 * Everything but `class` and `style` — both are re-applied by hand. The array
 * `:style` binding reproduces React's `{ ...wrapperStyle, ...style }` merge
 * (caller wins) while tolerating the string form Vue also allows for `style`.
 */
const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});

const callerStyle = computed(() => attrs.style as CSSProperties | string | undefined);

defineExpose({ el });
</script>

<template>
  <div ref="el" aria-hidden="true" v-bind="rest" :class="classes" :style="[wrapperStyle, callerStyle ?? {}]">
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-sm">
      <path
        d="M5 3 L5 19 L9.5 14.5 L12.5 21 L15.5 19.5 L12.5 13 L19 13 Z"
        :fill="props.color"
        stroke="white"
        stroke-width="1.25"
        stroke-linejoin="round"
      />
    </svg>
    <span
      v-if="hasName && !props.isPointerOnly"
      class="absolute whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none text-white shadow-sm"
      :style="labelStyle"
    >
      <slot name="name">{{ props.name }}</slot>
    </span>
  </div>
</template>
