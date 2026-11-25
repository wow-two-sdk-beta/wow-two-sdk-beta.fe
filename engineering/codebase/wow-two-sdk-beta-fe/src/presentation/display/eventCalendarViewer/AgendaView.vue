<script lang="ts">
import type { Temporal } from 'temporal-polyfill';
import type { EventCalendarViewerEvent } from './EventCalendarViewerTypes';

export interface AgendaViewProps {
  readonly focusDay: Temporal.PlainDate;
  readonly timeZone: string;
  readonly events: ReadonlyArray<EventCalendarViewerEvent>;
}

/** One agenda row: the event, and whether it started before the agenda's focus date and is still running. */
interface AgendaEventEntry {
  event: EventCalendarViewerEvent;
  ongoing: boolean;
}

interface AgendaGroup {
  key: string;
  day: Temporal.PlainDate;
  events: Array<AgendaEventEntry>;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, type StyleValue } from 'vue';
import { Temporal as TemporalValue } from 'temporal-polyfill';
import { cn } from '../../../foundation/styles';
import { formatDay, formatDaySpan } from './EventCalendarViewerDates';
import { calendarEventDays, calendarHour } from './EventCalendarViewerLayout';
import { formatZonedTime, isToday } from '../../forms/DateExtensions';

const locale = useLocale();

/** Renders the chronological agenda list of an `EventCalendarViewer`. Internal — never exported. */
defineOptions({ name: 'AgendaView' });

const props = defineProps<AgendaViewProps>();

const emit = defineEmits<{
  /** Fires when an agenda row is clicked. */
  'event-click': [event: EventCalendarViewerEvent];
}>();

/*
 * Lists events ending on or after the focus date, ordered by start — an event already running when the
 * agenda opens (started before the focus date, not yet ended) still belongs here, sorted first by the same
 * ascending-start order, and groups under the focus date itself rather than its own earlier start day: the
 * agenda's purpose is "from here on", so a group heading before the focus date would read as a stale leftover.
 */
const groups = computed<Array<AgendaGroup>>(() => {
  const lower = calendarHour(props.focusDay, 0, props.timeZone);
  const upper = calendarHour(props.focusDay.add({ days: 31 }), 0, props.timeZone);
  const compare = TemporalValue.ZonedDateTime.compare;
  const entries: Array<AgendaEventEntry> = props.events
    .filter((event) => {
      const duration = compare(event.end, event.start);
      return (
        duration >= 0 &&
        compare(event.start, upper) < 0 &&
        (duration === 0 ? compare(event.start, lower) >= 0 : compare(event.end, lower) > 0)
      );
    })
    .map((event) => ({ event, ongoing: compare(event.start, lower) < 0 }))
    .sort((left, right) => compare(left.event.start, right.event.start));
  const map = new Map<string, Array<AgendaEventEntry>>();
  for (const entry of entries) {
    const day = entry.ongoing ? props.focusDay : entry.event.start.withTimeZone(props.timeZone).toPlainDate();
    const key = day.toString();
    const list = map.get(key);
    if (list) list.push(entry);
    else map.set(key, [entry]);
  }
  return Array.from(map.entries()).map(([key, list]) => ({
    key,
    day: list[0]!.ongoing ? props.focusDay : list[0]!.event.start.withTimeZone(props.timeZone).toPlainDate(),
    events: list,
  }));
});

function groupHeadingClass(day: Temporal.PlainDate): string {
  return cn(
    'mb-2 text-xs font-semibold uppercase text-muted-foreground',
    isToday(day) && 'text-primary-soft-foreground',
  );
}

function groupLabel(day: Temporal.PlainDate): string {
  return formatDay(day, locale.locale.value, { weekday: 'long', month: 'short', day: 'numeric' });
}

function dotStyle(e: EventCalendarViewerEvent): StyleValue {
  return { background: e.color || 'var(--color-primary)' };
}

function timeLabel(e: EventCalendarViewerEvent): string {
  const span = calendarEventDays(e, props.timeZone);
  if (span && !span.first.equals(span.last)) return formatDaySpan(span.first, span.last, locale.locale.value);
  if (e.isAllDay) return locale.t('EventCalendarViewer.allDay', undefined, 'All day');
  const start = formatZonedTime(e.start.withTimeZone(props.timeZone), locale.locale.value);
  if (TemporalValue.ZonedDateTime.compare(e.end, e.start) === 0) return start;
  return `${start} – ${formatZonedTime(e.end.withTimeZone(props.timeZone), locale.locale.value)}`;
}
</script>

<template>
  <div v-if="groups.length === 0" class="p-6 text-center text-sm text-muted-foreground">
    {{ locale.t('AgendaView.noUpcomingEvents', undefined, 'No upcoming events.') }}
  </div>
  <ul v-else class="divide-y divide-border">
    <li v-for="group in groups" :key="group.key" class="px-4 py-3">
      <div :class="groupHeadingClass(group.day)">{{ groupLabel(group.day) }}</div>
      <ul class="space-y-1">
        <li v-for="entry in group.events" :key="entry.event.id">
          <button
            type="button"
            class="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted"
            :title="String(entry.event.title ?? entry.event.id)"
            @click="emit('event-click', entry.event)"
          >
            <span aria-hidden="true" class="mt-1 h-2 w-2 shrink-0 rounded-full" :style="dotStyle(entry.event)" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium">{{
                entry.event.title ?? locale.t('EventCalendarViewer.untitled', undefined, '(no title)')
              }}</span>
              <span class="block text-xs text-muted-foreground tabular-nums">
                <span
                  v-if="entry.ongoing"
                  data-agenda-ongoing=""
                  class="mr-1 rounded-sm bg-primary-soft px-1 py-0.5 text-[10px] font-semibold uppercase text-primary-soft-foreground"
                  >{{ locale.t('AgendaView.ongoing', undefined, 'Ongoing') }}</span
                >{{ ' ' + timeLabel(entry.event) }}
              </span>
            </span>
          </button>
        </li>
      </ul>
    </li>
  </ul>
</template>
