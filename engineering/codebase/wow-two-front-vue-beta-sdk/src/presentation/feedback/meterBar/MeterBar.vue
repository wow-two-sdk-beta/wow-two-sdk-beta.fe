<script lang="ts">
import type { Size } from '../../../foundation/styles';

export interface MeterBarProps {
  /** The current value 0–`max`. */
  readonly value: number;
  readonly max?: number;
  /** The threshold values that change the fill tone. Pass `[good, warn]` —
   *  `value <= good` → success, `<= warn` → warning, otherwise destructive.
   *  Defaults: `[max * 0.7, max * 0.9]`. */
  readonly thresholds?: [number, number];

  /** The bar thickness. */
  readonly size?: Size;

  /** The meter's accessible name; drawn above the bar with `isLabelVisible`. */
  readonly label?: string;

  /** Draws `label` above the bar with the readout on its right. Default `false`. */
  readonly isLabelVisible?: boolean;

  /** The readout beside a visible label, e.g. `6.2 of 10 GB`. Default the rounded percentage. */
  readonly valueLabel?: string;

  /** The value is still loading: the bar pulses without a fill and the readout is a placeholder. Default `false`. */
  readonly isLoading?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn, Size as SizeToken } from '../../../foundation/styles';
import { useLocale, useLocaleFormatters } from '../../../foundation/i18n';
import { useId } from '../../../foundation/identifiers';
import SkeletonState from '../skeletonState/SkeletonState.vue';

/* Only the sm/md/lg steps carry a thickness; other `Size` members fall through
   to the `md` default at the lookup below. */
const TrackHeight: Partial<Record<Size, string>> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

/**
 * Renders a horizontal gauge whose fill color crosses threshold zones — green / amber / red.
 * Use for usage gauges, capacity, and score meters; `ProgressBar` covers plain progress.
 */
defineOptions({ name: 'MeterBar', inheritAttrs: false });

const props = withDefaults(defineProps<MeterBarProps>(), {
  max: 100,
  size: SizeToken.Md,
  isLabelVisible: false,
  isLoading: false,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const locale = useLocale();

const ZoneTone = { good: 'bg-success', warn: 'bg-warning', critical: 'bg-destructive' } as const;

/** The threshold zone the value sits in — green up to the first threshold, amber to the second, red past it. */
const zone = computed<keyof typeof ZoneTone>(() => {
  const [good, warn] = props.thresholds ?? [props.max * 0.7, props.max * 0.9];
  return props.value <= good ? 'good' : props.value <= warn ? 'warn' : 'critical';
});
const tone = computed(() => ZoneTone[zone.value]);

/* A zero or negative `max` has no scale: draw an empty track rather than a `NaN%` width. */
const pct = computed(() => (props.max > 0 ? Math.min(100, Math.max(0, (props.value / props.max) * 100)) : 0));

/* The zone is otherwise carried by color alone (WCAG 1.4.1), so the spoken value names it. */
const ZoneLabel = {
  good: () => locale.t('MeterBar.zoneGood', undefined, 'normal'),
  warn: () => locale.t('MeterBar.zoneWarn', undefined, 'high'),
  critical: () => locale.t('MeterBar.zoneCritical', undefined, 'critical'),
} as const;
const valueText = computed(() =>
  props.isLoading
    ? locale.t('MeterBar.loading', undefined, 'Loading')
    : locale.t(
        'MeterBar.valueText',
        { percent: Math.round(pct.value), zone: ZoneLabel[zone.value]() },
        '{percent}%, {zone}',
      ),
);

const formatters = useLocaleFormatters();
const readout = computed(
  () => props.valueLabel ?? formatters.value.percent(pct.value / 100, { maximumFractionDigits: 0 }),
);
const labelId = useId();

const trackClasses = computed(() =>
  cn(
    'w-full overflow-hidden rounded-full bg-muted',
    TrackHeight[props.size] ?? TrackHeight.md,
    props.isLoading && 'animate-pulse motion-reduce:animate-none',
  ),
);

/* Without a visible label the bar is the root, as before; with one, a column holds the label row and the bar. */
const classes = computed(() =>
  props.isLabelVisible
    ? cn('flex w-full flex-col gap-1.5', attrs.class as string | undefined)
    : cn(trackClasses.value, attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div v-if="props.isLabelVisible" ref="el" v-bind="rest" :class="classes">
    <div class="flex items-center justify-between gap-3 text-xs">
      <span :id="labelId" class="min-w-0 truncate text-muted-foreground">{{ props.label }}</span>
      <SkeletonState v-if="props.isLoading" shape="text" class="h-3 w-10" />
      <span v-else class="shrink-0 font-medium tabular-nums">{{ readout }}</span>
    </div>
    <div
      role="meter"
      :aria-labelledby="labelId"
      :aria-valuemin="0"
      :aria-valuemax="props.max"
      :aria-valuenow="props.value"
      :aria-valuetext="valueText"
      :aria-busy="props.isLoading || undefined"
      :data-zone="props.isLoading ? undefined : zone"
      :class="trackClasses"
    >
      <div
        v-if="!props.isLoading"
        :class="cn('h-full rounded-full transition-[width] duration-300', tone)"
        :style="{ width: `${pct}%` }"
      />
    </div>
  </div>
  <div
    v-else
    ref="el"
    role="meter"
    :aria-label="props.label"
    :aria-valuemin="0"
    :aria-valuemax="props.max"
    :aria-valuenow="props.value"
    :aria-valuetext="valueText"
    :aria-busy="props.isLoading || undefined"
    :data-zone="props.isLoading ? undefined : zone"
    v-bind="rest"
    :class="classes"
  >
    <div
      v-if="!props.isLoading"
      :class="cn('h-full rounded-full transition-[width] duration-300', tone)"
      :style="{ width: `${pct}%` }"
    />
  </div>
</template>
