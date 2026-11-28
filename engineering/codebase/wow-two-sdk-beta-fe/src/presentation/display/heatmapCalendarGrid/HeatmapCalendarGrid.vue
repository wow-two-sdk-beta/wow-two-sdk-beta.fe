<script lang="ts">
import type { Temporal } from 'temporal-polyfill';
import { AriaAttribute, Key } from '../../../foundation/dom';

/** Defines the fill tone of a day. */
export const HeatmapCalendarGridTone = {
  /** Refers to the positive fill. */
  Success: 'success',
  /** Refers to the caution fill. */
  Warning: 'warning',
  /** Refers to the destructive fill. */
  Danger: 'danger',
} as const;

export type HeatmapCalendarGridTone = (typeof HeatmapCalendarGridTone)[keyof typeof HeatmapCalendarGridTone];

/** Defines the inner mark of a day, so colour is never the only signal. */
export const HeatmapCalendarGridMark = {
  /** Refers to a half-filled dot. */
  Half: 'half',
  /** Refers to a cross. */
  Cross: 'cross',
} as const;

export type HeatmapCalendarGridMark = (typeof HeatmapCalendarGridMark)[keyof typeof HeatmapCalendarGridMark];

/** Defines the fill steps of a day, from none (0) to full (4). */
export const HeatmapCalendarGridLevels = [0, 1, 2, 3, 4] as const;

export type HeatmapCalendarGridLevel = (typeof HeatmapCalendarGridLevels)[number];

/** Maps each tone to its fill class per level, level 0 first; a caller's key reads them so it never drifts. */
export const HeatmapCalendarGridFills: Readonly<Record<HeatmapCalendarGridTone, ReadonlyArray<string>>> = {
  success: ['bg-muted', 'bg-success/30', 'bg-success/55', 'bg-success/80', 'bg-success'],
  warning: ['bg-muted', 'bg-warning/35', 'bg-warning/60', 'bg-warning/85', 'bg-warning'],
  danger: ['bg-muted', 'bg-destructive/30', 'bg-destructive/55', 'bg-destructive/80', 'bg-destructive'],
};

/** Represents one day of the grid as the caller computed it. */
export interface HeatmapCalendarGridCell {
  /** The calendar day. */
  readonly date: Temporal.PlainDate;
  /** The fill tone; omitted, the day reads empty. */
  readonly tone?: HeatmapCalendarGridTone;
  /** The fill step, 0 to 4. Default 0, the empty fill whatever the tone. */
  readonly level?: HeatmapCalendarGridLevel;
  /** The inner mark drawn over the fill. */
  readonly mark?: HeatmapCalendarGridMark;
  /** The tone of the lower-right half, for a day split between two outcomes; it takes the day's level. */
  readonly split?: HeatmapCalendarGridTone;
  /** The tooltip text and the day's accessible name. */
  readonly label: string;
}

/** Defines props for the per-day activity calendar. */
export interface HeatmapCalendarGridProps {
  /** The days that carry activity; a range day without one draws empty, named by its date. */
  readonly cells: ReadonlyArray<HeatmapCalendarGridCell>;
  /** The first day drawn. Defaults to the day after the same date a year before `to`. */
  readonly from?: Temporal.PlainDate;
  /** The last day drawn. Defaults to `today`. */
  readonly to?: Temporal.PlainDate;
  /** The day that wears the today ring. Defaults to the current ISO date in the runtime's time zone. */
  readonly today?: Temporal.PlainDate;
  /** The chosen day, controlled; `null` chooses none. Omitted, the grid keeps its own choice. */
  readonly selected?: Temporal.PlainDate | null;
  /** The live state: today's ring pulses, and holds still under reduced motion. */
  readonly isLive?: boolean;
  /** The first weekday of a column — `0` Sunday, `1` Monday. Default `1`. */
  readonly weekStart?: 0 | 1;
  /** The 12 month labels, January first. Defaults to the locale's short month names. */
  readonly monthLabels?: ReadonlyArray<string>;
  /** The 7 weekday labels, Sunday first. Defaults to the locale's short weekday names. */
  readonly weekdayLabels?: ReadonlyArray<string>;
}

/** @internal The fill of a day with no tone or no level. */
const EmptyFill = 'bg-muted';

