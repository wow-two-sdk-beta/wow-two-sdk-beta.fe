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
const HourGutterPx = 56;
const MinimumDayWidthPx = 120;

/** The most rows the all-day strip grows to before folding the rest behind "+N more". */
const MaxAllDayRows = 3;
</script>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onScopeDispose,
  ref,
  useTemplateRef,
  watch,
  type ComponentPublicInstance,
  type StyleValue,
} from 'vue';
import { Temporal as TemporalValue } from 'temporal-polyfill';
import { cn } from '../../../foundation/styles';
import { readableForeground } from '../../../foundation/themes';
import { useLocale } from '../../../foundation/i18n';
import { useResizeObserver } from '../../../foundation/observers';
import { formatDay } from './EventCalendarViewerDates';
import { formatZonedTime, isToday, maxZoned, nowZoned } from '../../forms/DateExtensions';
import {
  calendarHour,
  calendarHourRange,
  intersectsCalendarDay,
  layoutCalendarEvents,
  type CalendarEventLayout,
} from './EventCalendarViewerLayout';
import { useIsPhone } from './EventCalendarViewerHelpers';

/** Renders the week / day time grid of an `EventCalendarViewer`. Internal — never exported. */
defineOptions({ name: 'TimeGridView', inheritAttrs: false });

const props = defineProps<TimeGridViewProps>();
const locale = useLocale();
const isPhone = useIsPhone();

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

const frame = useTemplateRef<HTMLElement>('frame');
const frameWidth = ref<number>();
let resizeFrame = 0;
useResizeObserver(frame, ({ contentRect: { width } }) => {
  cancelAnimationFrame(resizeFrame);
  if (width !== frameWidth.value) {
    resizeFrame = requestAnimationFrame(() => (frameWidth.value = width));
  }
});
onScopeDispose(() => {
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
});

/* Use the week list if the hour gutter and every day column cannot fit in the available space. */
const showDayList = computed(() => {
  if (props.days <= 1) return false;
  return frameWidth.value === undefined
    ? isPhone.value
    : frameWidth.value < HourGutterPx + props.days * MinimumDayWidthPx;
});

/** Every event touching `d`, start ascending — all-day and timed together, the day list's own row set. */
function dayListEvents(d: Temporal.PlainDate): ReadonlyArray<EventCalendarViewerEvent> {
  return props.events
    .filter((event) => intersectsCalendarDay(event, d, props.timeZone))
    .slice()
    .sort((a, b) => TemporalValue.ZonedDateTime.compare(a.start, b.start));
}

function dayListHeadingClass(d: Temporal.PlainDate): string {
  return cn('mb-1 text-xs font-semibold uppercase text-muted-foreground', isToday(d) && 'text-primary-soft-foreground');
}

function dayListHeadingLabel(d: Temporal.PlainDate): string {
  return formatDay(d, locale.locale.value, { weekday: 'long', month: 'short', day: 'numeric' });
}

/** All day → "All day"; a zero-length event → its start only, never a start–start range; else the full range. */
function dayListTimeLabel(e: EventCalendarViewerEvent): string {
  if (e.isAllDay) return locale.t('EventCalendarViewer.allDay', undefined, 'All day');
  const start = formatZonedTime(e.start.withTimeZone(props.timeZone), locale.locale.value);
  if (TemporalValue.ZonedDateTime.compare(e.end, e.start) === 0) return start;
  return `${start} – ${formatZonedTime(e.end.withTimeZone(props.timeZone), locale.locale.value)}`;
}

/*
 * The all-day strip grows to `MaxAllDayRows` rows of chips before folding the rest behind "+N more" — the
 * row count comes from measuring real wrapped layout (chip widths vary with their titles and the locale),
 * not an estimate. Every chip renders until measured (`allDayVisible` has no entry yet for the day), then
 * the measured count takes over; the "+N more" badge itself is excluded from the count via
 * `data-allday-more`, so re-measuring after it appears does not fold it into its own row.
 */
const allDayRefs = new Map<string, HTMLElement>();
function setAllDayRef(day: string, el: Element | ComponentPublicInstance | null): void {
  if (el instanceof HTMLElement) allDayRefs.set(day, el);
  else allDayRefs.delete(day);
}
const allDayVisible = ref<Record<string, number>>({});
const gridEl = useTemplateRef<HTMLDivElement>('gridEl');

function measureAllDay(): void {
  const next: Record<string, number> = {};
  for (const [day, el] of allDayRefs) {
    const chips = Array.from(el.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute('data-allday-more'),
    );
    let visible = chips.length;
    let rows = 0;
    let lastTop = Number.NaN;
    for (const [index, chip] of chips.entries()) {
      if (chip.offsetTop !== lastTop) {
        rows += 1;
        lastTop = chip.offsetTop;
      }
      if (rows > MaxAllDayRows) {
        visible = index;
        break;
      }
    }
    next[day] = visible;
  }
  allDayVisible.value = next;
}

function allDayVisibleEvents(day: string): ReadonlyArray<EventCalendarViewerEvent> {
  const all = allDayEvents.value.get(day) ?? [];
  const visible = allDayVisible.value[day];
  return visible === undefined ? all : all.slice(0, visible);
}

function allDayMoreCount(day: string): number {
  const all = allDayEvents.value.get(day) ?? [];
  const visible = allDayVisible.value[day];
  return visible === undefined ? 0 : Math.max(0, all.length - visible);
}

