<script lang="ts">
/** Defines the StatCard tile visual size. */
export const StatCardSize = {
  /** Refers to the small tile. */
  Sm: 'sm',
  /** Refers to the medium tile. */
  Md: 'md',
  /** Refers to the large tile. */
  Lg: 'lg',
} as const;

export type StatCardSize = (typeof StatCardSize)[keyof typeof StatCardSize];

/** The optional trend readout — the sign picks the arrow, the sign and `isLowerBetter` pick the colour. */
export interface StatCardTrend {
  /** The signed change — a percentage unless `text` replaces the readout. Zero reads as neutral. */
  readonly value: number;

  /** The readout shown instead of the signed percentage, e.g. `+3 deploys` or `−12 ms`. */
  readonly text?: string | number;

  /** The muted caption rendered after the readout, e.g. `vs prior 30 days`. */
  readonly label?: string | number;
}

export interface StatCardProps {
  /** The label above the value. Rich content goes through the `label` slot. */
  readonly label: string | number;

  /** The primary value (large). Rich content goes through the `value` slot. */
  readonly value: string | number;

  /** The optional trend — a rise reads green and a fall red, flipped by `isLowerBetter`. */
  readonly trend?: StatCardTrend;

  /** A falling value is the good direction (latency, errors): the trend's colours flip. Default `false`. */
  readonly isLowerBetter?: boolean;

  /** The optional helper / supporting text below the trend. Rich content goes through the `helper` slot. */
  readonly helper?: string | number;

  /** The visual size. Default `md`. */
  readonly size?: StatCardSize;

  /** Makes the tile a link to this URL; the label is the link text and the whole tile is its target. */
  readonly href?: string;

  /**
   * Makes the tile a button; the label is its name and the whole tile is its target. A prop, not an emit, because
   * its presence picks the element.
   */
  readonly onClick?: (event: MouseEvent) => void;
}

const ValueSize: Record<StatCardSize, '2xl' | '3xl' | '4xl'> = {
  sm: '2xl',
  md: '3xl',
  lg: '4xl',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { Minus, TrendingDown, TrendingUp } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { useId } from '../../../foundation/identifiers';
import { Icon } from '../../../foundation/icons';
import Heading from '../heading/Heading.vue';
import Text from '../text/Text.vue';

/** Renders a KPI tile — label, big value, optional trend and helper — for dashboard grids. */
defineOptions({ name: 'StatCard', inheritAttrs: false });

defineSlots<{
  /** The rich override for the `label` prop. */
  label?(): unknown;
  /** The rich override for the `value` prop. */
  value?(): unknown;
  /** The rich override for the `helper` prop. */
  helper?(): unknown;
}>();

const props = withDefaults(defineProps<StatCardProps>(), {
  trend: undefined,
  isLowerBetter: false,
  helper: undefined,
  size: 'md',
  href: undefined,
  onClick: undefined,
});

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');
const detailId = useId();

const valueSize = computed(() => ValueSize[props.size]);

/* The arrow follows the sign; the colour follows whether that direction is good. */
const direction = computed(() => Math.sign(props.trend?.value ?? 0));
const trendIcon = computed(() => (direction.value > 0 ? TrendingUp : direction.value < 0 ? TrendingDown : Minus));
const trendTone = computed(() => {
  if (direction.value === 0) return 'text-muted-foreground';
  const isGood = props.isLowerBetter ? direction.value < 0 : direction.value > 0;
  return isGood ? 'text-success-soft-foreground' : 'text-destructive-soft-foreground';
});
const trendReadout = computed(() => {
  const trend = props.trend;
  if (!trend) return '';
  if (trend.text !== undefined) return String(trend.text);
  return `${trend.value > 0 ? '+' : ''}${trend.value}%`;
});

const hasHelper = computed(() => props.helper !== undefined || Boolean(slots.helper));

const controlTag = computed(() => (props.href !== undefined ? 'a' : props.onClick ? 'button' : undefined));

/* A clickable tile keeps its block content outside the control: the label is the control, stretched over the tile. */
const classes = computed(() =>
  cn(
    'flex flex-col gap-1',
    controlTag.value &&
      'relative rounded-lg transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
    attrs.class as string | undefined,
  ),
);

const trendClasses = computed(() => cn('inline-flex items-center gap-0.5 text-xs font-medium', trendTone.value));

const ControlClass =
  'text-left after:absolute after:inset-0 after:rounded-lg after:content-[""] focus-visible:outline-hidden';

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <Text size="sm" color="muted">
      <component
        :is="controlTag"
        v-if="controlTag"
        :href="props.href"
        :type="controlTag === 'button' ? 'button' : undefined"
        :aria-describedby="detailId"
        :class="ControlClass"
        @click="props.onClick?.($event)"
        ><slot name="label">{{ props.label }}</slot></component
      ><slot v-else name="label">{{ props.label }}</slot>
    </Text>
    <div :id="detailId" class="flex flex-col gap-1">
      <Heading :level="3" :size="valueSize" weight="bold">
        <slot name="value">{{ props.value }}</slot>
      </Heading>
      <span v-if="props.trend" :class="cn('mt-1', trendClasses)">
        <Icon :icon="trendIcon" :size="12" />
        {{ trendReadout }}
        <span v-if="props.trend.label" class="font-normal text-muted-foreground"> {{ props.trend.label }}</span>
      </span>
      <Text v-if="hasHelper" size="xs" color="muted" :class="!props.trend && 'mt-1'">
        <slot name="helper">{{ props.helper }}</slot>
      </Text>
    </div>
  </div>
</template>
