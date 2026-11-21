<script lang="ts">
import type { Temporal } from 'temporal-polyfill';
import type { EventCalendarViewerEvent } from './EventCalendarViewerTypes';

export interface YearViewProps {
  readonly focusDay: Temporal.PlainDate;
  readonly timeZone: string;
  readonly events: ReadonlyArray<EventCalendarViewerEvent>;
  readonly weekStart: 0 | 1;
}

interface YearDay {
  day: Temporal.PlainDate;
  key: string;
  events: ReadonlyArray<EventCalendarViewerEvent>;
  isToday: boolean;
  label: string;
  title: string | undefined;
}

interface YearMonth {
  first: Temporal.PlainDate;
  key: string;
  name: string;
  groupLabel: string;
  eventCount: number;
  countText: string;
  countLabel: string;
  /** Always 42 entries, so every mini month is six rows tall; `null` pads days outside the month. */
  cells: ReadonlyArray<YearDay | null>;
}
</script>

<script setup lang="ts">
import { formatMonthYear, monthName, useLocale, useLocaleFormatters, weekdayName } from '../../../foundation/i18n';
import { computed, type StyleValue } from 'vue';
import { Temporal as TemporalValue } from 'temporal-polyfill';
import { cn } from '../../../foundation/styles';
import { isToday } from '../../forms/DateExtensions';
import { formatDay } from './EventCalendarViewerDates';
import { startOfWeek } from './EventCalendarViewerTypes';
import { intersectsCalendarDay } from './EventCalendarViewerLayout';
import { useIsPhone } from './EventCalendarViewerHelpers';

const locale = useLocale();
const formatters = useLocaleFormatters();
const isPhone = useIsPhone();

/** Renders the year of twelve mini months of an `EventCalendarViewer`. Internal — never exported from the folder. */
defineOptions({ name: 'YearView' });

const props = defineProps<YearViewProps>();

const emit = defineEmits<{
  /** Fires when a month name is clicked, with the first day of that month. */
  'month-click': [month: Temporal.PlainDate];
  /** Fires when a day button is clicked, with that day. */
  'day-click': [day: Temporal.PlainDate];
}>();

const TintProperty = '--year-day-tint';
const TintClass = 'bg-[color-mix(in_srgb,var(--year-day-tint,var(--color-primary))_35%,transparent)]';

/** The cell count of a mini month — six week rows of seven, so months line up in the grid. */
const CellCount = 42;

function eventsLabel(count: number): string {
  return formatters.value.plural(count) === 'one'
    ? locale.t('YearView.eventsOne', { count }, '{count} event')
    : locale.t('YearView.events', { count }, '{count} events');
}

const weekdayInitials = computed(() =>
  Array.from({ length: 7 }, (_, i) =>
    weekdayName(startOfWeek(props.focusDay, props.weekStart).add({ days: i }).dayOfWeek, locale.locale.value, 'narrow'),
  ),
);

/* Index the year's events by day once. Each event walks only the days it spans, clipped to the year, and the
   shared boundary rule keeps the exclusive end instant: an event ending at midnight leaves the next day empty. */
const eventIndex = computed(() => {
  const year = props.focusDay.year;
  const yearStart = props.focusDay.with({ month: 1, day: 1 });
  const yearEnd = props.focusDay.with({ month: 12, day: 31 });
  const byDay = new Map<string, Array<EventCalendarViewerEvent>>();
  const byMonth = Array.from({ length: 12 }, () => new Set<EventCalendarViewerEvent>());
  for (const event of props.events) {
    if (TemporalValue.ZonedDateTime.compare(event.end, event.start) < 0) continue;
    const firstDay = event.start.withTimeZone(props.timeZone).toPlainDate();
    const lastDay = event.end.withTimeZone(props.timeZone).toPlainDate();
    let day = TemporalValue.PlainDate.compare(firstDay, yearStart) < 0 ? yearStart : firstDay;
    const stop = TemporalValue.PlainDate.compare(lastDay, yearEnd) > 0 ? yearEnd : lastDay;
    for (; TemporalValue.PlainDate.compare(day, stop) <= 0; day = day.add({ days: 1 })) {
      if (day.year !== year || !intersectsCalendarDay(event, day, props.timeZone)) continue;
      const key = day.toString();
      const list = byDay.get(key);
      if (list) list.push(event);
      else byDay.set(key, [event]);
      byMonth[day.month - 1]!.add(event);
    }
  }
  return { byDay, byMonth };
});

