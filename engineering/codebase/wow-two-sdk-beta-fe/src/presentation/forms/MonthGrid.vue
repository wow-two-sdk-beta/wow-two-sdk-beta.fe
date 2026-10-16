<script lang="ts">
// Shared month-grid renderer for CalendarPicker and RangeCalendarPicker. Co-located in
// `forms/` as a domain-internal helper. Owns:
//   - the 42-cell visual layout (header + weekday row + 6×7 grid)
//   - keyboard navigation (arrows / Home/End / PgUp/PgDn / Shift+PgUp/PgDn)
//   - focused-cell management (autofocus on focusedDate change)
//   - month nav buttons
//
// Consumers (CalendarPicker, RangeCalendarPicker) provide:
//   - their own selection state via `dayProps(date)` returning extra attrs
//   - `onDayActivate(date)` callback for click/Enter/Space
//
// Not exported from `forms/index.ts` — internal only.

import type { Temporal } from 'temporal-polyfill';
import { AriaAttribute } from '../../foundation/dom';

/** @internal An attribute name this component derives or requires. */
type DayAttribute = typeof AriaAttribute.Selected;

export interface MonthGridDayProps extends Readonly<Partial<Record<DayAttribute, boolean>>> {
  readonly class?: string;
  readonly onPointerenter?: (event: PointerEvent) => void;
  readonly onPointerleave?: (event: PointerEvent) => void;
  /** The extra `data-*` attributes (data-selected, data-range-start, etc.). */
  [key: `data-${string}`]: string | boolean | undefined;
}

/** Query callbacks return values; state updates emit canonical named model requests. */
export interface MonthGridProps {
  /** The first day of the visible month (use `startOfMonth(date)`). */
  readonly viewMonth: Temporal.PlainDate;

  /** The currently focused day (cell tabindex=0). */
  readonly focusedDate: Temporal.PlainDate;

  /** The predicate marking a day as disabled. */
  readonly isDayDisabled?: (date: Temporal.PlainDate) => boolean;

  /** Emits the activated day on click / Enter / Space. */
  readonly onDayActivate?: (date: Temporal.PlainDate, meta: { outOfMonth: boolean }) => void;

  /** The extra per-day attributes for selection styling and hover handlers. */
  readonly dayProps?: (date: Temporal.PlainDate, meta: { outOfMonth: boolean }) => MonthGridDayProps | undefined;
}

// Upper bound when scanning past disabled days — covers a Shift+PageUp/PageDown
// year jump (≤366 days) with margin.
const MaxDisabledSkip = 400;
</script>

<script setup lang="ts">
import { useLocale } from '../../foundation/i18n';
import { computed, onBeforeUnmount, onMounted, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { cn } from '../../foundation/styles';
import { addDays, addMonths, buildMonthGrid, isSameDay, isToday, startOfMonth, sundayIndex } from './DateExtensions';

/** Renders the shared 42-cell month grid — month nav, weekday row, keyboard-navigable day cells. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'MonthGrid', inheritAttrs: false });

const props = defineProps<MonthGridProps>();

const emit = defineEmits<{
  'update:viewMonth': [date: Temporal.PlainDate];
  'update:focusedDate': [date: Temporal.PlainDate];
}>();

const attrs = useAttrs();

const root = useTemplateRef<HTMLDivElement>('root');
const grid = useTemplateRef<HTMLDivElement>('grid');

/* Tracks keyboard/click interaction so the focus watcher below never steals page focus
   when a standalone CalendarPicker mounts. */
let interacted = false;

/*
 * Re-focus the active day cell when `focusedDate` changes (keyboard nav).
 *
 * NOT `immediate` — an immediate watcher runs during setup, which happens on the SERVER
 * too, and `querySelector` on a null ref would be the least of it. A mount run would be
 * a no-op behind the `interacted` guard anyway.
 */
watch(
  () => props.focusedDate,
  (next) => {
    if (!interacted) return;
    const cell = grid.value?.querySelector<HTMLButtonElement>(`[data-date="${next.toString()}"]`);
    cell?.focus();
  },
  { flush: 'post' },
);

/*
 * When the grid mounts inside an open popover (DatePicker), the focus trap lands on the
 * first tabbable (prev-month button); adopt it onto the active day cell. Standalone mounts
 * (activeElement outside the root) are left alone.
 *
 * `onMounted` — never runs on the server, so `document` / `requestAnimationFrame` are safe
 * here without a `typeof` guard.
 */
let raf = 0;
onMounted(() => {
  raf = requestAnimationFrame(() => {
    if (!root.value?.contains(document.activeElement)) return;
    grid.value?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
  });
});
onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf);
});

