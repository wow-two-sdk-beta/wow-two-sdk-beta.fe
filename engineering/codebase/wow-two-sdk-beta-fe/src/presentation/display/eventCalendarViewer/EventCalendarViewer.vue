<script lang="ts">
import type { Temporal } from 'temporal-polyfill';
import type { EventCalendarViewerEvent, EventCalendarViewerView } from './EventCalendarViewerTypes';

// EventCalendarViewer models events as absolute instants (a wall-clock time in a
// specific zone) — `Temporal.ZonedDateTime`, the peer of .NET `DateTimeOffset`.
// The month/week grid + navigation project down to `Temporal.PlainDate`; the
// intra-day time-slot geometry does its math on `ZonedDateTime` (`.hour`,
// `.add`, `until`). Both come from the shared, Temporal-based `DateExtensions`.

export interface EventCalendarViewerProps {
  readonly events: ReadonlyArray<EventCalendarViewerEvent>;

  /** The visible range mode, controlled. The `v-model:view` binding target. */
  readonly view?: EventCalendarViewerView;

  /** The initial view when uncontrolled. */
  readonly defaultView?: EventCalendarViewerView;

  /**
   * The focused instant, controlled; its calendar day drives the visible month/week/day.
   * The `v-model:date` binding target.
   */
  readonly date?: Temporal.ZonedDateTime;

  /** The initial focused instant when uncontrolled. Defaults to now. */
  readonly defaultDate?: Temporal.ZonedDateTime;

