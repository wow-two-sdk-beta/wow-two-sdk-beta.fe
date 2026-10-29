<script lang="ts">
/** Defines the Sparkline render style. */
export const SparklineVariant = {
  /** Refers to a connected line. */
  Line: 'line',
  /** Refers to a filled area under the line. */
  Area: 'area',
  /** Refers to vertical bars. */
  Bar: 'bar',
  /** Refers to discrete dots. */
  Dot: 'dot',
} as const;

export type SparklineVariant = (typeof SparklineVariant)[keyof typeof SparklineVariant];

/** Defines the Sparkline color tone. */
export const SparklineTone = {
  /** Refers to the primary brand color. */
  Brand: 'brand',
  /** Refers to the positive / confirmation color. */
  Success: 'success',
  /** Refers to the caution color. */
  Warning: 'warning',
  /** Refers to the destructive / error color. */
  Danger: 'danger',
  /** Refers to the muted color. */
  Muted: 'muted',
  /** Refers to the inherited `currentColor`. */
  Current: 'current',
} as const;

export type SparklineTone = (typeof SparklineTone)[keyof typeof SparklineTone];

/** Defines one reading of a time-based series. */
export interface SparklinePoint {
  /** The reading's instant, in epoch milliseconds. */
  readonly at: number;

  /** The reading's value. */
  readonly value: number;
}

/** Defines a horizontal reference line — a warning or danger level. */
export interface SparklineThreshold {
  /** The level, on the same scale as the series. */
  readonly value: number;

  /** The line's color tone. Default `muted`. */
  readonly tone?: SparklineTone;
}

export interface SparklineProps {
  /** The series to plot, evenly spaced in order. Ignored when `points` is set. */
  readonly data?: ReadonlyArray<number>;

  /**
   * The time-based series, oldest first — each reading placed by its instant inside `since`…`until`, so a short history
   * sits at the right end instead of stretching across the chart.
   */
  readonly points?: ReadonlyArray<SparklinePoint>;

  /** The time window's start, in epoch milliseconds. Defaults to the first point's instant. */
  readonly since?: number;

  /** The time window's end, in epoch milliseconds. Defaults to the last point's instant. */
  readonly until?: number;

  /** The reference lines drawn dashed across the chart — levels on the series' scale. */
  readonly thresholds?: ReadonlyArray<SparklineThreshold>;

  /** The render style. Default `line`. */
  readonly variant?: SparklineVariant;

  /** The px width of the viewBox. Default `120`. */
  readonly width?: number;

  /** The px height of the viewBox. Default `32`. */
  readonly height?: number;

  /** The color tone. Default `brand`. */
  readonly tone?: SparklineTone;

  /** The lower bound of the value scale. Defaults to the series minimum. */
  readonly min?: number;

  /** The upper bound of the value scale. Defaults to the series maximum. */
  readonly max?: number;

  /** The emphasized dot on the final point. */
  readonly hasLast?: boolean;

  /** The accessible label summarizing the trend. */
  readonly ariaLabel?: string;

  /** Keeps the chart's size and draws it as one placeholder; defaults to the nearest `DataRegion` first load. */
  readonly isSkeleton?: boolean;
}

/** The derived plot geometry — React's `useMemo` payload. */
interface SparklineGeometry {
  points: ReadonlyArray<readonly [number, number]>;
  levels: ReadonlyArray<{ readonly y: number; readonly tone: SparklineTone }>;
  barWidth: number;
  barRenderWidth: number;
  lastX: number;
  lastY: number;
  areaPath: string;
  linePath: string;
}

const EmptyGeometry: SparklineGeometry = {
  points: [],
  levels: [],
  barWidth: 0,
  barRenderWidth: 0,
  lastX: 0,
  lastY: 0,
  areaPath: '',
  linePath: '',
};

const ToneClass: Record<SparklineTone, string> = {
  brand: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
  current: '',
};
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useId } from '../../../foundation/identifiers';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';

/**
 * Renders an inline trend chart — line, area, bar, or dot — as bare SVG with no scales or axes; evenly spaced from
 * `data`, or placed by time from `points`, with optional dashed threshold lines.
 *
 * Colour comes from Tailwind `text-*` tokens; pair with `currentColor` for parent inheritance.
 */
defineOptions({ name: 'Sparkline', inheritAttrs: false });

const componentProps = withDefaults(defineProps<SparklineProps>(), {
  data: () => [],
  points: undefined,
  since: undefined,
  until: undefined,
  thresholds: () => [],
  variant: 'line',
  width: 120,
  height: 32,
  tone: 'brand',
  min: undefined,
  max: undefined,
  hasLast: undefined,
  isSkeleton: undefined,
});
const props = useLocaleDefaults(componentProps, 'Sparkline', { ariaLabel: 'Trend' });