function moveFocus(next: Temporal.PlainDate, dir: 1 | -1): void {
  let target = next;
  if (props.isDayDisabled) {
    // Skip disabled days in the movement direction…
    let steps = 0;
    while (props.isDayDisabled(target) && steps < MaxDisabledSkip) {
      target = addDays(target, dir);
      steps += 1;
    }
    // …and clamp back toward the origin when none exist (min/max edges).
    if (props.isDayDisabled(target)) {
      target = next;
      steps = 0;
      while (props.isDayDisabled(target) && steps < MaxDisabledSkip) {
        target = addDays(target, -dir);
        steps += 1;
      }
    }
    if (props.isDayDisabled(target)) return; // nothing focusable in reach — stay put
  }
  interacted = true;
  if (target.month !== props.viewMonth.month || target.year !== props.viewMonth.year) {
    emit('update:viewMonth', startOfMonth(target));
  }
  emit('update:focusedDate', target);
}

function onCellKeydown(event: KeyboardEvent, date: Temporal.PlainDate, outOfMonth: boolean): void {
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      moveFocus(addDays(date, 1), 1);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      moveFocus(addDays(date, -1), -1);
      break;
    case 'ArrowDown':
      event.preventDefault();
      moveFocus(addDays(date, 7), 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      moveFocus(addDays(date, -7), -1);
      break;
    case 'Home':
      // Scan toward the origin so a disabled week start clamps to the
      // first enabled day of the week instead of leaving it.
      event.preventDefault();
      moveFocus(addDays(date, -sundayIndex(date)), 1);
      break;
    case 'End':
      event.preventDefault();
      moveFocus(addDays(date, 6 - sundayIndex(date)), -1);
      break;
    case 'PageDown':
      event.preventDefault();
      moveFocus(addMonths(date, event.shiftKey ? 12 : 1), 1);
      break;
    case 'PageUp':
      event.preventDefault();
      moveFocus(addMonths(date, event.shiftKey ? -12 : -1), -1);
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (!props.isDayDisabled?.(date)) props.onDayActivate?.(date, { outOfMonth });
      break;
  }
}

function dayDisabled(date: Temporal.PlainDate): boolean {
  return props.isDayDisabled?.(date) ?? false;
}

const cells = computed(() => buildMonthGrid(props.viewMonth.year, props.viewMonth.month));

/* Each row carries the date it starts on: a positional index would reuse the wrong row on a month change. */
const weeks = computed(() =>
  Array.from({ length: 6 }, (_, w) => cells.value.slice(w * 7, w * 7 + 7)).map((week) => ({
    key: week[0]?.date.toString() ?? '',
    cells: week,
  })),
);

/* Roving tab stop — the focused date unless it's disabled (e.g. today before `min`); then
   the first enabled cell so the grid stays Tab-reachable. */
const tabStopDate = computed(() => {
  if (!dayDisabled(props.focusedDate)) return props.focusedDate;
  const fallback =
    cells.value.find((c) => !c.outOfMonth && !dayDisabled(c.date)) ?? cells.value.find((c) => !dayDisabled(c.date));
  return fallback ? fallback.date : props.focusedDate;
});

function onCellClick(date: Temporal.PlainDate, outOfMonth: boolean): void {
  if (dayDisabled(date)) return;
  interacted = true;
  props.onDayActivate?.(date, { outOfMonth });
  emit('update:focusedDate', date);
  if (outOfMonth) emit('update:viewMonth', startOfMonth(date));
}

/** The consumer's per-day attrs minus `class`, which is folded into the cell's own `cn()`. */
function cellAttrs(date: Temporal.PlainDate, outOfMonth: boolean): Record<string, unknown> {
  const consumer = props.dayProps?.(date, { outOfMonth }) ?? {};
  const { class: _class, ...rest } = consumer as Record<string, unknown>;
  return rest;
}