const months = computed<ReadonlyArray<YearMonth>>(() => {
  const { byDay, byMonth } = eventIndex.value;
  return Array.from({ length: 12 }, (_, i): YearMonth => {
    const first = props.focusDay.with({ month: i + 1, day: 1 });
    const gridStart = startOfWeek(first, props.weekStart);
    const eventCount = byMonth[i]!.size;
    const countLabel = eventCount > 0 ? eventsLabel(eventCount) : '';
    const cells = Array.from({ length: CellCount }, (_, cellIndex): YearDay | null => {
      const day = gridStart.add({ days: cellIndex });
      if (day.month !== first.month) return null;
      const key = day.toString();
      const events = byDay.get(key) ?? [];
      const date = formatDay(day, locale.locale.value, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const count = events.length > 0 ? eventsLabel(events.length) : undefined;
      return {
        day,
        key,
        events,
        isToday: isToday(day),
        label: count === undefined ? date : locale.t('YearView.dayLabel', { date, events: count }, '{date}, {events}'),
        title: count,
      };
    });
    return {
      first,
      key: first.toString(),
      name: monthName(first.month, locale.locale.value, 'long'),
      groupLabel: formatMonthYear(first, locale.locale.value),
      eventCount,
      countText: formatters.value.number(eventCount),
      countLabel,
      cells,
    };
  });
});

function dayClass(cell: YearDay): string {
  return cn(
    'flex h-6 w-full items-center justify-center rounded-sm text-[11px] tabular-nums text-foreground transition-colors',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    cell.events.length > 0
      ? `${TintClass} font-semibold hover:brightness-95 forced-colors:border forced-colors:border-[Highlight]`
      : 'hover:bg-muted',
    cell.isToday && 'ring-2 ring-primary',
  );
}

/* A marked day mixes its tint into a translucent wash, so the number keeps the theme's text color. The first
   event's color rides in a custom property; without one the wash falls back to the primary token. */
function dayStyle(cell: YearDay): StyleValue | undefined {
  const color = cell.events[0]?.color;
  return color ? { [TintProperty]: color } : undefined;
}
</script>

<template>
  <div class="grid grid-cols-2 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
    <section
      v-for="month in months"
      :key="month.key"
      role="group"
      :aria-label="month.groupLabel"
      class="rounded-md border border-border bg-card p-2"
    >
      <div class="mb-1 flex items-center justify-between gap-2">
        <button
          type="button"
          class="max-sm:flex max-sm:min-h-10 max-sm:w-full max-sm:items-center rounded-sm px-1 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          @click="emit('month-click', month.first)"
        >
          {{ month.name }}
        </button>
        <span
          v-if="month.eventCount > 0"
          role="img"
          :aria-label="month.countLabel"
          :title="month.countLabel"
          class="rounded-full bg-muted px-1.5 text-[10px] font-medium tabular-nums text-muted-foreground"
          >{{ month.countText }}</span
        >
      </div>
      <div class="grid grid-cols-7 gap-0.5 text-center">
        <span
          v-for="(initial, index) in weekdayInitials"
          :key="index"
          aria-hidden="true"
          class="text-[10px] font-medium uppercase text-muted-foreground"
          >{{ initial }}</span
        >
        <template v-for="(cell, index) in month.cells" :key="cell ? cell.key : `blank-${index}`">
          <span v-if="!cell" aria-hidden="true" />
          <!-- Below `sm` a day is display-only — a cramped mini-month grid makes an accidental tap too easy;
               `sm` and up keep the tappable button unchanged. -->
          <span
            v-else-if="isPhone"
            :class="dayClass(cell)"
            :style="dayStyle(cell)"
            :aria-label="cell.label"
            :aria-current="cell.isToday ? 'date' : undefined"
            :title="cell.title"
            :data-today="cell.isToday ? '' : undefined"
            :data-event-count="cell.events.length > 0 ? cell.events.length : undefined"
          >
            {{ cell.day.day }}
          </span>
          <button
            v-else
            type="button"
            :class="dayClass(cell)"
            :style="dayStyle(cell)"
            :aria-label="cell.label"
            :aria-current="cell.isToday ? 'date' : undefined"
            :title="cell.title"
            :data-today="cell.isToday ? '' : undefined"
            :data-event-count="cell.events.length > 0 ? cell.events.length : undefined"
            @click="emit('day-click', cell.day)"
          >
            {{ cell.day.day }}
          </button>
        </template>
      </div>
    </section>
  </div>
</template>
