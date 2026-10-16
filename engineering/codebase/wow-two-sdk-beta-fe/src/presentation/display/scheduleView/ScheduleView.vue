<script lang="ts">
import type { Temporal } from 'temporal-polyfill';

// ScheduleView models bookings as absolute instants (a wall-clock time in a
// specific zone) — `Temporal.ZonedDateTime`, the peer of .NET `DateTimeOffset`.
// The single-day header projects down to the day's calendar date; the
// intra-day slot geometry does its math on `ZonedDateTime` (`.hour`, `.add`,
// `until`) via the shared, Temporal-based `DateExtensions`.

export interface ScheduleResource {
  readonly id: string;
  /** The row label. React took a `ReactNode`; richer content goes through the `resource` slot. */
  readonly label: string | number;
  readonly color?: string;
}

export interface ScheduleBooking {
  readonly id: string;
  readonly resourceId: string;
  readonly start: Temporal.ZonedDateTime;
  readonly end: Temporal.ZonedDateTime;
  /** The booking label. React took a `ReactNode`; richer content goes through the `booking` slot. */
  readonly label?: string | number;
  readonly color?: string;
}

export interface ScheduleViewProps {
  readonly resources: ReadonlyArray<ScheduleResource>;
  readonly bookings: ReadonlyArray<ScheduleBooking>;
  /** The day to render; its calendar date + time zone anchor the grid. */
  readonly date?: Temporal.ZonedDateTime;
  readonly hourRange?: [number, number];
  readonly slotMinutes?: number;
  /**
   * Handles a click on an empty slot.
   *
   * Kept a PROP rather than an emit: its presence is what renders the slot overlay at
   * all, and Vue strips a declared emit's listener out of `useAttrs()` — an emit could
   * never be detected, so the overlay would either always or never render.
   */
  readonly onSlotClick?: (resourceId: string, time: Temporal.ZonedDateTime) => void;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef, type StyleValue } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { readableForeground } from '../../../foundation/themes';
import { formatZonedTime, minutesBetween, nowZoned, zonedAtHour } from '../../forms/DateExtensions';

const locale = useLocale();

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/**
 * Renders a single day of a multi-resource schedule — one row per resource across an hours grid.
 *
 * Bookings sit absolutely within each row's timeline, placed by minute offset.
 */
defineOptions({ name: 'ScheduleView', inheritAttrs: false });

const props = withDefaults(defineProps<ScheduleViewProps>(), {
  hourRange: () => [8, 20],
  slotMinutes: 30,
});

const emit = defineEmits<{
  /** Fires when a booking is clicked. Replaces React's `onBookingClick`. */
  'booking-click': [booking: ScheduleBooking];
}>();

/** Replaces React's `renderBooking` render prop, and lifts `label` to rich content. */
defineSlots<{
  /** Overrides a resource row's label. Falls back to `resource.label`. */
  resource?(props: { resource: ScheduleResource }): unknown;
  /** Overrides a booking's body. Falls back to the label + time range. */
  booking?(props: { booking: ScheduleBooking }): unknown;
}>();

const attrs = useAttrs();

/* `nowZoned()` reads the host time zone through `Temporal.Now` — universal, not a browser
   global, so it is safe as a computed default on the server. */
const day = computed(() => props.date ?? nowZoned());

const startHour = computed(() => props.hourRange[0]);
const endHour = computed(() => props.hourRange[1]);
const hourCount = computed(() => endHour.value - startHour.value);
const totalMinutes = computed(() => hourCount.value * 60);
const slotCount = computed(() => Math.ceil(totalMinutes.value / props.slotMinutes));

const dayStart = computed(() => zonedAtHour(day.value.toPlainDate(), startHour.value, day.value.timeZoneId));

const bookingsByResource = computed(() => {
  const map = new Map<string, Array<ScheduleBooking>>();
  for (const b of props.bookings) {
    const list = map.get(b.resourceId);
    if (list) list.push(b);
    else map.set(b.resourceId, [b]);
  }
  return map;
});

function bookingsFor(resourceId: string): Array<ScheduleBooking> {
  return bookingsByResource.value.get(resourceId) ?? [];
}

const dayLabel = computed(() =>
  day.value.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
);

const hourColumns = computed<StyleValue>(() => ({
  gridTemplateColumns: `repeat(${hourCount.value}, 1fr)`,
}));

const slotColumns = computed<StyleValue>(() => ({
  gridTemplateColumns: `repeat(${slotCount.value}, 1fr)`,
}));

function hourLabel(index: number): string {
  return `${String((startHour.value + index) % 24).padStart(2, '0')}:00`;
}