/* The chart keeps its width and height; the series hides and the box itself becomes the placeholder. */
const skeleton = useSkeletonState(() => componentProps.isSkeleton);

const attrs = useAttrs();
const el = useTemplateRef<SVGSVGElement>('el');
const titleId = useId();

/** The values in order, with each one's x: evenly spaced for `data`, by instant inside the window for `points`. */
const series = computed<ReadonlyArray<readonly [number, number]>>(() => {
  const { width } = props;
  const timed = props.points;
  if (timed) {
    if (timed.length === 0) return [];
    const since = props.since ?? timed[0]!.at;
    const until = props.until ?? timed[timed.length - 1]!.at;
    const span = until - since;
    return timed.map((point) => [span > 0 ? ((point.at - since) / span) * width : width, point.value] as const);
  }
  const data = props.data;
  const stepX = data.length === 1 ? 0 : width / (data.length - 1);
  return data.map((value, index) => [index * stepX, value] as const);
});

const geometry = computed<SparklineGeometry>(() => {
  const { width, height } = props;
  const values = series.value;
  if (values.length === 0) return EmptyGeometry;

  let seriesMin = Number.POSITIVE_INFINITY;
  let seriesMax = Number.NEGATIVE_INFINITY;
  if (props.min === undefined || props.max === undefined) {
    for (const [, value] of values) {
      seriesMin = Math.min(seriesMin, value);
      seriesMax = Math.max(seriesMax, value);
    }
  }
  const min = props.min ?? seriesMin;
  const max = props.max ?? seriesMax;
  const range = max - min || 1;
  const pad = 1; // keep stroke inside the box
  const toY = (value: number): number => height - ((value - min) / range) * (height - pad * 2) - pad;

  const points = values.map(([x, value]) => [x, toY(value)] as const);
  const levels = props.thresholds.map((level) => ({ y: toY(level.value), tone: level.tone ?? 'muted' }));

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return EmptyGeometry;

  const linePath = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const areaPath = `${linePath} L${last[0]},${height} L${first[0]},${height} Z`;
  const barWidth = width / values.length - 1;

  return {
    points,
    levels,
    barWidth,
    barRenderWidth: Math.max(1, barWidth),
    lastX: last[0],
    lastY: last[1],
    areaPath,
    linePath,
  };
});

const showLast = computed(() => Boolean(props.hasLast) && series.value.length > 0 && props.variant !== 'dot');

const classes = computed(() =>
  cn(
    'inline-block overflow-visible',
    ToneClass[props.tone],
    attrs.class as string | undefined,
    skeleton.paintClass.value,
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
  <svg
    ref="el"
    role="img"
    :aria-labelledby="titleId"
    :width="props.width"
    :height="props.height"
    :viewBox="`0 0 ${props.width} ${props.height}`"
    preserveAspectRatio="none"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :aria-hidden="skeleton.isSkeleton.value || undefined"
    v-bind="rest"
    :class="classes"
  >
    <template v-if="!skeleton.isSkeleton.value">
      <title :id="titleId">{{ props.ariaLabel }}</title>

      <template v-if="props.variant === 'area'">
        <path :d="geometry.areaPath" fill="currentColor" fill-opacity="0.15" />
        <path
          :d="geometry.linePath"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
      </template>

      <line
        v-for="(level, i) in geometry.levels"
        :key="`level-${i}`"
        data-threshold
        x1="0"
        :x2="props.width"
        :y1="level.y"
        :y2="level.y"
        :class="ToneClass[level.tone]"
        stroke="currentColor"
        stroke-dasharray="3 3"
        stroke-width="0.75"
        stroke-opacity="0.6"
        vector-effect="non-scaling-stroke"
      />

      <path
        v-if="props.variant === 'line'"
        :d="geometry.linePath"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />

      <g v-if="props.variant === 'bar'">
        <rect
          v-for="(point, i) in geometry.points"
          :key="i"
          :x="point[0] - geometry.barWidth / 2"
          :y="point[1]"
          :width="geometry.barRenderWidth"
          :height="props.height - point[1]"
          fill="currentColor"
          rx="1"
        />
      </g>

      <g v-if="props.variant === 'dot'">
        <circle
          v-for="(point, i) in geometry.points"
          :key="i"
          :cx="point[0]"
          :cy="point[1]"
          r="1.5"
          fill="currentColor"
        />
      </g>

      <circle v-if="showLast" :cx="geometry.lastX" :cy="geometry.lastY" r="2.5" fill="currentColor" />
    </template>
  </svg>
</template>
