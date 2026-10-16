<script lang="ts">
import type { ProgressTone } from '../../../foundation/styles';

export interface ProgressCircleIndicatorProps {
  /** The current value 0–100. Omit for indeterminate. */
  readonly value?: number;
  readonly max?: number;
  readonly size?: number;
  readonly thickness?: number;
  /** The ring tone palette. */
  readonly tone?: ProgressTone;
  readonly label?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn, ProgressTone as ProgressToneToken } from '../../../foundation/styles';

const ToneClass: Record<ProgressTone, string> = {
  brand: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  neutral: 'text-muted-foreground',
};

/**
 * Renders a circular SVG progress ring with an optional label at its centre.
 * Determinate when `value` is set; indeterminate (rotating) when omitted.
 */
defineOptions({ name: 'ProgressCircleIndicator', inheritAttrs: false });

const props = withDefaults(defineProps<ProgressCircleIndicatorProps>(), {
  max: 100,
  size: 40,
  thickness: 4,
  tone: ProgressToneToken.Brand,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const determinate = computed(() => typeof props.value === 'number');
const radius = computed(() => (props.size - props.thickness) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const pct = computed(() =>
  determinate.value ? Math.min(100, Math.max(0, ((props.value ?? 0) / props.max) * 100)) : 25,
);
const offset = computed(() => circumference.value - (pct.value / 100) * circumference.value);

const classes = computed(() =>
  cn('inline-block', !determinate.value && 'animate-spin', ToneClass[props.tone], attrs.class as string | undefined),
);

/** Vue does not auto-suffix numeric style values with `px`, so the unit is spelled out. */
const boxStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div
    ref="el"
    role="progressbar"
    :aria-label="props.label"
    :aria-valuemin="0"
    :aria-valuemax="props.max"
    :aria-valuenow="determinate ? props.value : undefined"
    :style="boxStyle"
    v-bind="rest"
    :class="classes"
  >
    <svg :width="props.size" :height="props.size" :viewBox="`0 0 ${props.size} ${props.size}`">
      <circle
        :cx="props.size / 2"
        :cy="props.size / 2"
        :r="radius"
        stroke="currentColor"
        :stroke-width="props.thickness"
        fill="none"
        :opacity="0.2"
      />
      <circle
        :cx="props.size / 2"
        :cy="props.size / 2"
        :r="radius"
        stroke="currentColor"
        :stroke-width="props.thickness"
        stroke-linecap="round"
        fill="none"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        :transform="`rotate(-90 ${props.size / 2} ${props.size / 2})`"
        :style="{ transition: 'stroke-dashoffset 300ms ease' }"
      />
    </svg>
  </div>
</template>
