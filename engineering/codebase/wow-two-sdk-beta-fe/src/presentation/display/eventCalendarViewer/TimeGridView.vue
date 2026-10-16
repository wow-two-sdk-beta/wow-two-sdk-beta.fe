<script lang="ts">
import type { Temporal } from 'temporal-polyfill';
import type { EventCalendarViewerEvent } from './EventCalendarViewerTypes';

export interface TimeGridViewProps {
  readonly timeZone: string;
  readonly events: ReadonlyArray<EventCalendarViewerEvent>;
  readonly days: number;
  readonly firstDay: Temporal.PlainDate;
  readonly hourRange: [number, number];
}

/** The fixed pixel height of one hour row. */
const HourPx = 48;
</script>

<script setup lang="ts">
import { computed, type StyleValue } from 'vue';
import { cn } from '../../../foundation/styles';
import { readableForeground } from '../../../foundation/themes';
import { useLocale } from '../../../foundation/i18n';
import { formatZonedTime, isToday, maxZoned, nowZoned } from '../../forms/DateExtensions';
import {
  calendarHour,
  calendarHourRange,
  intersectsCalendarDay,
  layoutCalendarEvents,
  type CalendarEventLayout,
} from './EventCalendarViewerLayout';

/** Renders the week / day time grid of an `EventCalendarViewer`. Internal — never exported. */
defineOptions({ name: 'TimeGridView' });

const props = defineProps<TimeGridViewProps>();
const locale = useLocale();

const emit = defineEmits<{
  /** Fires when an event block is clicked. */
  'event-click': [event: EventCalendarViewerEvent];
  /** Fires when an empty hour cell is clicked. */
  'slot-click': [day: Temporal.PlainDate, hour?: number];
}>();

const range = computed(() => calendarHourRange(props.hourRange));
const startHour = computed(() => range.value[0]);
const endHour = computed(() => range.value[1]);
const visibleHours = computed(() => endHour.value - startHour.value);

const dayDates = computed(() => Array.from({ length: props.days }, (_, i) => props.firstDay.add({ days: i })));

const layouts = computed(
  () =>
    new Map(
      dayDates.value.map((day) => [
        day.toString(),
        layoutCalendarEvents(props.events, day, props.timeZone, range.value),
      ]),
    ),
);
const allDayEvents = computed(
  () =>
    new Map(
      dayDates.value.map((day) => [
        day.toString(),
        props.events.filter((event) => event.isAllDay && intersectsCalendarDay(event, day, props.timeZone)),
      ]),
    ),
);

/* Numeric CSS lengths are spelled with their unit — React's style object auto-appended `px`,
   Vue's does not, so a bare `48` would be dropped as an invalid declaration. */
const HourStyle: StyleValue = { height: `${HourPx}px` };

const gridColumns = computed<StyleValue>(() => ({
  gridTemplateColumns: `repeat(${props.days}, minmax(120px, 1fr))`,
}));

const columnStyle = computed<StyleValue>(() => ({
  height: `${visibleHours.value * HourPx}px`,
}));

function hourLabel(index: number): string {
  return `${String((startHour.value + index) % 24).padStart(2, '0')}:00`;
}

function dayHeaderClass(d: Temporal.PlainDate): string {
  return cn(
    'h-6 border-b border-r border-border bg-muted/40 px-2 text-xs font-medium',
    isToday(d) && 'bg-primary-soft/30',
  );
}

function dayHeaderLabel(d: Temporal.PlainDate): string {
  return d.toLocaleString(locale.locale.value, { weekday: 'short', day: 'numeric' });
}

function allDayClass(e: EventCalendarViewerEvent): string {
  return cn('truncate rounded-sm px-1 py-0.5', !e.color && 'bg-primary-soft text-primary-soft-foreground');
}

function eventStyle(item: CalendarEventLayout): StyleValue {
  return {
    top: `${((item.start - startHour.value * 60) / 60) * HourPx}px`,
    height: `${((item.end - item.start) / 60) * HourPx}px`,
    left: `calc(${(item.column / item.columns) * 100}% + 2px)`,
    width: `calc(${100 / item.columns}% - 4px)`,
    background: item.event.color,
    color: readableForeground(item.event.color) ?? undefined,
  };
}

