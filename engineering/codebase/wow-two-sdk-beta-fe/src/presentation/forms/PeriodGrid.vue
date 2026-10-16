<script lang="ts">
// Shared period grid for MonthPicker and YearPicker — a three-column page of twelve months (one year) or of
// twelve years (a decade framed by its neighbours). Works in index space: a month is `year × 12 + month − 1`,
// a year is itself. Not exported from `forms/index.ts` — internal only.
import type { PeriodKind } from './PeriodExtensions';

/** Query callbacks return values; activation emits. */
export interface PeriodGridProps {
  /** Months, a year per page, or years, a decade per page. */
  readonly kind: PeriodKind;

  /** The picked cell's index, or `null`. */
  readonly selectedIndex?: number | null;

  /** The index focused when the grid mounts; clamped into `min`/`max`. */
  readonly initialIndex: number;

  /** The lowest selectable index. */
  readonly min?: number | null;

  /** The highest selectable index. */
  readonly max?: number | null;

  /** The custom per-cell disable predicate. */
  readonly isIndexDisabled?: (index: number) => boolean;
}

/** @internal Cells per row. */
const Columns = 3;

/** @internal Cells per page. */
const PageCells = 12;

/** @internal The farthest a keyboard move scans past disabled cells — covers a ten-page jump. */
const MaxDisabledSkip = 1_200;

/** @internal One cell of the page. */
interface PeriodCell {
  readonly index: number;
  readonly position: number;
  readonly isOutside: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { useLocale } from '../../foundation/i18n';
import { useId } from '../../foundation/identifiers';
import { cn } from '../../foundation/styles';
import { currentPeriodIndex, PeriodKind as PeriodKindValue, periodPageSpan, periodStartDate } from './PeriodExtensions';

/** Renders one page of months or years — period nav, a keyboard-navigable 3 × 4 cell grid. */
defineOptions({ name: 'PeriodGrid', inheritAttrs: false });

const props = withDefaults(defineProps<PeriodGridProps>(), {
  selectedIndex: null,
  min: null,
  max: null,
  isIndexDisabled: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader picks a cell by click, Enter or Space. */
  activate: [index: number];
}>();

const attrs = useAttrs();
const locale = useLocale();
const headerId = useId('period-heading');

const root = useTemplateRef<HTMLDivElement>('root');
const grid = useTemplateRef<HTMLDivElement>('grid');

const isMonths = computed(() => props.kind === PeriodKindValue.Month);
const span = computed(() => periodPageSpan(props.kind));
const currentIndex = currentPeriodIndex(props.kind);

/** Whether a cell is outside `min`/`max` or rejected by the predicate. */
function isDisabled(index: number): boolean {
  if (props.min !== null && index < props.min) return true;
  if (props.max !== null && index > props.max) return true;
  return props.isIndexDisabled?.(index) ?? false;
}

/** Clamps an index into `min`/`max`. */
function clampIndex(index: number): number {
  const floor = props.min === null ? index : Math.max(index, props.min);
  return props.max === null ? floor : Math.min(floor, props.max);
}

const focusedIndex = ref(clampIndex(props.initialIndex));

const pageStart = computed(() => Math.floor(focusedIndex.value / span.value) * span.value);

/** The page's twelve cells; a year page frames its decade with the neighbouring years. */
const cells = computed<ReadonlyArray<PeriodCell>>(() => {
  const first = isMonths.value ? pageStart.value : pageStart.value - 1;
  return Array.from({ length: PageCells }, (_, position) => ({
    index: first + position,
    position,
    isOutside: !isMonths.value && (position === 0 || position === PageCells - 1),
  }));
});

const rows = computed(() =>
  Array.from({ length: PageCells / Columns }, (_, row) => cells.value.slice(row * Columns, row * Columns + Columns)),
);

/* Roving tab stop — the focused cell unless it is disabled; then the first enabled cell on the page, so the
   grid stays Tab-reachable. */
const tabStopIndex = computed(() => {
  if (!isDisabled(focusedIndex.value)) return focusedIndex.value;
  return cells.value.find((cell) => !cell.isOutside && !isDisabled(cell.index))?.index ?? focusedIndex.value;
});

const isPreviousDisabled = computed(() => props.min !== null && pageStart.value - 1 < props.min);
const isNextDisabled = computed(() => props.max !== null && pageStart.value + span.value > props.max);

/** Formats a year with the locale's numerals. */
function yearText(year: number): string {
  return periodStartDate(PeriodKindValue.Year, year).toLocaleString(locale.locale.value, { year: 'numeric' });
}

const headerLabel = computed(() =>
  isMonths.value
    ? yearText(Math.floor(pageStart.value / 12))
    : `${yearText(pageStart.value)} – ${yearText(pageStart.value + span.value - 1)}`,
);

const previousLabel = computed(() =>
  isMonths.value
    ? locale.t('PeriodGrid.previousYear', undefined, 'Previous year')
    : locale.t('PeriodGrid.previousDecade', undefined, 'Previous decade'),
);
const nextLabel = computed(() =>
  isMonths.value
    ? locale.t('PeriodGrid.nextYear', undefined, 'Next year')
    : locale.t('PeriodGrid.nextDecade', undefined, 'Next decade'),
);

/** The visible cell text — the short month, or the year. */
function cellText(index: number): string {
  if (!isMonths.value) return yearText(index);
  return periodStartDate(props.kind, index).toLocaleString(locale.locale.value, { month: 'short' });
}

/** The month cell's full name, since the short month alone omits the year. */
function cellName(index: number): string | undefined {
  if (!isMonths.value) return undefined;
  return periodStartDate(props.kind, index).toLocaleString(locale.locale.value, { month: 'long', year: 'numeric' });
}

/* DOM focus follows the focused index only after a keyboard move — never on mount or a page-button click. */
let isKeyboardMove = false;

watch(
  focusedIndex,
  (next) => {
    if (!isKeyboardMove) return;
    isKeyboardMove = false;
    grid.value?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus();
  },
  { flush: 'post' },
);

/* Inside an open popover the focus trap lands on the first tabbable (the previous-page button); adopt it onto
   the tab-stop cell. A standalone mount outside the active element is left alone. */
let frame = 0;
onMounted(() => {
  frame = requestAnimationFrame(() => {
    if (!root.value?.contains(document.activeElement)) return;
    grid.value?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
  });
});
onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
});