function slotTime(index: number): Temporal.ZonedDateTime {
  return dayStart.value.add({ minutes: index * props.slotMinutes });
}

function slotLabel(index: number): string {
  return `Empty slot at ${formatZonedTime(slotTime(index))}`;
}

function onSlot(resourceId: string, index: number): void {
  props.onSlotClick?.(resourceId, slotTime(index));
}

function onBooking(event: MouseEvent, booking: ScheduleBooking): void {
  event.stopPropagation();
  emit('booking-click', booking);
}

function bookingLabel(resource: ScheduleResource, booking: ScheduleBooking): string {
  return `${resource.label} ${formatZonedTime(booking.start)} – ${formatZonedTime(booking.end)}: ${booking.label ?? ''}`;
}

/* Numeric CSS lengths are spelled with their unit — React's style object auto-appended `px`,
   Vue's does not, so a bare `56` would be dropped as an invalid declaration. */
function bookingStyle(resource: ScheduleResource, booking: ScheduleBooking): StyleValue {
  const offsetMin = Math.max(0, minutesBetween(dayStart.value, booking.start));
  const durMin = Math.max(15, minutesBetween(booking.start, booking.end));
  return {
    left: `${(offsetMin / totalMinutes.value) * 100}%`,
    width: `${(durMin / totalMinutes.value) * 100}%`,
    top: '4px',
    bottom: '4px',
    background: booking.color ?? resource.color,
    color: readableForeground(booking.color ?? resource.color) ?? undefined,
  };
}

function bookingClass(resource: ScheduleResource, booking: ScheduleBooking): string {
  const color = booking.color ?? resource.color;
  return cn(
    'absolute overflow-hidden rounded-md border border-border/60 px-2 py-1 text-left text-xs font-medium transition-colors hover:brightness-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    !color && 'bg-primary-soft text-primary-soft-foreground',
  );
}

const RowStyle: StyleValue = { height: '56px' };

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn('overflow-auto rounded-md border border-border bg-card text-sm shadow-sm', attrs.class as ClassValue),
);

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <!-- Timeline layout, no 2D keyboard nav — ARIA grid (grid > row > gridcell)
       would be a lie; group + labeled slot/booking buttons is honest. -->
  <div
    ref="root"
    role="group"
    :aria-label="locale.t('ScheduleView.schedule', undefined, 'Schedule')"
    :class="rootClass"
    v-bind="passthroughAttrs"
  >
    <!-- Hour header -->
    <div class="sticky top-0 z-raised flex border-b border-border bg-muted/40">
      <div class="w-32 shrink-0 border-r border-border px-3 py-2 text-xs font-medium text-muted-foreground">
        {{ dayLabel }}
      </div>
      <div class="flex-1 grid" :style="hourColumns">
        <div
          v-for="i in hourCount"
          :key="i"
          class="border-l border-border px-2 py-1 text-xs text-muted-foreground tabular-nums"
        >
          {{ hourLabel(i - 1) }}
        </div>
      </div>
    </div>
    <!-- Rows -->
    <div v-for="resource in resources" :key="resource.id" class="flex border-b border-border last:border-b-0">
      <div class="w-32 shrink-0 border-r border-border bg-muted/20 px-3 py-2 text-xs font-medium">
        <slot name="resource" :resource="resource">{{ resource.label }}</slot>
      </div>
      <div class="relative flex-1" :style="RowStyle">
        <!-- Vertical hour gridlines -->
        <div aria-hidden="true" class="absolute inset-0 grid pointer-events-none" :style="hourColumns">
          <div v-for="i in hourCount" :key="i" class="border-l border-border" />
        </div>
        <!-- Slot click overlay -->
        <div v-if="onSlotClick" class="absolute inset-0 grid" :style="slotColumns">
          <button
            v-for="i in slotCount"
            :key="i"
            type="button"
            :aria-label="slotLabel(i - 1)"
            class="hover:bg-primary-soft/30"
            @click="onSlot(resource.id, i - 1)"
          />
        </div>
        <!-- Bookings -->
        <button
          v-for="booking in bookingsFor(resource.id)"
          :key="booking.id"
          type="button"
          :aria-label="bookingLabel(resource, booking)"
          :style="bookingStyle(resource, booking)"
          :class="bookingClass(resource, booking)"
          @click="onBooking($event, booking)"
        >
          <slot name="booking" :booking="booking">
            <div class="truncate">{{ booking.label ?? booking.id }}</div>
            <div class="text-[10px] opacity-70 tabular-nums">
              {{ formatZonedTime(booking.start) }}
              {{ ' – ' }}
              {{ formatZonedTime(booking.end) }}
            </div>
          </slot>
        </button>
      </div>
    </div>
  </div>
</template>
