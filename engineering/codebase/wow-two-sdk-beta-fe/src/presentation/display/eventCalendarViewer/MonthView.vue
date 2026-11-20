<script lang="ts">
import type { Temporal } from 'temporal-polyfill';
import type { EventCalendarViewerEvent } from './EventCalendarViewerTypes';

export interface MonthViewProps {
  readonly focusDay: Temporal.PlainDate;
  readonly timeZone: string;
  readonly events: ReadonlyArray<EventCalendarViewerEvent>;
  readonly weekStart: 0 | 1;
}

interface MonthCell {
  day: Temporal.PlainDate;
  outOfMonth: boolean;
}

/** One multi-day event's slice of one week row. */
interface BarSegment {
  event: EventCalendarViewerEvent;
  key: string;
  /** Zero-based column of the segment's first day. */
  column: number;
  /** The days the segment covers in this row. */
  span: number;
  /** Zero-based lane, stacked from the top of the row. */
  lane: number;
  /** The event's own first day sits in this row, so the bar starts rounded. */
  isStart: boolean;
  /** The event's own last day sits in this row, so the bar ends rounded. */
  isEnd: boolean;
  label: string;
}

interface DayColumn {
  day: Temporal.PlainDate;
  /** The single-day events that fit under the bars. */
  events: ReadonlyArray<EventCalendarViewerEvent>;
  /** What the day holds beyond what is drawn: hidden bars and single-day events together. */
  moreCount: number;
}

interface WeekRow {
  key: string;
  cells: ReadonlyArray<MonthCell>;
  /** The bars that fit; each sits in its own lane of the row. */
  bars: ReadonlyArray<BarSegment>;
  /** The lane rows drawn above the single-day events. */
  laneCount: number;
  columns: ReadonlyArray<DayColumn>;
}

/** The most items a day cell draws — bar lanes and single-day events together. Anything past it is "+N more". */
const MaxSlots = 4;

/** The week rows of a month grid. */
const WeekCount = 6;
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, type StyleValue } from 'vue';
import { Temporal as TemporalValue } from 'temporal-polyfill';
import { cn } from '../../../foundation/styles';
import { readableForeground } from '../../../foundation/themes';
import { daysBetween, formatZonedTime, isToday } from '../../forms/DateExtensions';
import { startOfWeek } from './EventCalendarViewerTypes';
import { intersectsCalendarDay } from './EventCalendarViewerLayout';

const locale = useLocale();

/** Renders the month grid of an `EventCalendarViewer`. Internal — never exported from the folder. */
defineOptions({ name: 'MonthView' });

const props = defineProps<MonthViewProps>();

const emit = defineEmits<{
  /** Fires when an event block is clicked. */
  'event-click': [event: EventCalendarViewerEvent];
  /** Fires when an empty day cell's date button is clicked. */
  'slot-click': [day: Temporal.PlainDate, hour?: number];
}>();

/** Reorder weekdays per weekStart. */
const weekdayHeaders = computed(() =>
  Array.from({ length: 7 }, (_, i) =>
    startOfWeek(props.focusDay, props.weekStart)
      .add({ days: i })
      .toLocaleString(locale.locale.value, { weekday: 'short' }),
  ),
);

/* Build a 42-cell grid whose first column matches weekStart so dates land
   under the right headers (buildMonthGrid is Sunday-anchored, so build here). */
const cells = computed<Array<MonthCell>>(() => {
  const month = props.focusDay.month;
  const first = props.focusDay.with({ day: 1 });
  const gridStart = startOfWeek(first, props.weekStart);
  return Array.from({ length: 42 }, (_, i) => {
    const day = gridStart.add({ days: i });
    return { day, outOfMonth: day.month !== month };
  });
});

/* The first and last calendar day an event touches in the displayed zone, by the shared boundary rule: the end
   instant is exclusive, so an event ending at midnight leaves that day. A reversed interval touches nothing. */
function spanOf(event: EventCalendarViewerEvent): { first: Temporal.PlainDate; last: Temporal.PlainDate } | null {
  if (TemporalValue.ZonedDateTime.compare(event.end, event.start) < 0) return null;
  const first = event.start.withTimeZone(props.timeZone).toPlainDate();
  const endDay = event.end.withTimeZone(props.timeZone).toPlainDate();
  const last = intersectsCalendarDay(event, endDay, props.timeZone) ? endDay : endDay.subtract({ days: 1 });
  return { first, last: TemporalValue.PlainDate.compare(last, first) < 0 ? first : last };
}

function dateLabel(day: Temporal.PlainDate): string {
  return day.toLocaleString(locale.locale.value, { year: 'numeric', month: 'short', day: 'numeric' });
}