/** @internal The mark colour on a faint fill, in either theme. */
const FaintMark = 'text-foreground/65';

/** @internal The mark colour per tone on a strong fill (levels 3-4) and on the middle fill (level 2). */
const MarkColours: Readonly<Record<HeatmapCalendarGridTone, readonly [string, string]>> = {
  success: ['text-success-foreground/90', 'text-foreground/65 dark:text-success-foreground/90'],
  warning: ['text-warning-foreground/90', 'text-foreground/65 dark:text-warning-foreground/90'],
  danger: ['text-destructive-foreground/90', 'text-foreground/65 dark:text-destructive-foreground/90'],
};

/** @internal The days an arrow key moves the focus, left to right: a week per column, a day per row. */
const ArrowSteps: Readonly<Record<string, number>> = {
  [Key.ArrowLeft]: -7,
  [Key.ArrowRight]: 7,
  [Key.ArrowUp]: -1,
  [Key.ArrowDown]: 1,
};

/** @internal The pointer type of a finger. */
const TouchPointer = 'touch';

/** @internal One drawn day. */
interface GridDay {
  readonly key: string;
  readonly date: Temporal.PlainDate;
  readonly column: number;
  readonly row: number;
  readonly label: string;
  readonly fill: string;
  readonly split: string | undefined;
  readonly mark: HeatmapCalendarGridMark | undefined;
  readonly markColour: string;
}

/** @internal A month label and the columns it spans. */
interface MonthMarker {
  readonly key: string;
  readonly month: number;
  readonly column: number;
  readonly span: number;
}

/** @internal The day the shared tooltip describes, and the cell it points at. */
interface Hint {
  readonly key: string;
  readonly label: string;
  readonly anchor: HTMLElement;
}
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useAttrs, useTemplateRef, watch } from 'vue';
import { Temporal as TemporalRuntime } from 'temporal-polyfill';
import { useLocale, useLocaleFormatters } from '../../../foundation/i18n';
import { AnchoredPositioner, Direction, Portal, useDirection } from '../../../foundation/primitives';
import { useEscape } from '../../../foundation/shortcuts';
import { useControlled } from '../../../foundation/state';
import { CoarseHitArea, cn } from '../../../foundation/styles';

/**
 * Renders per-day activity as week columns over weekday rows, month labels above, one button per day.
 * Every day's tone, level, mark, split and label come from `cells`; the grid holds no rule of its own.
 */
defineOptions({ name: 'HeatmapCalendarGrid', inheritAttrs: false });