useResizeObserver(gridEl, measureAllDay, () => !showDayList.value);
watch(
  [allDayEvents, dayDates],
  () => {
    allDayVisible.value = {};
    void nextTick(measureAllDay);
  },
  { flush: 'post', immediate: true },
);

/* Numeric CSS lengths are spelled with their unit — React's style object auto-appended `px`,
   Vue's does not, so a bare `48` would be dropped as an invalid declaration. */
const HourStyle: StyleValue = { height: `${HourPx}px` };

const gridColumns = computed<StyleValue>(() => ({
  gridTemplateColumns: `repeat(${props.days}, minmax(${MinimumDayWidthPx}px, 1fr))`,
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
  return formatDay(d, locale.locale.value, { weekday: 'short', day: 'numeric' });
}

/* A fixed chip height per breakpoint (`h-5` desktop, `max-sm:h-7` — 28px — phone, fix #6) gives the
   measured-row logic a deterministic row boundary — a content-driven height would make every chip its
   own ambiguous "row". */
function allDayClass(e: EventCalendarViewerEvent): string {
  return cn(
    'flex h-5 max-sm:h-7 items-center truncate rounded-sm px-1',
    !e.color && 'bg-primary-soft text-primary-soft-foreground',
  );
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

/* `max-sm:min-h-7` gives a phone reader a 28px tap target without changing desktop's duration-driven sizing —
   `min-height` only raises a shorter box, never shrinks a taller one. */
function eventClass(e: EventCalendarViewerEvent): string {
  return cn(
    'absolute max-sm:min-h-7 overflow-hidden rounded-sm border border-border/60 px-1 py-0.5 text-left text-[11px] font-medium transition-colors hover:brightness-95 active:brightness-95',
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
  <div ref="frame" class="min-w-0">
    <div v-if="showDayList" data-time-grid-daylist="" class="divide-y divide-border overflow-x-hidden text-xs">
      <div v-for="d in dayDates" :key="`dl-${d.toString()}`" class="p-2">
        <div :class="dayListHeadingClass(d)">{{ dayListHeadingLabel(d) }}</div>
        <ul v-if="dayListEvents(d).length > 0" class="space-y-1">
          <li v-for="e in dayListEvents(d)" :key="e.id">
            <button
              type="button"
              class="flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted active:bg-muted"
              @click="onEvent($event, e)"
            >
              <span aria-hidden="true" class="mt-1 h-2 w-2 shrink-0 rounded-full" :style="chipStyle(e)" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{
                  e.title ?? locale.t('EventCalendarViewer.untitled', undefined, '(no title)')
                }}</span>
                <span class="block text-muted-foreground tabular-nums">{{ dayListTimeLabel(e) }}</span>
              </span>
            </button>
          </li>
        </ul>
        <div v-else class="px-2 py-1 text-muted-foreground">
          {{ locale.t('AgendaView.noUpcomingEvents', undefined, 'No upcoming events.') }}
        </div>
      </div>
    </div>
    <div v-else data-time-grid="" class="flex">
      <!-- Hour gutter -->
      <div class="shrink-0 border-r border-border" :style="{ width: `${HourGutterPx}px` }">
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
        <div ref="gridEl" class="grid" :style="gridColumns">
          <!-- Day headers -->
          <div v-for="d in dayDates" :key="`h-${d.toString()}`" :class="dayHeaderClass(d)">
            {{ dayHeaderLabel(d) }}
          </div>
          <!-- All-day row: grows to `MaxAllDayRows` rows of chips, the rest behind "+N more"; never a fixed
             height, so overflowing chips can never bleed into the hour grid below. -->
          <div
            v-for="d in dayDates"
            :key="`ad-${d.toString()}`"
            data-all-day-cell=""
            class="max-h-[68px] max-sm:max-h-[92px] overflow-hidden border-b border-r border-border bg-muted/10 p-0.5 text-[11px]"
          >
            <div class="flex flex-wrap gap-0.5" :ref="(el) => setAllDayRef(d.toString(), el)">
              <button
                v-for="e in allDayVisibleEvents(d.toString())"
                :key="e.id"
                type="button"
                :style="chipStyle(e)"
                :class="allDayClass(e)"
                @click="onEvent($event, e)"
              >
                {{ e.title ?? locale.t('EventCalendarViewer.untitled', undefined, '(no title)') }}
              </button>
              <span
                v-if="allDayMoreCount(d.toString()) > 0"
                data-allday-more=""
                class="inline-flex h-5 items-center rounded-sm bg-muted px-1 text-[10px] font-medium text-muted-foreground"
              >
                {{ locale.t('TimeGridView.moreAllDay', { count: allDayMoreCount(d.toString()) }, '+{count} more') }}
              </span>
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
            <!-- Today line — positioned within this column only, so it can never draw across the all-day strip
               above it. -->
            <div
              v-if="todayLineTop(d)"
              aria-hidden="true"
              data-now-line=""
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
              <div class="flex min-w-0 items-baseline gap-1">
                <span class="shrink-0 text-[10px] tabular-nums opacity-80">{{ eventStartLabel(item.event, d) }}</span>
                <span class="min-w-0 flex-1 truncate">{{
                  item.event.title ?? locale.t('EventCalendarViewer.untitled', undefined, '(no title)')
                }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
