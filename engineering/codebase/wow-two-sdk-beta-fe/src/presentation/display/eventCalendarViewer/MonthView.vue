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
  /** Every single-day event for the day, unsliced — the phone dot view's own, smaller cap. */
  allEvents: ReadonlyArray<EventCalendarViewerEvent>;
  /** All events touching this day, including multi-day bars. */
  eventCount: number;
}

/** The most dots a phone day cell draws before folding the rest into "+N". */
const MaxPhoneDots = 3;

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
import { useLocale, useLocaleFormatters, weekdayName } from '../../../foundation/i18n';
import { computed, ref, watch, type StyleValue } from 'vue';
import { Temporal as TemporalValue } from 'temporal-polyfill';
import { cn } from '../../../foundation/styles';
import { readableForeground } from '../../../foundation/themes';
import { daysBetween, formatZonedTime, isToday } from '../../forms/DateExtensions';
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from '../../overlays/modal';
import { formatDay, formatDaySpan } from './EventCalendarViewerDates';
import { startOfWeek } from './EventCalendarViewerTypes';
import { calendarEventDays, intersectsCalendarDay } from './EventCalendarViewerLayout';
import { useIsPhone } from './EventCalendarViewerHelpers';

const locale = useLocale();
const formatters = useLocaleFormatters();
const isPhone = useIsPhone();

/** Renders the month grid of an `EventCalendarViewer`. Internal — never exported from the folder. */
defineOptions({ name: 'MonthView' });

const props = defineProps<MonthViewProps>();

const emit = defineEmits<{
  /** Fires when an event block is clicked. */
  'event-click': [event: EventCalendarViewerEvent];
  /** Fires when an empty day cell's date button is clicked. */
  'slot-click': [day: Temporal.PlainDate, hour?: number];
}>();

/** The date and event list stay mounted during the sheet's closing animation. */
const selectedDay = ref<Temporal.PlainDate | null>(null);
const daySheetOpen = ref(false);
watch([() => props.focusDay, isPhone], () => {
  daySheetOpen.value = false;
});

function openDay(event: MouseEvent, day: Temporal.PlainDate): void {
  // Safari need not focus tapped buttons. Capture this control as the dialog's return target.
  (event.currentTarget as HTMLButtonElement).focus({ preventScroll: true });
  selectedDay.value = day;
  daySheetOpen.value = true;
}

function onDateClick(event: MouseEvent, day: Temporal.PlainDate): void {
  if (isPhone.value) openDay(event, day);
  emit('slot-click', day);
}

/** Every event touching `selectedDay`, start ascending — the same shape `AgendaView` lists a day in. */
const selectedDayEvents = computed<ReadonlyArray<EventCalendarViewerEvent>>(() => {
  const day = selectedDay.value;
  if (!day) return [];
  return props.events
    .filter((event) => intersectsCalendarDay(event, day, props.timeZone))
    .sort((a, b) => TemporalValue.ZonedDateTime.compare(a.start, b.start));
});

const selectedDayLabel = computed(() =>
  selectedDay.value
    ? formatDay(selectedDay.value, locale.locale.value, { weekday: 'long', month: 'long', day: 'numeric' })
    : '',
);

function eventCountLabel(count: number): string {
  const values = { count: formatters.value.number(count) };
  return formatters.value.plural(count) === 'one'
    ? locale.t('MonthView.eventsOne', values, '{count} event')
    : locale.t('MonthView.events', values, '{count} events');
}

function selectedDayTimeLabel(e: EventCalendarViewerEvent): string {
  const span = calendarEventDays(e, props.timeZone);
  if (span && !span.first.equals(span.last)) return formatDaySpan(span.first, span.last, locale.locale.value);
  if (e.isAllDay) return locale.t('EventCalendarViewer.allDay', undefined, 'All day');
  const start = formatZonedTime(e.start.withTimeZone(props.timeZone), locale.locale.value);
  if (TemporalValue.ZonedDateTime.compare(e.end, e.start) === 0) return start;
  return `${start} – ${formatZonedTime(e.end.withTimeZone(props.timeZone), locale.locale.value)}`;
}