const props = withDefaults(defineProps<HeatmapCalendarGridProps>(), {
  /* `cells` stays declared-required, so Vue still warns when it is missing, but an absent value draws the empty
     range rather than throwing in the walk below. */
  cells: () => [],
  from: undefined,
  to: undefined,
  today: undefined,
  selected: undefined,
  isLive: false,
  weekStart: 1,
  monthLabels: undefined,
  weekdayLabels: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader toggles a day: that day, or `null` when it was already the chosen one. */
  select: [date: Temporal.PlainDate | null];
}>();

const attrs = useAttrs();
const locale = useLocale();
const formatters = useLocaleFormatters();
const direction = useDirection();
const el = useTemplateRef<HTMLDivElement>('el');
const scroller = useTemplateRef<HTMLDivElement>('scroller');

const { value: selected, setValue: setSelected } = useControlled<Temporal.PlainDate | null>({
  controlled: () => props.selected,
  default: null,
  onChange: (next) => emit('select', next),
});

/** The day that holds the tab stop once the reader moved it. */
const activeKey = shallowRef<string | null>(null);

/** The shared tooltip, while a day shows it. */
const hint = shallowRef<Hint | null>(null);

/** The pointer type of the last press on a day, so a tap can show the day's label. */
let pressedPointer = '';

/** The day that wears the today ring. */
const todayDate = computed(() => props.today ?? TemporalRuntime.Now.plainDateISO());

/** The drawn range, first day to last, in order whichever way round the props came. */
const range = computed(() => {
  const last = props.to ?? todayDate.value;
  const first = props.from ?? last.subtract({ years: 1 }).add({ days: 1 });
  return TemporalRuntime.PlainDate.compare(first, last) <= 0 ? { first, last } : { first: last, last: first };
});

/** The caller's cells by ISO date; a later cell for the same day wins. */
const cellByDay = computed(() => {
  const map = new Map<string, HeatmapCalendarGridCell>();
  for (const cell of props.cells) map.set(cell.date.toString(), cell);
  return map;
});

/** The days, the week count and the month labels; a label too close to the next one gives way to it. */
const layout = computed(() => {
  const { first, last } = range.value;
  const lookup = cellByDay.value;
  // Temporal `dayOfWeek` runs Monday 1 to Sunday 7; `% 7` makes it Sunday 0.
  const offset = ((first.dayOfWeek % 7) - props.weekStart + 7) % 7;
  const days: Array<GridDay> = [];
  const markers: Array<{ month: number; column: number }> = [];
  let index = offset;
  for (let date = first; TemporalRuntime.PlainDate.compare(date, last) <= 0; date = date.add({ days: 1 })) {
    const column = Math.floor(index / 7);
    const isMonthStart = date.day === 1 || days.length === 0;
    if (isMonthStart && !markers.some((marker) => marker.column === column))
      markers.push({ month: date.month, column });
    days.push(drawDay(date, column, index % 7, lookup.get(date.toString())));
    index += 1;
  }
  const weeks = Math.floor((index - 1) / 7) + 1;
  const months: Array<MonthMarker> = markers
    .filter((marker, at) => (markers[at + 1]?.column ?? Infinity) - marker.column >= 3)
    .map((marker) => ({
      ...marker,
      key: `${marker.month}-${marker.column}`,
      span: Math.max(1, Math.min(3, weeks - marker.column)),
    }));
  return { days, weeks, months };
});

/** The 12 month labels, January first. */
const monthNames = computed(
  () => props.monthLabels ?? Array.from({ length: 12 }, (_unused, at) => formatters.value.monthName(at + 1, 'short')),
);

/** The weekday labels, top row first; every other row stays blank to avoid clutter. */
const weekdayRows = computed(() =>
  Array.from({ length: 7 }, (_unused, row) => {
    const day = (row + props.weekStart) % 7;
    const label = props.weekdayLabels?.[day] ?? formatters.value.weekdayName(day === 0 ? 7 : day, 'short');
    return { day, row, label: row % 2 === 0 ? label : '' };
  }),
);

/** The chosen day as an ISO date. */
const selectedKey = computed(() => selected.value?.toString() ?? null);

/** Today as an ISO date. */
const todayKey = computed(() => todayDate.value.toString());

/** The day that holds the tab stop: the moved-to day, else the chosen day, else today, else the last day. */
const tabStopKey = computed(() => {
  const first = range.value.first.toString();
  const last = range.value.last.toString();
  const isWithin = (key: string | null): key is string => key !== null && key >= first && key <= last;
  const wanted = activeKey.value ?? selectedKey.value ?? (isWithin(todayKey.value) ? todayKey.value : last);
  return isWithin(wanted) ? wanted : last;
});

/** The group's accessible name: the caller's `aria-label`, else the localized range. */
const groupLabel = computed(
  () =>
    (attrs[AriaAttribute.Label] as string | undefined) ??
    locale.t(
      'HeatmapCalendarGrid.label',
      { from: rangeDate(range.value.first), to: rangeDate(range.value.last) },
      'Activity per day, {from} to {to}',
    ),
);

/** The grid tracks: the weekday column, then one column per week. */
const gridStyle = computed(() => ({
  gridTemplateColumns: `1.75rem repeat(${layout.value.weeks}, var(--heatmap-cell))`,
  gridTemplateRows: 'auto repeat(7, var(--heatmap-cell))',
}));

const classes = computed(() => cn('relative w-max max-w-full min-w-0', attrs.class as string | undefined));

/** Everything but `class` and `aria-label`, which land on the root's classes and on the group. */
const rest = computed(() => {
  const { class: _class, [AriaAttribute.Label]: _label, ...others } = attrs;
  return others;
});

/** Scrolls the newest week into view whenever the range gains or loses weeks. */
watch(() => layout.value.weeks, scrollToNewest, { flush: 'post' });

/** Hides the tooltip on a press outside the grid — on a touch screen a tap elsewhere moves no focus. */
watch(
  () => hint.value !== null,
  (isShown, _wasShown, onCleanup) => {
    const page = el.value?.ownerDocument;
    if (!isShown || !page) return;
    const onPress = (event: PointerEvent): void => {
      if (!el.value?.contains(event.target as Node | null)) hide();
    };
    page.addEventListener('pointerdown', onPress, true);
    onCleanup(() => page.removeEventListener('pointerdown', onPress, true));
  },
);

/* Escape hides the tooltip without moving focus. */
useEscape(hide, () => hint.value !== null);

onMounted(scrollToNewest);

/** Formats a day for the range label. */
function rangeDate(date: Temporal.PlainDate): string {
  return formatters.value.date(Date.UTC(date.year, date.month - 1, date.day), { dateStyle: 'medium', timeZone: 'UTC' });
}

/** Formats a day for the label of a day the caller left out. */
function dayName(date: Temporal.PlainDate): string {
  return formatters.value.date(Date.UTC(date.year, date.month - 1, date.day), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Resolves a day's drawing from its cell. */
function drawDay(
  date: Temporal.PlainDate,
  column: number,
  row: number,
  cell: HeatmapCalendarGridCell | undefined,
): GridDay {
  const level = cell?.level ?? 0;
  const tone = cell?.tone;
  return {
    key: date.toString(),
    date,
    column,
    row,
    label: cell?.label ?? dayName(date),
    fill: (tone && HeatmapCalendarGridFills[tone][level]) || EmptyFill,
    split: cell?.split ? (HeatmapCalendarGridFills[cell.split][level] ?? EmptyFill) : undefined,
    mark: cell?.mark,
    markColour: markColour(tone, level),
  };
}

/** Resolves a mark colour readable on its fill in either theme. */
function markColour(tone: HeatmapCalendarGridTone | undefined, level: number): string {
  if (!tone || level <= 1) return FaintMark;
  const [strong, middle] = MarkColours[tone];
  return level >= 3 ? strong : middle;
}

/** Scrolls the grid sideways to its newest week. */
function scrollToNewest(): void {
  const element = scroller.value;
  if (!element) return;
  element.scrollLeft = direction.value === Direction.Rtl ? -element.scrollWidth : element.scrollWidth;
}

/** Shows the shared tooltip at a day's cell. */
function show(event: Event, day: GridDay): void {
  const anchor = event.currentTarget as HTMLElement | null;
  if (anchor) hint.value = { key: day.key, label: day.label, anchor };
}

/** Hides the shared tooltip. */
function hide(): void {
  hint.value = null;
}

/** Shows a day's tooltip under a hovering pointer; a finger shows it by tapping instead. */
function enter(event: PointerEvent, day: GridDay): void {
  if (event.pointerType !== TouchPointer) show(event, day);
}

/** Hides the tooltip when a hovering pointer leaves; a finger leaves at the end of every tap. */
function leave(event: PointerEvent): void {
  if (event.pointerType !== TouchPointer) hide();
}

/** Records the pointer that pressed a day. */
function press(event: PointerEvent): void {
  pressedPointer = event.pointerType;
}

/** Toggles a day, moves the tab stop to it, and shows its label after a tap. */
function choose(event: MouseEvent, day: GridDay): void {
  activeKey.value = day.key;
  setSelected(selectedKey.value === day.key ? null : day.date);
  if (pressedPointer === TouchPointer) show(event, day);
  pressedPointer = '';
}

/** Resolves the day an arrow key moves to; left and right swap under a right-to-left direction. */
function stepped(date: Temporal.PlainDate, key: string): Temporal.PlainDate | null {
  const step = ArrowSteps[key];
  if (step === undefined) return null;
  const isMirrored = direction.value === Direction.Rtl && Math.abs(step) === 7;
  return date.add({ days: isMirrored ? -step : step });
}

/** Moves the tab stop and the focus by arrow keys, Home and End, inside the range. */
async function move(event: KeyboardEvent, day: GridDay): Promise<void> {
  const { first, last } = range.value;
  const next = event.key === Key.Home ? first : event.key === Key.End ? last : stepped(day.date, event.key);
  if (!next) return;
  event.preventDefault();
  if (TemporalRuntime.PlainDate.compare(next, first) < 0 || TemporalRuntime.PlainDate.compare(next, last) > 0) return;
  activeKey.value = next.toString();
  await nextTick();
  const target = el.value?.querySelector<HTMLElement>(`[data-date="${activeKey.value}"]`);
  target?.focus();
  target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <div ref="scroller" class="overflow-x-auto overscroll-x-contain pb-1" tabindex="-1">
      <!-- 22px cells with 3px gaps below md, 20px with 4px gaps from md; a finger's reach grows by half a gap. -->
      <div
        role="group"
        :aria-label="groupLabel"
        class="grid w-max gap-[3px] p-1.5 [--coarse-hit-gap:3px] [--heatmap-cell:1.375rem] md:gap-1 md:[--coarse-hit-gap:4px] md:[--heatmap-cell:1.25rem]"
        :style="gridStyle"
      >
        <span
          v-for="month in layout.months"
          :key="month.key"
          aria-hidden="true"
          class="row-start-1 overflow-visible text-[0.6875rem] whitespace-nowrap text-muted-foreground"
          :style="{ gridColumn: `${month.column + 2} / span ${month.span}` }"
          >{{ monthNames[month.month - 1] }}</span
        >
        <span
          v-for="weekday in weekdayRows"
          :key="weekday.day"
          aria-hidden="true"
          class="sticky start-0 z-[1] col-start-1 flex items-center bg-card pe-1 text-[0.6875rem] text-muted-foreground"
          :style="{ gridRow: weekday.row + 2 }"
          >{{ weekday.label }}</span
        >
        <button
          v-for="day in layout.days"
          :key="day.key"
          type="button"
          :data-date="day.key"
          :tabindex="day.key === tabStopKey ? 0 : -1"
          :aria-label="day.label"
          :aria-pressed="day.key === selectedKey"
          :aria-current="day.key === todayKey ? 'date' : undefined"
          class="relative flex size-(--heatmap-cell) items-center justify-center rounded-[3px] transition-[outline-color] forced-colors:forced-color-adjust-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          :class="[
            day.fill,
            day.key === selectedKey && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
            CoarseHitArea.After,
          ]"
          :style="{ gridColumn: day.column + 2, gridRow: day.row + 2 }"
          @pointerenter="enter($event, day)"
          @pointerleave="leave"
          @pointerdown="press"
          @click="choose($event, day)"
          @keydown="move($event, day)"
          @focus="show($event, day)"
          @blur="hide"
        >
          <span
            v-if="day.split"
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 rounded-[3px] [clip-path:polygon(100%_0,100%_100%,0_100%)]"
            :class="day.split"
          />
          <svg
            v-if="day.mark === 'cross'"
            viewBox="0 0 8 8"
            aria-hidden="true"
            data-mark="cross"
            class="relative size-2"
            :class="day.markColour"
          >
            <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <svg
            v-else-if="day.mark === 'half'"
            viewBox="0 0 8 8"
            aria-hidden="true"
            data-mark="half"
            class="relative size-2"
            :class="day.markColour"
          >
            <circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" stroke-width="1.2" />
            <path d="M4 1a3 3 0 0 1 0 6z" fill="currentColor" />
          </svg>
          <template v-if="day.key === todayKey">
            <span
              v-if="day.key === selectedKey"
              aria-hidden="true"
              data-today="dot"
              class="pointer-events-none absolute -end-1 -top-1 size-[7px] rounded-full bg-foreground shadow-[0_0_0_1.5px_var(--color-card)]"
              :class="isLive && 'motion-safe:animate-pulse'"
            />
            <span
              v-else
              aria-hidden="true"
              data-today="ring"
              class="pointer-events-none absolute inset-0 rounded-[3px] outline-[1.5px] outline-offset-[1.5px] outline-dashed outline-muted-foreground"
              :class="isLive && 'motion-safe:animate-pulse'"
            />
          </template>
        </button>
      </div>
    </div>
    <Portal v-if="hint">
      <!-- One tooltip for every day, in the top layer, flipped and shifted to stay inside the viewport. -->
      <AnchoredPositioner :anchor="hint.anchor" placement="top" :offset="6" class="pointer-events-none z-tooltip">
        <div
          role="tooltip"
          class="max-w-[calc(100vw-1rem)] rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow-md"
        >
          {{ hint.label }}
        </div>
      </AnchoredPositioner>
    </Portal>
  </div>
</template>
