<script lang="ts">
import { Temporal } from 'temporal-polyfill';
import { addDays } from '../../forms/DateExtensions';

// GanttTimeline models tasks/milestones as date-only spans → `Temporal.PlainDate`
// (calendar math, no time zone), the shape the day-column grid wants. Day
// counts + iteration go through the shared, Temporal-based `DateExtensions`.

export interface GanttTimelineTask {
  readonly id: string;
  /** The row label. React took a `ReactNode`; richer content goes through the `task` slot. */
  readonly label: string | number;
  readonly start: Temporal.PlainDate;
  readonly end: Temporal.PlainDate;
  readonly color?: string;
  /** 0..1 — fills the bar from the left. */
  readonly progress?: number;
}

export interface GanttTimelineDependency {
  readonly from: string;
  readonly to: string;
}

export interface GanttTimelineMilestone {
  readonly id: string;
  /** The milestone label. React took a `ReactNode`; the marker itself renders no text. */
  readonly label: string | number;
  readonly date: Temporal.PlainDate;
}

export interface GanttTimelineProps {
  readonly tasks: ReadonlyArray<GanttTimelineTask>;
  readonly dependencies?: ReadonlyArray<GanttTimelineDependency>;
  readonly milestones?: ReadonlyArray<GanttTimelineMilestone>;
  readonly from?: Temporal.PlainDate;
  readonly to?: Temporal.PlainDate;
  readonly cellWidth?: number;
  readonly rowHeight?: number;
  readonly labelWidth?: number;
  readonly hasWeekends?: boolean;
}

/** Earlier of two dates. */
function minDate(a: Temporal.PlainDate, b: Temporal.PlainDate): Temporal.PlainDate {
  return Temporal.PlainDate.compare(a, b) <= 0 ? a : b;
}

/** Later of two dates. */
function maxDate(a: Temporal.PlainDate, b: Temporal.PlainDate): Temporal.PlainDate {
  return Temporal.PlainDate.compare(a, b) >= 0 ? a : b;
}

function* eachDay(from: Temporal.PlainDate, to: Temporal.PlainDate): Generator<Temporal.PlainDate> {
  let cur = from;
  while (Temporal.PlainDate.compare(cur, to) <= 0) {
    yield cur;
    cur = addDays(cur, 1);
  }
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef, type StyleValue } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { readableForeground } from '../../../foundation/themes';
import { daysBetween, isWeekend, today } from '../../forms/DateExtensions';

const locale = useLocale();

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/**
 * Renders a GanttTimeline chart — a task label column beside a day-scaled timeline of bars and milestones.
 *
 * First generation: bars are positioned by start / end, with optional dependency arrows and a "today"
 * indicator. Drag-resize, drag-move, critical path, and group rows are all deferred.
 */
defineOptions({ name: 'GanttTimeline', inheritAttrs: false });

const props = withDefaults(defineProps<GanttTimelineProps>(), {
  /* `tasks` stays declared-required — Vue still warns when it is missing — but a
     default keeps an absent (or transiently-undefined) value out of the `.length`
     and `.map().reduce()` reads below. The empty-tasks branch already exists. */
  tasks: () => [],
  dependencies: () => [],
  milestones: () => [],
  cellWidth: 40,
  rowHeight: 36,
  labelWidth: 200,
  hasWeekends: true,
});

const emit = defineEmits<{
  /** Fires when a task bar is clicked. Replaces React's `onTaskClick`. */
  'task-click': [task: GanttTimelineTask];
}>();

/** Replaces React's inline `task.label` rendering with an override hook. */
defineSlots<{
  /** Overrides a task's label, in both the label column and the bar. */
  task?(props: { task: GanttTimelineTask }): unknown;
}>();

const attrs = useAttrs();

/* `today()` reads the host time zone through `Temporal.Now` — universal, not a browser
   global, so it is safe to evaluate on the server. */
const range = computed(() => {
  if (props.tasks.length === 0) {
    const now = today();
    return { from: now, to: now, totalDays: 1 };
  }
  const minStart = props.from ?? props.tasks.map((t) => t.start).reduce(minDate);
  const maxEnd = props.to ?? props.tasks.map((t) => t.end).reduce(maxDate);
  return { from: minStart, to: maxEnd, totalDays: daysBetween(minStart, maxEnd) + 1 };
});

