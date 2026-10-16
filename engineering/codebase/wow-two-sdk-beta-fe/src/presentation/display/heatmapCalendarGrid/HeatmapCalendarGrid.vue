<script lang="ts">
import type { Temporal } from 'temporal-polyfill';

// HeatmapCalendarGrid is a date-only surface → its public API is keyed by
// `Temporal.PlainDate` (calendar math, no time zone). Internally the lookup is
// keyed by each date's ISO `.toString()` ("YYYY-MM-DD") so cell values resolve
// in O(1); no native `Date`/raw-string leaks into the API.

/** Defines the HeatmapCalendarGrid color ramp tone. */
export const HeatmapCalendarGridTone = {
  /** Refers to the primary brand ramp. */
  Brand: 'brand',
  /** Refers to the positive / confirmation ramp. */
  Success: 'success',
  /** Refers to the caution ramp. */
  Warning: 'warning',
  /** Refers to the destructive / error ramp. */
  Danger: 'danger',
  /** Refers to the muted ramp. */
  Muted: 'muted',
} as const;

export type HeatmapCalendarGridTone = (typeof HeatmapCalendarGridTone)[keyof typeof HeatmapCalendarGridTone];

const ToneClasses: Record<HeatmapCalendarGridTone, ReadonlyArray<string>> = {
  brand: ['bg-muted/50', 'bg-primary/20', 'bg-primary/40', 'bg-primary/70', 'bg-primary'],
  success: ['bg-muted/50', 'bg-success/20', 'bg-success/40', 'bg-success/70', 'bg-success'],
  warning: ['bg-muted/50', 'bg-warning/20', 'bg-warning/40', 'bg-warning/70', 'bg-warning'],
  danger: ['bg-muted/50', 'bg-destructive/20', 'bg-destructive/40', 'bg-destructive/70', 'bg-destructive'],
  muted: ['bg-muted/30', 'bg-muted', 'bg-muted-foreground/30', 'bg-muted-foreground/60', 'bg-muted-foreground'],
};

export interface HeatmapCalendarGridProps {
  /** The per-day counts, keyed by calendar date. */
  readonly values: Map<Temporal.PlainDate, number>;
  /** The rendered calendar year. Defaults to the current ISO year. */
  readonly year?: number;
  /** The first weekday of a column — `0` Sunday, `1` Monday. Default `0`. */
  readonly weekStart?: 0 | 1;
  /** The cell edge length in px. Default `12`. */
  readonly cellSize?: number;
  /** The gap between cells in px. Default `2`. */
  readonly gap?: number;
  /**
   * The intensity buckets (min 2, clamped). Default 5. Buckets map proportionally
   * onto the fixed 5-step tone palette, so buckets past 5 share palette classes.
   */
  readonly levels?: number;
  /** The color ramp tone. Default `brand`. */
  readonly tone?: HeatmapCalendarGridTone;
  /**
   * Fires with the clicked day and its value.
   *
   * Kept a prop rather than an emit because its *presence* is load-bearing — it
   * decides whether an in-year cell renders as a `<button>` or an inert `<div>`,
   * and Vue strips declared emit listeners out of `useAttrs()`.
   */
  readonly onCellClick?: (date: Temporal.PlainDate, value: number) => void;
  /** The 12 month labels, January first. */
  readonly monthLabels?: ReadonlyArray<string>;
  /** The 7 weekday labels, Sunday first. */
  readonly weekdayLabels?: ReadonlyArray<string>;
  /** The legend state. Default `true`. */
  readonly hasLegend?: boolean;
}

interface HeatmapCell {
  date: Temporal.PlainDate;
  key: string;
  inYear: boolean;
  value: number;
}

