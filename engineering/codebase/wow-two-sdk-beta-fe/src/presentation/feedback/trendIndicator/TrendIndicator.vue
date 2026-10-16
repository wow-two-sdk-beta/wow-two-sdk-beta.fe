<script lang="ts">
import type { Size } from '../../../foundation/styles';

export interface TrendIndicatorProps {
  /** The numeric delta — sign drives direction. */
  readonly value: number;

  /** The optional value formatter (default: `${sign}${value}%`). Rich content → the `value` slot. */
  readonly format?: (value: number) => string;

  /** The inverse-direction flag — when `true`, an increase reads as bad (e.g. error rate, churn). */
  readonly isInverse?: boolean;

  /** The small trailing label, e.g. "vs last week". Rich content → the `label` slot. */
  readonly label?: string;

  /** The text + icon scale. */
  readonly size?: Size;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { Minus, TrendingDown, TrendingUp } from 'lucide-vue-next';
import { cn, Size as SizeToken } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';

/* Only xs/sm/md carry a scale; other `Size` members fall through to `md` at
   the lookup below. */
const SizeText: Partial<Record<Size, string>> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
};
const SizeIcon: Partial<Record<Size, number>> = {
  xs: 12,
  sm: 14,
  md: 16,
};

const DirectionIcon = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

/**
 * Renders an up / down / flat arrow beside a value and an optional label.
 * Used inside `StatCard` and dashboard tiles. Pass `isInverse` for metrics where higher is worse.
 */
defineOptions({ name: 'TrendIndicator', inheritAttrs: false });

const props = withDefaults(defineProps<TrendIndicatorProps>(), { size: SizeToken.Sm });

defineSlots<{
  /** The formatted delta — receives the raw `value` and its `display` string. */
  value?(props: { value: number; display: string }): unknown;
  /** The trailing label. Falls back to the `label` prop. */
  label?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLSpanElement>('el');

const direction = computed<'up' | 'down' | 'flat'>(() => (props.value > 0 ? 'up' : props.value < 0 ? 'down' : 'flat'));

const positive = computed(() =>
  direction.value === 'flat' ? false : (direction.value === 'up') !== Boolean(props.isInverse),
);

const tone = computed(() =>
  /* `-soft-foreground`: the tones' text tokens — the solid `success` / `destructive` fills fall under AA as text in
     many themes. */
  direction.value === 'flat'
    ? 'text-muted-foreground'
    : positive.value
      ? 'text-success-soft-foreground'
      : 'text-destructive-soft-foreground',
);

const arrow = computed(() => DirectionIcon[direction.value]);

const display = computed(() =>
  props.format ? props.format(props.value) : `${props.value > 0 ? '+' : ''}${props.value}%`,
);

const iconSize = computed(() => SizeIcon[props.size] ?? SizeIcon.md);

const hasLabel = computed(() => Boolean(props.label) || Boolean(slots.label));

const classes = computed(() =>
  cn(
    'inline-flex items-center gap-1 font-medium',
    SizeText[props.size] ?? SizeText.md,
    tone.value,
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <span ref="el" v-bind="rest" :class="classes">
    <Icon :icon="arrow" :size="iconSize" />
    <slot name="value" :value="props.value" :display="display">{{ display }}</slot>
    <span v-if="hasLabel" class="text-muted-foreground">
      <slot name="label">{{ props.label }}</slot>
    </span>
  </span>
</template>