const rangeFrom = computed(() => range.value.from);
const totalDays = computed(() => range.value.totalDays);

const headerDates = computed(() => Array.from(eachDay(range.value.from, range.value.to)));
const todayOffset = computed(() => daysBetween(rangeFrom.value, today()));
const todayInRange = computed(() => todayOffset.value >= 0 && todayOffset.value < totalDays.value);

const taskIndex = computed(() => new Map(props.tasks.map((t, i) => [t.id, i])));

const timelineWidth = computed(() => totalDays.value * props.cellWidth);

/* Numeric CSS lengths are spelled with their unit — React's style object auto-appended `px`,
   Vue's does not, so a bare `36` would be dropped as an invalid declaration. */
const labelColumnStyle = computed<StyleValue>(() => ({ width: `${props.labelWidth}px` }));
const rowStyle = computed<StyleValue>(() => ({ height: `${props.rowHeight}px` }));
const cellStyle = computed<StyleValue>(() => ({ width: `${props.cellWidth}px` }));
const timelineStyle = computed<StyleValue>(() => ({ width: `${timelineWidth.value}px` }));
const overlayStyle = computed<StyleValue>(() => ({
  left: '0px',
  top: `${props.rowHeight}px`,
  width: `${timelineWidth.value}px`,
  height: `${props.tasks.length * props.rowHeight}px`,
}));

function headerCellClass(d: Temporal.PlainDate): string {
  return cn(
    'border-r border-border text-[10px] tabular-nums',
    isWeekend(d) && props.hasWeekends && 'bg-muted/40',
    d.day === 1 && 'border-l-2 border-l-border-strong',
  );
}

function gridlineClass(d: Temporal.PlainDate): string {
  return cn('border-r border-border/60', isWeekend(d) && props.hasWeekends && 'bg-muted/30');
}

function monthLabel(d: Temporal.PlainDate): string {
  return d.toLocaleString(undefined, { month: 'short', year: '2-digit' });
}

function barStyle(task: GanttTimelineTask): StyleValue {
  const offset = daysBetween(rangeFrom.value, task.start);
  const length = Math.max(1, daysBetween(task.start, task.end) + 1);
  return {
    left: `${offset * props.cellWidth + 4}px`,
    width: `${length * props.cellWidth - 8}px`,
    top: '6px',
    bottom: '6px',
    background: task.color,
    color: readableForeground(task.color) ?? undefined,
  };
}

function barClass(task: GanttTimelineTask): string {
  return cn(
    'absolute overflow-hidden rounded-md border border-border/60 px-2 text-left text-[11px] font-medium transition-colors hover:brightness-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    !task.color && 'bg-primary text-primary-foreground',
  );
}

function progressStyle(task: GanttTimelineTask): StyleValue {
  return { width: `${(task.progress ?? 0) * 100}%` };
}

function taskLabel(task: GanttTimelineTask): string {
  /* React narrowed a `ReactNode` label to a string before using it as a name; a numeric
     label falls back to the id here for the same reason. */
  return `${typeof task.label === 'string' ? task.label : task.id}: ${task.start.toLocaleString()} – ${task.end.toLocaleString()}`;
}

interface DependencyArrow {
  key: number;
  path: string;
  points: string;
}

const dependencyArrows = computed<Array<DependencyArrow>>(() => {
  const arrows: Array<DependencyArrow> = [];
  props.dependencies.forEach((dep, i) => {
    const fromIdx = taskIndex.value.get(dep.from);
    const toIdx = taskIndex.value.get(dep.to);
    if (fromIdx === undefined || toIdx === undefined) return;
    const fromTask = props.tasks[fromIdx]!;
    const toTask = props.tasks[toIdx]!;
    const fromX = (daysBetween(rangeFrom.value, fromTask.end) + 1) * props.cellWidth;
    const fromY = fromIdx * props.rowHeight + props.rowHeight / 2;
    const toX = daysBetween(rangeFrom.value, toTask.start) * props.cellWidth;
    const toY = toIdx * props.rowHeight + props.rowHeight / 2;
    const midX = Math.max(fromX + 8, (fromX + toX) / 2);
    arrows.push({
      key: i,
      path: `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX - 4} ${toY}`,
      points: `${toX - 4},${toY - 3} ${toX - 4},${toY + 3} ${toX},${toY}`,
    });
  });
  return arrows;
});