/** Moves focus toward a target, skipping disabled cells and clamping back at the range edges. */
function moveFocus(target: number, direction: 1 | -1): void {
  let next = target;
  for (let steps = 0; isDisabled(next) && steps < MaxDisabledSkip; steps += 1) next += direction;
  if (isDisabled(next)) {
    next = target;
    for (let steps = 0; isDisabled(next) && steps < MaxDisabledSkip; steps += 1) next -= direction;
  }
  if (isDisabled(next) || next === focusedIndex.value) return;
  isKeyboardMove = true;
  focusedIndex.value = next;
}

function onCellKeydown(event: KeyboardEvent, cell: PeriodCell): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activate(cell.index);
    return;
  }
  const rowStart = cell.index - (cell.position % Columns);
  const page = span.value * (event.shiftKey ? 10 : 1);
  const moves: Readonly<Record<string, readonly [number, 1 | -1]>> = {
    ArrowRight: [cell.index + 1, 1],
    ArrowLeft: [cell.index - 1, -1],
    ArrowDown: [cell.index + Columns, 1],
    ArrowUp: [cell.index - Columns, -1],
    Home: [rowStart, 1],
    End: [rowStart + Columns - 1, -1],
    PageDown: [cell.index + page, 1],
    PageUp: [cell.index - page, -1],
  };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  moveFocus(move[0], move[1]);
}

/** Picks a cell; an outside cell also turns the page to it. */
function activate(index: number): void {
  if (isDisabled(index)) return;
  focusedIndex.value = index;
  emit('activate', index);
}

/** Turns one page back or forward without moving DOM focus off the page button. */
function turnPage(direction: 1 | -1): void {
  focusedIndex.value += direction * span.value;
}

const NavButtonClass =
  'grid h-7 w-7 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted ' +
  'hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:pointer-events-none disabled:opacity-40';

function cellClass(cell: PeriodCell): string {
  const isSelected = cell.index === props.selectedIndex;
  return cn(
    'h-9 w-16 rounded-md text-sm transition-colors',
    'hover:bg-primary/10 hover:text-foreground',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    cell.isOutside && 'text-muted-foreground/60',
    cell.index === currentIndex && 'font-semibold text-primary-soft-foreground',
    isSelected && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
    isDisabled(cell.index) && 'pointer-events-none opacity-40',
  );
}

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const rootClass = computed(() =>
  cn(
    'inline-flex flex-col gap-2 rounded-md border border-border bg-popover p-3 text-popover-foreground',
    attrs.class as ClassValue,
  ),
);

defineExpose({ el: root });
</script>

<template>
  <div ref="root" v-bind="rest" :class="rootClass">
    <div class="flex items-center justify-between gap-2 px-1">
      <button
        type="button"
        :aria-label="previousLabel"
        :disabled="isPreviousDisabled"
        :class="NavButtonClass"
        @click="turnPage(-1)"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>
      <div :id="headerId" class="text-sm font-medium" aria-live="polite">{{ headerLabel }}</div>
      <button
        type="button"
        :aria-label="nextLabel"
        :disabled="isNextDisabled"
        :class="NavButtonClass"
        @click="turnPage(1)"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
    <div ref="grid" role="grid" :aria-labelledby="headerId" class="flex flex-col gap-1">
      <div v-for="row in rows" :key="row[0]!.index" role="row" class="grid grid-cols-3 gap-1">
        <button
          v-for="cell in row"
          :key="cell.index"
          type="button"
          role="gridcell"
          :data-index="cell.index"
          :aria-label="cellName(cell.index)"
          :aria-selected="cell.index === props.selectedIndex"
          :aria-disabled="isDisabled(cell.index) || undefined"
          :data-selected="cell.index === props.selectedIndex ? '' : undefined"
          :data-current="cell.index === currentIndex ? '' : undefined"
          :data-outside="cell.isOutside ? '' : undefined"
          :data-disabled="isDisabled(cell.index) ? '' : undefined"
          :tabindex="cell.index === tabStopIndex ? 0 : -1"
          :class="cellClass(cell)"
          @click="activate(cell.index)"
          @keydown="onCellKeydown($event, cell)"
        >
          {{ cellText(cell.index) }}
        </button>
      </div>
    </div>
  </div>
</template>
