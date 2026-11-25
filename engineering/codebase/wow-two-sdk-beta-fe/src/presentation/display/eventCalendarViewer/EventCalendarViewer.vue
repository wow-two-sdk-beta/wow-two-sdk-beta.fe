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

  /**
   * The views the switcher offers, shown in canonical order (day, week, month, year, agenda) whatever order is
   * passed. Defaults to every view. A current view that is not offered shows the first offered one, and a
   * single offered view hides the switcher.
   */
  readonly views?: ReadonlyArray<EventCalendarViewerView>;
}
</script>

<script setup lang="ts">
import { formatMonthYear, useLocale } from '../../../foundation/i18n';
import { computed, onMounted, shallowRef, useAttrs, useSlots, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { Temporal as TemporalValue } from 'temporal-polyfill';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { Icon } from '../../../foundation/icons';
import { addDays, nowZoned } from '../../forms/DateExtensions';
import ToggleGroup from '../../forms/toggleGroup/ToggleGroup.vue';
import ToggleInput from '../../forms/toggleInput/ToggleInput.vue';
import {
  EventCalendarViewerViews,
  EventCalendarViewerView as EventCalendarViewerViewValue,
  offeredViews,
  startOfWeek,
} from './EventCalendarViewerTypes';
import { formatDay } from './EventCalendarViewerDates';
import { useIsPhone } from './EventCalendarViewerHelpers';
import MonthView from './MonthView.vue';
import TimeGridView from './TimeGridView.vue';
import YearView from './YearView.vue';
import AgendaView from './AgendaView.vue';

const locale = useLocale();
const isPhone = useIsPhone();

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/**
 * Renders a calendar in day, week, month, year, or agenda view, under a header of period controls.
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
  views: () => [...EventCalendarViewerViews],
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

defineSlots<{
  /** Extra controls shown in the header between the title and the view switcher. Renders only when filled. */
  'toolbar-extra'?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();

/* Static below-`lg` wrapping (unfilled) keeps today's `sm` breakpoint untouched; a filled slot needs a third
   row, so the header wraps up to `lg` instead — see `headerClass` / `switcherClass`. */
const hasToolbarExtra = computed(() => !!slots['toolbar-extra']);

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

/* The switcher's views in canonical order, and the view actually shown: a current view the consumer did not offer
   gives way to the first offered one, without reporting a change the reader never made. */
const switcherViews = computed(() => offeredViews(props.views));
const activeView = computed(() =>
  switcherViews.value.includes(currentView.value) ? currentView.value : switcherViews.value[0]!,
);

/** CalendarPicker day the view is anchored on, in the focus instant's own zone. */
const focusDay = computed(() => currentDate.value.toPlainDate());

const timeZone = computed(() => currentDate.value.timeZoneId);
const weekFirstDay = computed(() => startOfWeek(focusDay.value, props.weekStart));
const today = shallowRef(TemporalValue.Now.plainDateISO(timeZone.value));

onMounted(() => {
  watch(
    timeZone,
    (zone, _, onCleanup) => {
      let timer: ReturnType<typeof setTimeout>;
      function refreshToday(): void {
        const now = TemporalValue.Now.zonedDateTimeISO(zone);
        today.value = now.toPlainDate();
        const nextDay = now.add({ days: 1 }).startOfDay();
        timer = setTimeout(refreshToday, nextDay.epochMilliseconds - now.epochMilliseconds);
      }
      refreshToday();
      onCleanup(() => clearTimeout(timer));
    },
    { immediate: true },
  );
});

const isShowingCurrentPeriod = computed(() => {
  const day = focusDay.value;
  const current = today.value.withCalendar(day.calendarId);
  switch (activeView.value) {
    case EventCalendarViewerViewValue.Year:
      return day.year === current.year;
    case EventCalendarViewerViewValue.Month:
      return day.year === current.year && day.monthCode === current.monthCode;
    case EventCalendarViewerViewValue.Week:
      return weekFirstDay.value.equals(startOfWeek(current, props.weekStart));
    default:
      return day.equals(current);
  }
});

const sortedEvents = computed(() =>
  [...props.events].sort((a, b) => TemporalValue.ZonedDateTime.compare(a.start, b.start)),
);

function goPrev(): void {
  switch (activeView.value) {
    case EventCalendarViewerViewValue.Year:
      dateControlled.setValue(currentDate.value.add({ years: -1 }));
      break;
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
  switch (activeView.value) {
    case EventCalendarViewerViewValue.Year:
      dateControlled.setValue(currentDate.value.add({ years: 1 }));
      break;
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

function setView(next: EventCalendarViewerView | readonly string[] | null): void {
  if (typeof next === 'string') viewControlled.setValue(next);
}

/* A year-view month opens the month grid on that month; a year-view day opens the day grid on that day. The
   focused instant keeps its time of day and zone. A target view the consumer did not offer is not entered —
   the focused date still moves, and the day click still reports `slot-click`. */
function openMonth(month: Temporal.PlainDate): void {
  dateControlled.setValue(currentDate.value.with({ year: month.year, month: month.month, day: 1 }));
  if (switcherViews.value.includes(EventCalendarViewerViewValue.Month)) setView(EventCalendarViewerViewValue.Month);
}

function openDay(day: Temporal.PlainDate): void {
  dateControlled.setValue(currentDate.value.with({ year: day.year, month: day.month, day: day.day }));
  if (switcherViews.value.includes(EventCalendarViewerViewValue.Day)) setView(EventCalendarViewerViewValue.Day);
  emit('slot-click', day);
}

/* Below `sm` the title shortens — no year on day/week, "From {date}" instead of "Upcoming from {date}" on
   agenda — so it fits the two-line phone toolbar without wrapping; `sm` and up keep today's longer forms. */
const title = computed(() => {
  const day = focusDay.value;
  const phone = isPhone.value;
  switch (activeView.value) {
    case EventCalendarViewerViewValue.Year:
      return day.toLocaleString(locale.locale.value, { year: 'numeric' });
    case EventCalendarViewerViewValue.Month:
      return formatMonthYear(day, locale.locale.value);
    case EventCalendarViewerViewValue.Week: {
      const ws = startOfWeek(day, props.weekStart);
      const we = addDays(ws, 6);
      if (phone) {
        const start = formatDay(ws, locale.locale.value, { month: 'short', day: 'numeric' });
        const sameMonth = ws.month === we.month && ws.year === we.year;
        const end = sameMonth
          ? formatDay(we, locale.locale.value, { day: 'numeric' })
          : formatDay(we, locale.locale.value, { month: 'short', day: 'numeric' });
        return `${start} – ${end}`;
      }
      return `${formatDay(ws, locale.locale.value, { month: 'short', day: 'numeric' })} – ${formatDay(we, locale.locale.value, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    case EventCalendarViewerViewValue.Day:
      return phone
        ? formatDay(day, locale.locale.value, { weekday: 'short', month: 'short', day: 'numeric' })
        : formatDay(day, locale.locale.value, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    case EventCalendarViewerViewValue.Agenda: {
      const date = formatDay(day, locale.locale.value, { month: 'short', day: 'numeric' });
      return phone
        ? locale.t('EventCalendarViewer.fromDate', { date }, 'From {date}')
        : locale.t('EventCalendarViewer.upcomingFrom', { date }, 'Upcoming from {date}');
    }
  }
  return '';
});

const isMonth = computed(() => activeView.value === EventCalendarViewerViewValue.Month);
const isWeek = computed(() => activeView.value === EventCalendarViewerViewValue.Week);
const isDay = computed(() => activeView.value === EventCalendarViewerViewValue.Day);
const isYear = computed(() => activeView.value === EventCalendarViewerViewValue.Year);
const isAgenda = computed(() => activeView.value === EventCalendarViewerViewValue.Agenda);

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

/* Below `sm` the switcher always wraps to its own full-width row (its `w-full` forces the break). A filled
   `toolbar-extra` slot needs a second wrap point for its own row, so the header stays `flex-wrap` through `lg`
   instead of `sm`; unfilled, the breakpoint stays `sm` and the header is byte-for-byte what it always rendered. */
const headerClass = computed(() =>
  cn(
    'flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 px-2 py-2 min-[360px]:gap-2 min-[360px]:px-3',
    hasToolbarExtra.value ? 'lg:flex-nowrap' : 'sm:flex-nowrap',
  ),
);

/* The switcher only needs to push itself to the row's right edge once that same breakpoint stops wrapping. */
const switcherClass = computed(() =>
  cn(
    'flex w-full flex-nowrap items-center gap-0.5 p-0.5',
    hasToolbarExtra.value ? 'lg:ml-auto lg:w-auto' : 'sm:ml-auto sm:w-auto',
  ),
);

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <div ref="root" :class="rootClass" v-bind="passthroughAttrs">
    <!-- Header: below `sm` (or `lg` with a filled `toolbar-extra`) the switcher wraps to its own full-width row
         (the `w-full` it carries forces the break); above that breakpoint keeps today's single row. -->
    <div :class="headerClass">
      <button
        type="button"
        :disabled="isShowingCurrentPeriod"
        class="inline-flex h-11 shrink-0 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium enabled:hover:bg-muted disabled:opacity-50 sm:h-7 pointer-coarse:h-11"
        @click="goToday"
      >
        {{ locale.t('EventCalendarViewer.today', undefined, 'Today') }}
      </button>
      <div
        data-calendar-period=""
        class="flex min-w-0 flex-1 items-center min-[360px]:gap-1 max-sm:rounded-md max-sm:bg-card sm:flex-[0_1_auto]"
      >
        <button
          type="button"
          :aria-label="locale.t('EventCalendarViewer.previous', undefined, 'Previous')"
          class="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted sm:size-7 pointer-coarse:size-11"
          @click="goPrev"
        >
          <Icon :icon="ChevronLeft" :size="16" />
        </button>
        <h3 class="min-w-0 flex-1 truncate text-center text-sm font-semibold sm:text-base" :title="title">
          {{ title }}
        </h3>
        <button
          type="button"
          :aria-label="locale.t('EventCalendarViewer.next', undefined, 'Next')"
          class="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted sm:size-7 pointer-coarse:size-11"
          @click="goNext"
        >
          <Icon :icon="ChevronRight" :size="16" />
        </button>
      </div>
      <!-- `lg:contents` drops this wrapper's own box at `lg` and up, so the slotted controls become flex items of
           the header row itself — sharing its row and control height with Today and the switcher; below `lg` the
           wrapper is a normal full-width block, its own row between the title row and the switcher. -->
      <div v-if="hasToolbarExtra" class="flex w-full items-center gap-2 lg:contents">
        <slot name="toolbar-extra" />
      </div>
      <ToggleGroup
        v-if="switcherViews.length > 1"
        variant="segmented"
        :model-value="activeView"
        :aria-label="locale.t('EventCalendarViewer.view', undefined, 'View')"
        :class="switcherClass"
        @update:model-value="setView"
      >
        <ToggleInput
          v-for="v in switcherViews"
          :key="v"
          :value="v"
          size="sm"
          tone="neutral"
          class="h-11 min-w-0 flex-1 px-0.5 text-xs min-[360px]:px-1 sm:h-6 sm:flex-none sm:px-2 data-[pressed=false]:hover:text-foreground data-[pressed=false]:focus-visible:text-foreground"
        >
          <span class="truncate">{{ locale.t('EventCalendarViewer.' + v, undefined, v) }}</span>
        </ToggleInput>
      </ToggleGroup>
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
      <YearView
        v-else-if="isYear"
        :focus-day="focusDay"
        :time-zone="timeZone"
        :events="sortedEvents"
        :week-start="weekStart"
        @month-click="openMonth"
        @day-click="openDay"
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