function milestonePoints(m: GanttTimelineMilestone): string {
  const x = daysBetween(rangeFrom.value, m.date) * props.cellWidth + props.cellWidth / 2;
  return `${x},2 ${x + 6},10 ${x},18 ${x - 6},10`;
}

const todayX = computed(() => todayOffset.value * props.cellWidth + props.cellWidth / 2);
const todayY2 = computed(() => props.tasks.length * props.rowHeight);

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
  <div
    ref="root"
    role="grid"
    :aria-label="locale.t('GanttTimeline.ganttTimelineChart', undefined, 'GanttTimeline chart')"
    :class="rootClass"
    v-bind="passthroughAttrs"
  >
    <div class="flex">
      <!-- LabelText column -->
      <div class="shrink-0 border-r border-border bg-muted/30" :style="labelColumnStyle">
        <div class="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground" :style="rowStyle">
          {{ locale.t('GanttTimeline.task', undefined, 'Task') }}
        </div>
        <div
          v-for="task in tasks"
          :key="task.id"
          class="flex items-center border-b border-border px-3 text-xs last:border-b-0"
          :style="rowStyle"
        >
          <span class="truncate font-medium">
            <slot name="task" :task="task">{{ task.label }}</slot>
          </span>
        </div>
      </div>
      <!-- Timeline -->
      <div class="relative flex-1 overflow-x-auto" style="min-width: 0">
        <div :style="timelineStyle">
          <!-- Header -->
          <div class="flex border-b border-border" :style="rowStyle">
            <div v-for="d in headerDates" :key="d.toString()" :class="headerCellClass(d)" :style="cellStyle">
              <div
                v-if="d.day === 1"
                class="border-b border-border bg-muted px-1 py-0.5 text-center font-medium text-muted-foreground"
              >
                {{ monthLabel(d) }}
              </div>
              <div class="px-1 py-0.5 text-center text-muted-foreground">{{ d.day }}</div>
            </div>
          </div>
          <!-- Rows -->
          <div
            v-for="task in tasks"
            :key="task.id"
            class="relative border-b border-border last:border-b-0"
            :style="rowStyle"
          >
            <!-- Vertical day gridlines + weekend shading -->
            <div class="absolute inset-0 flex pointer-events-none">
              <div v-for="d in headerDates" :key="d.toString()" :style="cellStyle" :class="gridlineClass(d)" />
            </div>
            <!-- Bar -->
            <button
              type="button"
              :aria-label="taskLabel(task)"
              :style="barStyle(task)"
              :class="barClass(task)"
              @click="emit('task-click', task)"
            >
              <!-- Progress fill -->
              <div
                v-if="(task.progress ?? 0) > 0"
                aria-hidden="true"
                class="absolute inset-y-0 left-0 bg-foreground/20"
                :style="progressStyle(task)"
              />
              <span class="relative inline-flex h-full items-center truncate">
                <slot name="task" :task="task">{{ task.label }}</slot>
              </span>
            </button>
          </div>
        </div>
        <!-- Dependency arrows + today line -->
        <svg class="pointer-events-none absolute" :style="overlayStyle">
          <g v-for="arrow in dependencyArrows" :key="arrow.key">
            <path :d="arrow.path" fill="none" stroke="currentColor" :stroke-width="1" class="text-border-strong" />
            <polygon :points="arrow.points" class="fill-border-strong" />
          </g>
          <g v-for="m in milestones" :key="m.id">
            <polygon :points="milestonePoints(m)" class="fill-warning stroke-warning-foreground" :stroke-width="1" />
          </g>
          <line
            v-if="todayInRange"
            :x1="todayX"
            :x2="todayX"
            :y1="0"
            :y2="todayY2"
            class="stroke-primary"
            :stroke-width="1.5"
            stroke-dasharray="4 3"
          />
        </svg>
      </div>
    </div>
  </div>
</template>