/** Reorder weekdays per weekStart. */
const weekdayHeaders = computed(() =>
  Array.from({ length: 7 }, (_, i) =>
    weekdayName(startOfWeek(props.focusDay, props.weekStart).add({ days: i }).dayOfWeek, locale.locale.value, 'short'),
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

function dateLabel(day: Temporal.PlainDate): string {
  return formatDay(day, locale.locale.value, { year: 'numeric', month: 'short', day: 'numeric' });
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
    const span = calendarEventDays(event, props.timeZone);
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
      const eventCount = day.length + covering.length;
      return { day: cell.day, events, moreCount: eventCount - shown, allEvents: day, eventCount };
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

/* Under a coarse pointer the date grows to 44px tall, its number centred, and an invisible hit area at least 44px wide
   runs from its start into the empty rest of its cell, so the number keeps its place and the first column's area is not
   cut at the grid's edge. */
function dateButtonClass(cell: MonthCell): string {
  return cn(
    'mx-1 mb-1 mt-1 self-start justify-self-start rounded-sm px-1 text-xs tabular-nums transition-colors sm:max-lg:min-h-10 sm:max-lg:min-w-10 pointer-coarse:min-h-11',
    'pointer-coarse:relative pointer-coarse:after:absolute pointer-coarse:after:inset-y-0 pointer-coarse:after:start-0 pointer-coarse:after:w-full pointer-coarse:after:min-w-11',
    cell.outOfMonth ? 'text-muted-foreground' : 'text-foreground',
    isToday(cell.day) && 'bg-primary text-primary-foreground',
    'hover:bg-muted',
  );
}

/* The phone's entire cell opens the sheet for that date. */
function phoneCellButtonClass(): string {
  return 'flex min-h-11 w-full flex-col items-center gap-0.5 pt-1 pb-0.5 transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';
}

/* The date number keeps its own small today-highlight, now inside the full-cell phone button rather
   than being the button itself. */
function phoneDateNumberClass(cell: MonthCell): string {
  return cn(
    'flex h-5 w-5 items-center justify-center rounded-sm text-xs tabular-nums',
    cell.outOfMonth ? 'text-muted-foreground' : 'text-foreground',
    isToday(cell.day) && 'bg-primary text-primary-foreground',
  );
}

function eventClass(e: EventCalendarViewerEvent): string {
  return cn(
    'truncate rounded-sm px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors hover:brightness-95 sm:max-lg:min-h-10 pointer-coarse:min-h-11',
    !e.color && 'bg-primary-soft text-primary-soft-foreground',
  );
}

/* A consumer-colored chip gets the text pole that reads on its color; a theme-colored one keeps the soft tokens. */
function eventStyle(e: EventCalendarViewerEvent): StyleValue {
  return { background: e.color, color: readableForeground(e.color) ?? undefined };
}

/* Logical corners, so a right-to-left grid rounds the bar's real first and last day. A segment that runs past the
   row's edge stays square and flush with the cell border — the continuation edge. Below `sm` the bar carries no
   text — a thin color line is enough to read as "an event spans these days" in a cell too small for a label. */
function barClass(bar: BarSegment): string {
  if (isPhone.value) {
    return cn(
      'pointer-events-none mb-0.5 h-1 min-w-0 rounded-full',
      !bar.event.color && 'bg-primary-soft',
      bar.isStart ? 'ms-0.5 rounded-s-full' : 'rounded-s-none',
      bar.isEnd ? 'me-0.5 rounded-e-full' : 'rounded-e-none',
    );
  }
  return cn(
    'mb-0.5 min-w-0 truncate py-0.5 text-left text-[11px] font-medium transition-colors hover:brightness-95 sm:max-lg:min-h-10 pointer-coarse:min-h-11',
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
  // On a phone the button spans every track, so reserve room for its date and dots above the bars.
  const dateTrack = isPhone.value ? '2.5rem' : 'auto';
  return {
    minHeight: isPhone.value ? '3.25rem' : '96px',
    gridTemplateRows: `${dateTrack}${' auto'.repeat(week.laneCount)} 1fr`,
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
  daySheetOpen.value = false;
  emit('event-click', e);
}

/** The phone dot's color, or the primary token for an event with none — same rule as `AgendaView`'s dot. */
function dotStyle(e: EventCalendarViewerEvent): StyleValue {
  return { background: e.color || 'var(--color-primary)' };
}
</script>

<template>
  <div class="flex h-full flex-col border-l border-t border-border">
    <div class="grid grid-cols-7">
      <div
        v-for="wd in weekdayHeaders"
        :key="wd"
        class="border-b border-r border-border bg-muted/40 py-1.5 text-center text-xs font-medium uppercase text-muted-foreground sm:px-2 sm:py-1 sm:text-start"
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
      <!-- Below `sm` this button grows to the whole cell (fix: the cell body did nothing on tap) and carries
           the dot row too; `sm` and up keep the small date-only button at grid row 1 unchanged. -->
      <button
        v-for="(cell, index) in week.cells"
        :key="`d-${cell.day.toString()}`"
        type="button"
        :class="isPhone ? phoneCellButtonClass() : dateButtonClass(cell)"
        :style="{ gridColumn: String(index + 1), gridRow: isPhone ? '1 / -1' : '1' }"
        :aria-label="
          isPhone ? `${dateLabel(cell.day)}, ${eventCountLabel(week.columns[index]!.eventCount)}` : undefined
        "
        :aria-haspopup="isPhone ? 'dialog' : undefined"
        @click="onDateClick($event, cell.day)"
      >
        <template v-if="isPhone">
          <span :class="phoneDateNumberClass(cell)">{{ cell.day.day }}</span>
          <span class="flex flex-wrap items-center justify-center gap-0.5">
            <span
              v-for="e in week.columns[index]!.allEvents.slice(0, MaxPhoneDots)"
              :key="e.id"
              aria-hidden="true"
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              :style="dotStyle(e)"
            />
            <span
              v-if="week.columns[index]!.allEvents.length > MaxPhoneDots"
              aria-hidden="true"
              class="text-[9px] leading-3 text-muted-foreground"
            >
              +{{ week.columns[index]!.allEvents.length - MaxPhoneDots }}
            </span>
          </span>
        </template>
        <template v-else>{{ cell.day.day }}</template>
      </button>
      <!-- Multi-day bars: one per row, in lanes under the dates. Below `sm` the bar carries no label text. -->
      <component
        :is="isPhone ? 'span' : 'button'"
        v-for="bar in week.bars"
        :key="bar.key"
        :type="isPhone ? undefined : 'button'"
        data-event-bar=""
        :data-bar-lane="bar.lane"
        :data-bar-column="bar.column + 1"
        :data-bar-span="bar.span"
        :data-bar-start="bar.isStart ? '' : undefined"
        :data-bar-end="bar.isEnd ? '' : undefined"
        :style="barStyle(bar)"
        :class="barClass(bar)"
        :aria-label="isPhone ? undefined : bar.label"
        :title="isPhone ? undefined : bar.label"
        :aria-hidden="isPhone || undefined"
        @click="!isPhone && onEvent($event, bar.event)"
      >
        <template v-if="!isPhone">{{
          bar.event.title ?? locale.t('EventCalendarViewer.untitled', undefined, '(no title)')
        }}</template>
      </component>
      <!-- Single-day events, under the lanes, `sm` and up only — below `sm` the dots live in the date
           button above instead, since it is now the whole cell's tap target. -->
      <template v-if="!isPhone">
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
            :title="eventLabel(e)"
            @click="onEvent($event, e)"
          >
            {{ e.isAllDay ? '• ' : ''
            }}{{ e.title ?? locale.t('EventCalendarViewer.untitled', undefined, '(no title)') }}
          </button>
          <button
            v-if="column.moreCount > 0"
            type="button"
            aria-haspopup="dialog"
            :aria-label="`${dateLabel(column.day)}, ${eventCountLabel(column.eventCount)}`"
            class="min-h-6 rounded-sm px-1 text-start text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:max-lg:min-h-10 pointer-coarse:min-h-11"
            @click="openDay($event, column.day)"
          >
            {{ locale.t('MonthView.more', { count: column.moreCount }, '+{count} more') }}
          </button>
        </div>
      </template>
    </div>
    <Modal v-if="selectedDay" v-model:open="daySheetOpen">
      <ModalContent phone-layout="sheet" show-handle class="max-sm:pt-7" data-month-day-panel="">
        <ModalClose class="h-11 w-11" />
        <ModalHeader class="pr-11">
          <ModalTitle>{{ selectedDayLabel }}</ModalTitle>
          <ModalDescription>{{ eventCountLabel(selectedDayEvents.length) }}</ModalDescription>
        </ModalHeader>
        <ModalBody>
          <p v-if="selectedDayEvents.length === 0" class="py-3 text-muted-foreground">
            {{ locale.t('MonthView.noEvents', undefined, 'No events on this day.') }}
          </p>
          <ul v-else class="divide-y divide-border">
            <li v-for="e in selectedDayEvents" :key="e.id">
              <button
                type="button"
                class="flex min-h-11 w-full items-start gap-2.5 rounded-md px-2 py-3 text-start transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                @click="onEvent($event, e)"
              >
                <span aria-hidden="true" class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :style="dotStyle(e)" />
                <span class="min-w-0 flex-1">
                  <span class="block font-medium">{{
                    e.title ?? locale.t('EventCalendarViewer.untitled', undefined, '(no title)')
                  }}</span>
                  <span class="block text-xs tabular-nums text-muted-foreground">{{ selectedDayTimeLabel(e) }}</span>
                </span>
              </button>
            </li>
          </ul>
        </ModalBody>
      </ModalContent>
    </Modal>
  </div>
</template>