  readonly weekStart?: 0 | 1;
  readonly hourRange?: [number, number];
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { Temporal as TemporalValue } from 'temporal-polyfill';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { Icon } from '../../../foundation/icons';
import { addDays, nowZoned } from '../../forms/DateExtensions';
import {
  EventCalendarViewerViews,
  EventCalendarViewerView as EventCalendarViewerViewValue,
  startOfWeek,
} from './EventCalendarViewerTypes';
import MonthView from './MonthView.vue';
import TimeGridView from './TimeGridView.vue';
import AgendaView from './AgendaView.vue';

const locale = useLocale();

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/**
 * Renders a calendar in month, week, day, or agenda view, under a header of period controls.
 *
 * First generation: the header carries Today / Prev / Next / Title plus the view switcher, and events
 * are colored blocks. Drag-edit, recurrence, and "+N more" overflow are deferred.
 */
defineOptions({ name: 'EventCalendarViewer', inheritAttrs: false });

const props = withDefaults(defineProps<EventCalendarViewerProps>(), {
  /* `events` stays declared-required — Vue still warns when it is missing — but a
     default keeps an absent (or transiently-undefined) value out of the `[...spread]`
     below, which threw `props.events is not iterable` and took the whole page down. */
  events: () => [],
  defaultView: EventCalendarViewerViewValue.Month,
  weekStart: 0,
  hourRange: () => [0, 24],
});

const emit = defineEmits<{
  /** Fires when the reader switches view — the `v-model:view` half. */
  'update:view': [view: EventCalendarViewerView];
  /** Fires when the focused date moves — the `v-model:date` half. */
  'update:date': [date: Temporal.ZonedDateTime];
  /** Fires when the reader clicks an event block, with that event. */
  'event-click': [event: EventCalendarViewerEvent];
  /** Fires when the reader clicks an empty slot — `day` is the calendar day, `hour` the grid hour. */
  'slot-click': [day: Temporal.PlainDate, hour?: number];
}>();

const attrs = useAttrs();

const viewControlled = useControlled<EventCalendarViewerView>({
  controlled: () => props.view,
  default: () => props.defaultView,
  onChange: (next) => {
    emit('update:view', next);
  },
});

/* `nowZoned()` reads the host time zone through `Temporal.Now` — universal, not a browser
   global, so it is safe as the uncontrolled seed on the server. */
const dateControlled = useControlled<Temporal.ZonedDateTime>({
  controlled: () => props.date,
  default: () => props.defaultDate ?? nowZoned(),
  onChange: (next) => {
    emit('update:date', next);
  },
});

/* Named apart from the `view` / `date` props: a setup const sharing a prop name shadows it
   in the template and trips `vue/no-dupe-keys`. */
const currentView = viewControlled.value;
const currentDate = dateControlled.value;

/** CalendarPicker day the view is anchored on, in the focus instant's own zone. */
const focusDay = computed(() => currentDate.value.toPlainDate());

const timeZone = computed(() => currentDate.value.timeZoneId);

const sortedEvents = computed(() =>
  [...props.events].sort((a, b) => TemporalValue.ZonedDateTime.compare(a.start, b.start)),
);

function goPrev(): void {
  switch (currentView.value) {
    case EventCalendarViewerViewValue.Month:
      dateControlled.setValue(currentDate.value.add({ months: -1 }));
      break;
    case EventCalendarViewerViewValue.Week:
      dateControlled.setValue(currentDate.value.add({ days: -7 }));
      break;
    case EventCalendarViewerViewValue.Day:
    case EventCalendarViewerViewValue.Agenda:
      dateControlled.setValue(currentDate.value.add({ days: -1 }));
      break;
  }
}

function goNext(): void {
  switch (currentView.value) {
    case EventCalendarViewerViewValue.Month:
      dateControlled.setValue(currentDate.value.add({ months: 1 }));
      break;
    case EventCalendarViewerViewValue.Week:
      dateControlled.setValue(currentDate.value.add({ days: 7 }));
      break;
    case EventCalendarViewerViewValue.Day:
    case EventCalendarViewerViewValue.Agenda:
      dateControlled.setValue(currentDate.value.add({ days: 1 }));
      break;
  }
}

function goToday(): void {
  dateControlled.setValue(nowZoned().withTimeZone(timeZone.value));
}

function setView(next: EventCalendarViewerView): void {
  viewControlled.setValue(next);
}

const title = computed(() => {
  const day = focusDay.value;
  switch (currentView.value) {
    case EventCalendarViewerViewValue.Month:
      return day.toLocaleString(locale.locale.value, { month: 'long', year: 'numeric' });
    case EventCalendarViewerViewValue.Week: {
      const ws = startOfWeek(day, props.weekStart);
      const we = addDays(ws, 6);
      return `${ws.toLocaleString(locale.locale.value, { month: 'short', day: 'numeric' })} – ${we.toLocaleString(locale.locale.value, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    case EventCalendarViewerViewValue.Day:
      return day.toLocaleString(locale.locale.value, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    case EventCalendarViewerViewValue.Agenda:
      return locale.t(
        'EventCalendarViewer.upcomingFrom',
        { date: day.toLocaleString(locale.locale.value, { month: 'short', day: 'numeric' }) },
        'Upcoming from {date}',
      );
  }
  return '';
});

const weekFirstDay = computed(() => startOfWeek(focusDay.value, props.weekStart));

function viewButtonClass(v: EventCalendarViewerView): string {
  return cn(
    'inline-flex h-6 items-center rounded px-2 text-xs font-medium transition-colors',
    currentView.value === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
  );
}

const isMonth = computed(() => currentView.value === EventCalendarViewerViewValue.Month);
const isWeek = computed(() => currentView.value === EventCalendarViewerViewValue.Week);
const isDay = computed(() => currentView.value === EventCalendarViewerViewValue.Day);
const isAgenda = computed(() => currentView.value === EventCalendarViewerViewValue.Agenda);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'flex flex-col overflow-hidden rounded-md border border-border bg-card text-sm shadow-sm',
    attrs.class as ClassValue,
  ),
);

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <div ref="root" :class="rootClass" v-bind="passthroughAttrs">
    <!-- Header -->
    <div class="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
      <button
        type="button"
        class="inline-flex h-7 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
        @click="goToday"
      >
        {{ locale.t('EventCalendarViewer.today', undefined, 'Today') }}
      </button>
      <button
        type="button"
        :aria-label="locale.t('EventCalendarViewer.previous', undefined, 'Previous')"
        class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        @click="goPrev"
      >
        <Icon :icon="ChevronLeft" :size="14" />
      </button>
      <button
        type="button"
        :aria-label="locale.t('EventCalendarViewer.next', undefined, 'Next')"
        class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        @click="goNext"
      >
        <Icon :icon="ChevronRight" :size="14" />
      </button>
      <h3 class="ml-1 text-base font-semibold">{{ title }}</h3>
      <div
        role="group"
        :aria-label="locale.t('EventCalendarViewer.view', undefined, 'View')"
        class="ml-auto flex items-center gap-0.5 rounded-md bg-card p-0.5 ring-1 ring-border"
      >
        <button
          v-for="v in EventCalendarViewerViews"
          :key="v"
          type="button"
          :aria-pressed="currentView === v"
          :class="viewButtonClass(v)"
          @click="setView(v)"
        >
          {{ locale.t('EventCalendarViewer.' + v, undefined, v) }}
        </button>
      </div>
    </div>
    <!-- Body -->
    <div class="flex-1 overflow-auto" style="min-height: 0">
      <MonthView
        v-if="isMonth"
        :focus-day="focusDay"
        :time-zone="timeZone"
        :events="sortedEvents"
        :week-start="weekStart"
        @event-click="emit('event-click', $event)"
        @slot-click="(day, hour) => emit('slot-click', day, hour)"
      />
      <TimeGridView
        v-else-if="isWeek"
        :time-zone="timeZone"
        :events="sortedEvents"
        :days="7"
        :first-day="weekFirstDay"
        :hour-range="hourRange"
        @event-click="emit('event-click', $event)"
        @slot-click="(day, hour) => emit('slot-click', day, hour)"
      />
      <TimeGridView
        v-else-if="isDay"
        :time-zone="timeZone"
        :events="sortedEvents"
        :days="1"
        :first-day="focusDay"
        :hour-range="hourRange"
        @event-click="emit('event-click', $event)"
        @slot-click="(day, hour) => emit('slot-click', day, hour)"
      />
      <AgendaView
        :time-zone="timeZone"
        v-else-if="isAgenda"
        :focus-day="focusDay"
        :events="sortedEvents"
        @event-click="emit('event-click', $event)"
      />
    </div>
  </div>
</template>