/*
 * `bg-primary/10` — the ghost/outline hover the rest of the package uses (see
 * `Button.variants`) — NOT `bg-muted`: the grid paints on `bg-popover`, and in most themes
 * `muted` and `popover` are within a point of each other, so a muted hover is invisible.
 * A tint of the selection colour reads on every surface, light and dark.
 *
 * Both halves are also what a consumer's `dayProps` OVERRIDES for its selected cells, and
 * tailwind-merge can only drop a class it recognises as conflicting — same utility group AND
 * same variant. So a consumer that wants a different selected-hover has to spell both
 * `hover:bg-*` and `hover:text-*`; a bare `text-primary-foreground` does not displace
 * `hover:text-foreground` here and the day number flips to near-black on hover.
 */
function cellClass(date: Temporal.PlainDate, outOfMonth: boolean): string {
  const consumer = props.dayProps?.(date, { outOfMonth });
  return cn(
    'grid h-9 w-9 place-items-center text-sm transition-colors',
    'hover:bg-primary/10 hover:text-foreground',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    outOfMonth && 'text-muted-foreground/60',
    dayDisabled(date) && 'pointer-events-none opacity-40',
    consumer?.class,
  );
}

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel` and
   stop reaching the DOM. It is read off the attrs so it can be relocated onto the grid. */
const ariaLabel = computed(() => (attrs[AriaAttribute.Label] as string | undefined) ?? 'Calendar');

const monthLabel = computed(() =>
  props.viewMonth.toLocaleString(locale.locale.value, { month: 'long', year: 'numeric' }),
);

const rootClass = computed(() =>
  cn(
    'inline-flex flex-col gap-2 rounded-md border border-border bg-popover p-3 text-popover-foreground',
    attrs.class as ClassValue,
  ),
);

const WeekdayLabels = computed(() =>
  Array.from({ length: 7 }, (_, index) =>
    addDays(props.viewMonth.subtract({ days: sundayIndex(props.viewMonth) }), index).toLocaleString(
      locale.locale.value,
      { weekday: 'short' },
    ),
  ),
);
const ChevronLeftIcon = ChevronLeft;
const ChevronRightIcon = ChevronRight;

defineExpose({ el: root });

const locale = useLocale();
</script>

<template>
  <div ref="root" :class="rootClass">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 px-1">
      <button
        type="button"
        :aria-label="locale.t('MonthGrid.previousMonth', undefined, 'Previous month')"
        class="grid h-7 w-7 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        @click="emit('update:viewMonth', addMonths(viewMonth, -1))"
      >
        <ChevronLeftIcon class="h-4 w-4" />
      </button>
      <div class="text-sm font-medium" aria-live="polite">{{ monthLabel }}</div>
      <button
        type="button"
        :aria-label="locale.t('MonthGrid.nextMonth', undefined, 'Next month')"
        class="grid h-7 w-7 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        @click="emit('update:viewMonth', addMonths(viewMonth, 1))"
      >
        <ChevronRightIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Weekday row -->
    <div class="grid grid-cols-7 gap-0 px-1">
      <div
        v-for="w in WeekdayLabels"
        :key="w"
        class="grid h-7 w-9 place-items-center text-xs font-medium text-muted-foreground"
      >
        {{ w }}
      </div>
    </div>

    <!-- Day grid -->
    <div ref="grid" role="grid" :aria-label="ariaLabel" class="px-1">
      <div v-for="week in weeks" :key="week.key" role="row" class="grid grid-cols-7 gap-0">
        <button
          v-for="cell in week.cells"
          :key="cell.date.toString()"
          type="button"
          role="gridcell"
          :data-date="cell.date.toString()"
          :aria-disabled="dayDisabled(cell.date) || undefined"
          :data-today="isToday(cell.date) ? '' : undefined"
          :data-out-of-month="cell.outOfMonth ? '' : undefined"
          :data-disabled="dayDisabled(cell.date) ? '' : undefined"
          :tabindex="isSameDay(tabStopDate, cell.date) ? 0 : -1"
          v-bind="cellAttrs(cell.date, cell.outOfMonth)"
          :class="cellClass(cell.date, cell.outOfMonth)"
          @click="onCellClick(cell.date, cell.outOfMonth)"
          @keydown="onCellKeydown($event, cell.date, cell.outOfMonth)"
        >
          {{ cell.date.day }}
        </button>
      </div>
    </div>
  </div>
</template>