function barLabel(event: EventCalendarViewerEvent, first: Temporal.PlainDate, last: Temporal.PlainDate): string {
  /* A numeric title falls back to the id, so the accessible name is always a string. */
  return locale.t(
    'MonthView.eventRange',
    { title: String(event.title ?? event.id), start: dateLabel(first), end: dateLabel(last) },
    '{title}, {start} – {end}',
  );
}

/* An event spanning more than one day draws as one bar per week row it touches; the rest draw as chips in their
   day. Bars take the lowest free lane, in order of first day (longer first), so none overlap in a row. Lanes then
   chips share the day cell's `MaxSlots`: what does not fit, bars included, counts into "+N more". */
const weeks = computed<ReadonlyArray<WeekRow>>(() => {
  const compare = TemporalValue.PlainDate.compare;
  const bars: Array<{ event: EventCalendarViewerEvent; first: Temporal.PlainDate; last: Temporal.PlainDate }> = [];
  const singles = new Map<string, Array<EventCalendarViewerEvent>>();
  for (const event of props.events) {
    const span = spanOf(event);
    if (!span) continue;
    if (compare(span.first, span.last) < 0) {
      bars.push({ event, ...span });
      continue;
    }
    const key = span.first.toString();
    const list = singles.get(key);
    if (list) list.push(event);
    else singles.set(key, [event]);
  }
  bars.sort((a, b) => compare(a.first, b.first) || compare(b.last, a.last));

  return Array.from({ length: WeekCount }, (_, row): WeekRow => {
    const rowCells = cells.value.slice(row * 7, row * 7 + 7);
    const rowStart = rowCells[0]!.day;
    const rowEnd = rowCells[6]!.day;
    const laneEnds: Array<number> = [];
    const segments: Array<BarSegment> = [];
    for (const { event, first, last } of bars) {
      if (compare(last, rowStart) < 0 || compare(first, rowEnd) > 0) continue;
      const from = compare(first, rowStart) < 0 ? rowStart : first;
      const to = compare(last, rowEnd) > 0 ? rowEnd : last;
      const column = daysBetween(rowStart, from);
      const end = daysBetween(rowStart, to);
      const free = laneEnds.findIndex((laneEnd) => laneEnd < column);
      const lane = free < 0 ? laneEnds.length : free;
      laneEnds[lane] = end;
      segments.push({
        event,
        key: `${event.id}-${rowStart.toString()}`,
        column,
        span: end - column + 1,
        lane,
        isStart: compare(first, rowStart) >= 0,
        isEnd: compare(last, rowEnd) <= 0,
        label: barLabel(event, first, last),
      });
    }
    const laneCount = Math.min(laneEnds.length, MaxSlots);
    const drawn = segments.filter((segment) => segment.lane < laneCount);
    const columns = rowCells.map((cell, index): DayColumn => {
      const day = singles.get(cell.day.toString()) ?? [];
      const events = day.slice(0, MaxSlots - laneCount);
      const covering = segments.filter((segment) => segment.column <= index && index < segment.column + segment.span);
      const shown = events.length + covering.filter((segment) => segment.lane < laneCount).length;
      return { day: cell.day, events, moreCount: day.length + covering.length - shown };
    });
    return { key: rowStart.toString(), cells: rowCells, bars: drawn, laneCount, columns };
  });
});

function cellClass(cell: MonthCell): string {
  return cn(
    'border-b border-r border-border',
    cell.outOfMonth && 'bg-muted/20',
    isToday(cell.day) && 'bg-primary-soft/20',
  );
}

function dateButtonClass(cell: MonthCell): string {
  return cn(
    'mx-1 mb-1 mt-1 self-start justify-self-start rounded-sm px-1 text-xs tabular-nums transition-colors',
    cell.outOfMonth ? 'text-muted-foreground' : 'text-foreground',
    isToday(cell.day) && 'bg-primary text-primary-foreground',
    'hover:bg-muted',
  );
}

function eventClass(e: EventCalendarViewerEvent): string {
  return cn(
    'truncate rounded-sm px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors hover:brightness-95',
    !e.color && 'bg-primary-soft text-primary-soft-foreground',
  );
}

/* A consumer-colored chip gets the text pole that reads on its color; a theme-colored one keeps the soft tokens. */
function eventStyle(e: EventCalendarViewerEvent): StyleValue {
  return { background: e.color, color: readableForeground(e.color) ?? undefined };
}

/* Logical corners, so a right-to-left grid rounds the bar's real first and last day. A segment that runs past the
   row's edge stays square and flush with the cell border — the continuation edge. */
