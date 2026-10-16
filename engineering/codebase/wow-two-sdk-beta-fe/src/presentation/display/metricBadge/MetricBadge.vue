<script lang="ts">
/** Defines the MetricBadge icon tint tone. */
export const MetricBadgeTone = {
  /** Refers to the neutral tint. */
  Neutral: 'neutral',
  /** Refers to the positive / confirmation tint. */
  Success: 'success',
  /** Refers to the caution tint. */
  Warning: 'warning',
  /** Refers to the destructive / error tint. */
  Danger: 'danger',
  /** Refers to the informational tint. */
  Info: 'info',
} as const;

export type MetricBadgeTone = (typeof MetricBadgeTone)[keyof typeof MetricBadgeTone];

/** Defines the MetricBadge visual size. */
export const MetricBadgeSize = {
  /** Refers to the extra-small chip. */
  Xs: 'xs',
  /** Refers to the small chip. */
  Sm: 'sm',
  /** Refers to the medium chip. */
  Md: 'md',
} as const;

export type MetricBadgeSize = (typeof MetricBadgeSize)[keyof typeof MetricBadgeSize];

export interface MetricBadgeProps {
  /** The uppercase mini-LABEL rendered after the icon. Rich content goes through the `label` slot. */
  readonly label: string | number;

  /** The value rendered after the label, tabular-nums. Rich content goes through the `value` slot. */
  readonly value: string | number;

  /** The tone tinting the icon and the value. Default `neutral`. */
  readonly tone?: MetricBadgeTone;

  /** The visual size — drives gap + text-size token. Default `sm`. */
  readonly size?: MetricBadgeSize;
}

/**
 * Tints the icon *and* the value.
 *
 * Tinting only the icon made `tone` a no-op on the icon-less chip — every tone
 * emitted an identical class string. The value is the part a reader scans, so it
 * carries the tone whether or not an icon is supplied.
 *
 * Coloured tones use `-soft-foreground`, not the full-strength `{tone}`: this text
 * sits on the host surface, where `text-warning` measures 2.15:1.
 */
const ToneClasses: Record<MetricBadgeTone, { icon: string; value: string }> = {
  neutral: { icon: 'text-muted-foreground', value: 'text-foreground' },
  success: { icon: 'text-success-soft-foreground', value: 'text-success-soft-foreground' },
  warning: { icon: 'text-warning-soft-foreground', value: 'text-warning-soft-foreground' },
  danger: { icon: 'text-destructive-soft-foreground', value: 'text-destructive-soft-foreground' },
  info: { icon: 'text-info-soft-foreground', value: 'text-info-soft-foreground' },
};

const SizeClasses: Record<MetricBadgeSize, { wrapper: string; label: string; value: string }> = {
  xs: { wrapper: 'gap-1 text-[10px]', label: 'text-[10px]', value: 'text-xs' },
  sm: { wrapper: 'gap-1.5 text-xs', label: 'text-xs', value: 'text-xs' },
  md: { wrapper: 'gap-2 text-sm', label: 'text-xs', value: 'text-sm' },
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders an inline-flex label-value chip with a tone-tinted leading icon and an uppercase label.
 *
 * Used for stat strips. Distinct from `StatCard` (large KPI tile), `InfoRow` (justify-between two-column row), and
 * `Status` (dot + text).
 */
defineOptions({ name: 'MetricBadge', inheritAttrs: false });

defineSlots<{
  /** The optional leading icon (tone-tinted via the `tone` prop) — React's `icon` node prop. */
  icon?(): unknown;
  /** The rich override for the `label` prop. */
  label?(): unknown;
  /** The rich override for the `value` prop. */
  value?(): unknown;
}>();

const props = withDefaults(defineProps<MetricBadgeProps>(), {
  tone: 'neutral',
  size: 'sm',
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLSpanElement>('el');

const size = computed(() => SizeClasses[props.size]);

const classes = computed(() => cn('inline-flex items-center', size.value.wrapper, attrs.class as string | undefined));

const tone = computed(() => ToneClasses[props.tone]);

const iconClasses = computed(() => cn('inline-flex shrink-0 items-center', tone.value.icon));

const labelClasses = computed(() => cn('font-medium uppercase tracking-wide text-muted-foreground', size.value.label));

const valueClasses = computed(() => cn('tabular-nums', tone.value.value, size.value.value));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <span ref="el" v-bind="rest" :class="classes">
    <span v-if="$slots.icon" :class="iconClasses"><slot name="icon" /></span>
    <span :class="labelClasses"
      ><slot name="label">{{ props.label }}</slot></span
    >
    <span :class="valueClasses"
      ><slot name="value">{{ props.value }}</slot></span
    >
  </span>
</template>