interface MonthMarker {
  month: number;
  col: number;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { Temporal as TemporalRuntime } from 'temporal-polyfill';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';

const locale = useLocale();

/**
 * Renders a year-long heatmap — 53 week columns x 7 weekday rows, tinted per day.
 *
 * Cell intensity comes from `values[YYYY-MM-DD]`, bucketed into `levels` steps.
 */
defineOptions({ name: 'HeatmapCalendarGrid', inheritAttrs: false });

const props = withDefaults(defineProps<HeatmapCalendarGridProps>(), {
  /* `values` stays declared-required — Vue still warns when it is missing — but a
     default keeps an absent (or transiently-undefined) value out of the `for...of`
     below, which threw `props.values is not iterable` and took the whole page down. */
  values: () => new Map<Temporal.PlainDate, number>(),
  // `year` stays undefined so the current-year fallback is evaluated lazily —
  // `withDefaults` would freeze a module-eval-time value into the options object.
  year: undefined,
  weekStart: 0,
  cellSize: 12,
  gap: 2,
  levels: 5,
  tone: 'brand',
  onCellClick: undefined,
  hasLegend: true,
});

const monthLabels = computed(
  () =>
    props.monthLabels ??
    Array.from({ length: 12 }, (_, i) =>
      TemporalRuntime.PlainDate.from({ year: 2024, month: i + 1, day: 1 }).toLocaleString(locale.locale.value, {
        month: 'short',
      }),
    ),
);
const weekdayLabels = computed(
  () =>
    props.weekdayLabels ??
    Array.from({ length: 7 }, (_, i) =>
      TemporalRuntime.PlainDate.from('2024-01-07')
        .add({ days: i })
        .toLocaleString(locale.locale.value, { weekday: 'short' }),
    ),
);

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const year = computed(() => props.year ?? TemporalRuntime.Now.plainDateISO().year);

// Re-key the PlainDate-keyed API onto ISO strings ("YYYY-MM-DD") for O(1)
// lookup during the grid walk (PlainDate is not usable as a Map identity key).
const valueMap = computed(() => {
  const map = new Map<string, number>();
  for (const [date, value] of props.values) map.set(date.toString(), value);
  return map;
});

const grid = computed(() => {
  const lookup = valueMap.value;
  const start = TemporalRuntime.PlainDate.from({ year: year.value, month: 1, day: 1 });
  const end = TemporalRuntime.PlainDate.from({ year: year.value, month: 12, day: 31 });
  // Walk back to first weekStart day before/at year start.
  // Temporal `dayOfWeek`: 1 (Mon) … 7 (Sun); map to a Sunday=0 index.
  const sundayIdx = start.dayOfWeek % 7;
  const offset = (sundayIdx - props.weekStart + 7) % 7;
  let cur = start.subtract({ days: offset });

  const cols: Array<Array<HeatmapCell>> = [];
  let column: Array<HeatmapCell> = [];
  const months: Array<MonthMarker> = [];
  let lastSeenMonth = -1;
  let max = 0;

  while (TemporalRuntime.PlainDate.compare(cur, end) <= 0 || column.length > 0) {
    const inYear = cur.year === year.value;
    const key = cur.toString();
    const value = lookup.get(key) ?? 0;
    if (value > max) max = value;
    column.push({ date: cur, key, inYear, value });

    // Temporal `month` is 1-indexed; keep the 0-indexed marker the labels expect.
    if (inYear && cur.month - 1 !== lastSeenMonth) {
      lastSeenMonth = cur.month - 1;
      months.push({ month: cur.month - 1, col: cols.length });
    }

    if (column.length === 7) {
      cols.push(column);
      column = [];
    }
    cur = cur.add({ days: 1 });
    if (TemporalRuntime.PlainDate.compare(cur, end) > 0 && column.length === 0) break;
  }
  if (column.length > 0) cols.push(column);
  return { columns: cols as ReadonlyArray<ReadonlyArray<HeatmapCell>>, monthMarkers: months, maxValue: max };
});

const toneSteps = computed(() => ToneClasses[props.tone]);

/* Clamp to ≥2 so the zero step plus at least one filled step always exist. */
const levelCount = computed(() => Math.max(2, Math.floor(props.levels)));

function bucket(value: number): number {
  const max = grid.value.maxValue;
  if (value <= 0 || max === 0) return 0;
  const idx = Math.ceil((value / max) * (levelCount.value - 1));
  return Math.min(levelCount.value - 1, idx);
}

/* The palette is a fixed 5-step ramp; map any bucket count onto it proportionally.
   0 → empty step, top bucket → full tone; a nonzero bucket never returns the empty step. */
function stepClass(level: number): string {
  const steps = toneSteps.value;
  if (level === 0) return steps[0]!;
  const idx = Math.round((level / (levelCount.value - 1)) * (steps.length - 1));
  return steps[Math.max(1, idx)]!;
}

const totalWidth = computed(() => grid.value.columns.length * (props.cellSize + props.gap));
const colHeight = computed(() => 7 * (props.cellSize + props.gap));

// Order weekdays from weekStart; the weekday number keys the row, since labels can repeat.
const weekdayOrder = computed(() =>
  Array.from({ length: 7 }, (_unused, i) => {
    const day = (i + props.weekStart) % 7;
    return { day, label: weekdayLabels.value[day]! };
  }),
);

/**
 * Per-cell render model. `attrs` carries only the bindings the cell actually
 * needs, so a non-interactive cell never gets a click listener.
 */
const renderColumns = computed(() =>
  grid.value.columns.map((col, colIdx) => ({
    key: colIdx,
    cells: col.map((cell) => {
      const isInteractive = cell.inYear && props.onCellClick != null;
      return {
        key: cell.key,
        tag: isInteractive ? 'button' : 'div',
        attrs: {
          type: isInteractive ? 'button' : undefined,
          // Value lives in the label; aria-value* is reserved for
          // range widgets and is invalid on button/generic cells.
          role: isInteractive ? undefined : 'img',
          [AriaAttribute.Label]: `${cell.key}: ${cell.value}`,
          onClick: isInteractive ? (): void => props.onCellClick?.(cell.date, cell.value) : undefined,
        },
        class: cn(
          'rounded-[2px] transition-colors',
          cell.inYear ? stepClass(bucket(cell.value)) : 'bg-transparent',
          isInteractive &&
            'cursor-pointer hover:ring-1 hover:ring-ring focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        ),
      };
    }),
  })),
);

/** Vue does not append `px` to a numeric `:style` value — every length is spelled out. */
const cellStyle = computed(() => ({
  width: `${props.cellSize}px`,
  height: `${props.cellSize}px`,
}));

const monthRowStyle = computed(() => ({
  height: `${props.cellSize}px`,
  width: `${totalWidth.value}px`,
}));

const gapStyle = computed(() => ({ gap: `${props.gap}px` }));

const weekdayColumnStyle = computed(() => ({
  width: '28px',
  gap: `${props.gap}px`,
  height: `${colHeight.value}px`,
}));

const weekdayLabelStyle = computed(() => ({
  height: `${props.cellSize}px`,
  lineHeight: `${props.cellSize}px`,
}));

function monthMarkerStyle(marker: MonthMarker): Record<string, string> {
  return { left: `${marker.col * (props.cellSize + props.gap)}px` };
}

const classes = computed(() => cn('inline-block', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <!-- Month labels -->
    <div class="relative ml-8" :style="monthRowStyle">
      <span
        v-for="marker in grid.monthMarkers"
        :key="marker.month"
        class="absolute text-[10px] uppercase text-muted-foreground"
        :style="monthMarkerStyle(marker)"
        >{{ monthLabels[marker.month] }}</span
      >
    </div>
    <div class="flex" :style="gapStyle">
      <!-- Weekday labels — show every other to avoid clutter. -->
      <div class="flex flex-col text-[10px] uppercase text-muted-foreground" :style="weekdayColumnStyle">
        <span
          v-for="(weekday, index) in weekdayOrder"
          :key="weekday.day"
          :class="index % 2 === 0 ? 'opacity-0' : ''"
          :style="weekdayLabelStyle"
          >{{ weekday.label }}</span
        >
      </div>
      <!-- Grid -->
      <div class="flex" :style="gapStyle">
        <div v-for="column in renderColumns" :key="column.key" class="flex flex-col" :style="gapStyle">
          <component
            :is="cell.tag"
            v-for="cell in column.cells"
            :key="cell.key"
            v-bind="cell.attrs"
            :style="cellStyle"
            :class="cell.class"
          />
        </div>
      </div>
    </div>
    <div v-if="hasLegend" class="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
      <span>{{ locale.t('HeatmapCalendarGrid.less', undefined, 'Less') }}</span>
      <span
        v-for="stepCls in toneSteps"
        :key="stepCls"
        aria-hidden="true"
        :style="cellStyle"
        :class="cn('rounded-[2px]', stepCls)"
      />
      <span>{{ locale.t('HeatmapCalendarGrid.more', undefined, 'More') }}</span>
    </div>
  </div>
</template>