function barClass(bar: BarSegment): string {
  return cn(
    'mb-0.5 min-w-0 truncate py-0.5 text-left text-[11px] font-medium transition-colors hover:brightness-95',
    'px-1.5',
    !bar.event.color && 'bg-primary-soft text-primary-soft-foreground',
    bar.isStart ? 'ms-0.5 rounded-s-sm' : 'rounded-s-none',
    bar.isEnd ? 'me-0.5 rounded-e-sm' : 'rounded-e-none',
  );
}

function barStyle(bar: BarSegment): StyleValue {
  return {
    background: bar.event.color,
    color: readableForeground(bar.event.color) ?? undefined,
    gridColumn: `${bar.column + 1} / span ${bar.span}`,
    gridRow: String(bar.lane + 2),
  };
}

/* One explicit row for the date numbers, one per lane, and a last one that takes the rest for the chips — so the
   bars line up across the week and the cell backgrounds can span every row. */
function rowStyle(week: WeekRow): StyleValue {
  return {
    minHeight: '96px',
    gridTemplateRows: `auto${' auto'.repeat(week.laneCount)} 1fr`,
  };
}

function eventLabel(e: EventCalendarViewerEvent): string {
  /* A numeric title falls back to the id, so the accessible name is always a string. */
  return locale.t(
    'EventCalendarViewer.eventAt',
    {
      title: String(e.title ?? e.id),
      time: formatZonedTime(e.start.withTimeZone(props.timeZone), locale.locale.value),
    },
    '{title} at {time}',
  );
}

function onEvent(ev: MouseEvent, e: EventCalendarViewerEvent): void {
  ev.stopPropagation();
  emit('event-click', e);
}
</script>

<template>
  <div class="flex h-full flex-col border-l border-t border-border">
    <div class="grid grid-cols-7">
      <div
        v-for="wd in weekdayHeaders"
        :key="wd"
        class="border-b border-r border-border bg-muted/40 px-2 py-1 text-xs font-medium uppercase text-muted-foreground"
      >
        {{ wd }}
      </div>
    </div>
    <div v-for="week in weeks" :key="week.key" class="grid flex-1 grid-cols-7 text-xs" :style="rowStyle(week)">
      <!-- Cell backgrounds and borders, behind every row of the week -->
      <div
        v-for="(cell, index) in week.cells"
        :key="`bg-${cell.day.toString()}`"
        aria-hidden="true"
        :class="cellClass(cell)"
        :style="{ gridColumn: String(index + 1), gridRow: '1 / -1' }"
      />
      <button
        v-for="(cell, index) in week.cells"
        :key="`d-${cell.day.toString()}`"
        type="button"
        :class="dateButtonClass(cell)"
        :style="{ gridColumn: String(index + 1), gridRow: '1' }"
        @click="emit('slot-click', cell.day)"
      >
        {{ cell.day.day }}
      </button>
      <!-- Multi-day bars: one per row, in lanes under the dates -->
      <button
        v-for="bar in week.bars"
        :key="bar.key"
        type="button"
        data-event-bar=""
        :data-bar-lane="bar.lane"
        :data-bar-column="bar.column + 1"
        :data-bar-span="bar.span"
        :data-bar-start="bar.isStart ? '' : undefined"
        :data-bar-end="bar.isEnd ? '' : undefined"
        :style="barStyle(bar)"
        :class="barClass(bar)"
        :aria-label="bar.label"
        @click="onEvent($event, bar.event)"
      >
        {{ bar.event.title ?? locale.t('EventCalendarViewer.untitled', undefined, '(no title)') }}
      </button>
      <!-- Single-day events, under the lanes -->
      <div
        v-for="(column, index) in week.columns"
        :key="`e-${column.day.toString()}`"
        :data-day="column.day.toString()"
        class="flex min-w-0 flex-col gap-0.5 px-1 pb-1"
        :style="{ gridColumn: String(index + 1), gridRow: String(week.laneCount + 2) }"
      >
        <button
          v-for="e in column.events"
          :key="e.id"
          type="button"
          :style="eventStyle(e)"
          :class="eventClass(e)"
          :aria-label="eventLabel(e)"
          @click="onEvent($event, e)"
        >
          {{ e.isAllDay ? '• ' : '' }}{{ e.title ?? locale.t('EventCalendarViewer.untitled', undefined, '(no title)') }}
        </button>
        <span v-if="column.moreCount > 0" class="px-1 text-[10px] text-muted-foreground">{{
          locale.t('MonthView.more', { count: column.moreCount }, '+{count} more')
        }}</span>
      </div>
    </div>
  </div>
</template>