/* A consumer-colored all-day chip gets the text pole that reads on its color. */
function chipStyle(e: EventCalendarViewerEvent): StyleValue {
  return { background: e.color, color: readableForeground(e.color) ?? undefined };
}

function eventClass(e: EventCalendarViewerEvent): string {
  return cn(
    'absolute overflow-hidden rounded-sm border border-border/60 px-1 py-0.5 text-left text-[11px] font-medium transition-colors hover:brightness-95',
    !e.color && 'bg-primary text-primary-foreground',
  );
}

function eventStartLabel(e: EventCalendarViewerEvent, d: Temporal.PlainDate): string {
  const dayStart = calendarHour(d, startHour.value, props.timeZone);
  return formatZonedTime(maxZoned(e.start, dayStart).withTimeZone(props.timeZone), locale.locale.value);
}

/* Read on every render, exactly as React's per-render `nowZoned()` was — a `computed` would
   cache the instant for the component's lifetime. `Temporal.Now` is universal, not a browser
   global, so this is SSR-safe. */
function todayLineTop(d: Temporal.PlainDate): string | undefined {
  if (!isToday(d)) return undefined;
  const current = nowZoned().withTimeZone(props.timeZone);
  const minutes = current.hour * 60 + current.minute - startHour.value * 60;
  if (minutes < 0 || minutes > visibleHours.value * 60) return undefined;
  return `${(minutes / 60) * HourPx}px`;
}

function onEvent(ev: MouseEvent, e: EventCalendarViewerEvent): void {
  ev.stopPropagation();
  emit('event-click', e);
}
</script>

<template>
  <div class="flex">
    <!-- Hour gutter -->
    <div class="w-14 shrink-0 border-r border-border">
      <div class="h-6 border-b border-border bg-muted/40" />
      <div class="h-7 border-b border-border bg-muted/20" />
      <div
        v-for="i in visibleHours"
        :key="i"
        class="border-b border-border bg-muted/10 px-1 text-[10px] tabular-nums text-muted-foreground"
        :style="HourStyle"
      >
        {{ hourLabel(i - 1) }}
      </div>
    </div>
    <div class="flex-1 overflow-x-auto">
      <div class="grid" :style="gridColumns">
        <!-- Day headers -->
        <div v-for="d in dayDates" :key="`h-${d.toString()}`" :class="dayHeaderClass(d)">
          {{ dayHeaderLabel(d) }}
        </div>
        <!-- All-day row -->
        <div
          v-for="d in dayDates"
          :key="`ad-${d.toString()}`"
          class="h-7 border-b border-r border-border bg-muted/10 p-0.5 text-[11px]"
        >
          <div class="flex flex-wrap gap-0.5">
            <button
              v-for="e in allDayEvents.get(d.toString())"
              :key="e.id"
              type="button"
              :style="chipStyle(e)"
              :class="allDayClass(e)"
              @click="onEvent($event, e)"
            >
              {{ e.title ?? locale.t('EventCalendarViewer.untitled', undefined, '(no title)') }}
            </button>
          </div>
        </div>
        <!-- Time grid columns -->
        <div
          v-for="d in dayDates"
          :key="`g-${d.toString()}`"
          class="relative border-r border-border"
          :style="columnStyle"
        >
          <!-- Hour grid lines -->
          <button
            v-for="i in visibleHours"
            type="button"
            :aria-label="
              locale.t(
                'EventCalendarViewer.slotAt',
                { date: dayHeaderLabel(d), time: hourLabel(i - 1) },
                '{date} at {time}',
              )
            "
            :key="i"
            class="block w-full border-b border-border/60 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
            :style="HourStyle"
            @click="emit('slot-click', d, startHour + i - 1)"
          />
          <!-- Today line -->
          <div
            v-if="todayLineTop(d)"
            aria-hidden="true"
            class="absolute inset-x-0 z-raised border-t border-primary"
            :style="{ top: todayLineTop(d) }"
          />
          <!-- Events -->
          <button
            v-for="item in layouts.get(d.toString())"
            :key="item.event.id"
            type="button"
            :style="eventStyle(item)"
            :class="eventClass(item.event)"
            @click="onEvent($event, item.event)"
          >
            <div class="truncate">
              {{ item.event.title ?? locale.t('EventCalendarViewer.untitled', undefined, '(no title)') }}
            </div>
            <div class="text-[10px] opacity-80 tabular-nums">
              {{ eventStartLabel(item.event, d) }}
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
