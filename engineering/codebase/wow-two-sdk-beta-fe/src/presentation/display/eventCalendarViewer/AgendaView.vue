<script lang="ts">
import type { Temporal } from 'temporal-polyfill';
import type { EventCalendarViewerEvent } from './EventCalendarViewerTypes';

export interface AgendaViewProps {
  readonly focusDay: Temporal.PlainDate;
  readonly timeZone: string;
  readonly events: ReadonlyArray<EventCalendarViewerEvent>;
}

interface AgendaGroup {
  key: string;
  day: Temporal.PlainDate;
  events: Array<EventCalendarViewerEvent>;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, type StyleValue } from 'vue';
import { Temporal as TemporalValue } from 'temporal-polyfill';
import { cn } from '../../../foundation/styles';
import { calendarHour } from './EventCalendarViewerLayout';
import { formatZonedTime, isToday } from '../../forms/DateExtensions';

const locale = useLocale();

/** Renders the chronological agenda list of an `EventCalendarViewer`. Internal — never exported. */
defineOptions({ name: 'AgendaView' });

const props = defineProps<AgendaViewProps>();

const emit = defineEmits<{
  /** Fires when an agenda row is clicked. */
  'event-click': [event: EventCalendarViewerEvent];
}>();

const groups = computed<Array<AgendaGroup>>(() => {
  const lower = calendarHour(props.focusDay, 0, props.timeZone);
  const upper = calendarHour(props.focusDay.add({ days: 31 }), 0, props.timeZone);
  const compare = TemporalValue.ZonedDateTime.compare;
  const upcoming = props.events
    .filter((event) => {
      const duration = compare(event.end, event.start);
      return (
        duration >= 0 &&
        compare(event.start, upper) < 0 &&
        (duration === 0 ? compare(event.start, lower) >= 0 : compare(event.end, lower) > 0)
      );
    })
    .slice()
    .sort((left, right) => compare(left.start, right.start));
  /* Group by calendar day of the event start. */
  const map = new Map<string, Array<EventCalendarViewerEvent>>();
  for (const e of upcoming) {
    const key = e.start.withTimeZone(props.timeZone).toPlainDate().toString();
    const list = map.get(key);
    if (list) list.push(e);
    else map.set(key, [e]);
  }
  return Array.from(map.entries()).map(([key, list]) => ({
    key,
    day: list[0]!.start.withTimeZone(props.timeZone).toPlainDate(),
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
  return day.toLocaleString(locale.locale.value, { weekday: 'long', month: 'short', day: 'numeric' });
}

function dotStyle(e: EventCalendarViewerEvent): StyleValue {
  return { background: e.color || 'var(--color-primary)' };
}

function timeLabel(e: EventCalendarViewerEvent): string {
  return e.isAllDay
    ? locale.t('EventCalendarViewer.allDay', undefined, 'All day')
    : `${formatZonedTime(e.start.withTimeZone(props.timeZone), locale.locale.value)} – ${formatZonedTime(e.end.withTimeZone(props.timeZone), locale.locale.value)}`;
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
        <li v-for="e in group.events" :key="e.id">
          <button
            type="button"
            class="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted"
            @click="emit('event-click', e)"
          >
            <span aria-hidden="true" class="mt-1 h-2 w-2 shrink-0 rounded-full" :style="dotStyle(e)" />
            <span class="flex-1">
              <span class="block text-sm font-medium">{{
                e.title ?? locale.t('EventCalendarViewer.untitled', undefined, '(no title)')
              }}</span>
              <span class="block text-xs text-muted-foreground tabular-nums">
                {{ timeLabel(e) }}
              </span>
            </span>
          </button>
        </li>
      </ul>
    </li>
  </ul>
</template>
