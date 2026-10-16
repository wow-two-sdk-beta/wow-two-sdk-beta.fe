<script lang="ts">
import type { Temporal } from 'temporal-polyfill';

/** Shared, bounded hour/minute listboxes for the time and datetime control families. */
export interface TimeColumnsProps {
  readonly modelValue: Temporal.PlainTime | null;
  /** Offered minute interval, integer 1–60. Invalid values use 5. */
  readonly minuteStep?: number;
  readonly min?: Temporal.PlainTime | null;
  readonly max?: Temporal.PlainTime | null;
  readonly isDisabled?: boolean;
  readonly isReadOnly?: boolean;
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, useAttrs, useId, useTemplateRef, watch } from 'vue';
import { Temporal as TemporalValue } from 'temporal-polyfill';
import { cn } from '../../foundation/styles';
import { useLocale } from '../../foundation/i18n';
import { clampTime, isTimeInBounds, normalizeMinuteStep } from './DateExtensions';

defineOptions({ name: 'TimeColumns', inheritAttrs: false });
const props = defineProps<TimeColumnsProps>();
const emit = defineEmits<{ 'update:modelValue': [value: Temporal.PlainTime] }>();
const attrs = useAttrs();
const locale = useLocale();
const id = useId();
const root = useTemplateRef<HTMLDivElement>('root');
const hoursEl = useTemplateRef<HTMLDivElement>('hoursEl');
const minutesEl = useTemplateRef<HTMLDivElement>('minutesEl');
const hours = Array.from({ length: 24 }, (_, hour) => hour);
const minuteList = computed(() => {
  const step = normalizeMinuteStep(props.minuteStep);
  const rows = Array.from({ length: Math.ceil(60 / step) }, (_, index) => index * step);
  // Current and boundary minutes stay reachable even when outside the offered interval.
  for (const time of [props.modelValue, props.min, props.max]) if (time) rows.push(time.minute);
  return [...new Set(rows)].sort((a, b) => a - b);
});
const inactive = computed(() => props.isDisabled || props.isReadOnly);
const activeHour = ref<number | null>(null);
const activeMinute = ref<number | null>(null);
const timeAt = (hour: number, minute: number): Temporal.PlainTime => new TemporalValue.PlainTime(hour, minute);
const hourTime = (hour: number): Temporal.PlainTime =>
  clampTime(timeAt(hour, props.modelValue?.minute ?? 0), props.min, props.max);
const enabledHour = (hour: number): boolean =>
  hourTime(hour).hour === hour && isTimeInBounds(hourTime(hour), props.min, props.max);
const selectedHour = computed(() => props.modelValue?.hour ?? activeHour.value ?? props.min?.hour ?? 0);
const enabledMinute = (minute: number): boolean =>
  isTimeInBounds(timeAt(selectedHour.value, minute), props.min, props.max);

watch(
  () => [props.modelValue, props.min, props.max, props.minuteStep],
  () => {
    activeHour.value =
      props.modelValue && enabledHour(props.modelValue.hour)
        ? props.modelValue.hour
        : (hours.find(enabledHour) ?? null);
    activeMinute.value =
      props.modelValue && enabledMinute(props.modelValue.minute)
        ? props.modelValue.minute
        : (minuteList.value.find(enabledMinute) ?? null);
  },
  { immediate: true },
);

watch(
  [activeHour, activeMinute],
  async () => {
    await nextTick();
    hoursEl.value?.querySelector<HTMLElement>('[data-active]')?.scrollIntoView?.({ block: 'nearest' });
    minutesEl.value?.querySelector<HTMLElement>('[data-active]')?.scrollIntoView?.({ block: 'nearest' });
  },
  { flush: 'post' },
);

function select(column: 'hour' | 'minute', value: number): void {
  if (inactive.value) return;
  const next = column === 'hour' ? hourTime(value) : timeAt(selectedHour.value, value);
  if (!isTimeInBounds(next, props.min, props.max)) return;
  if (column === 'hour') {
    activeHour.value = next.hour;
    activeMinute.value = next.minute;
    hoursEl.value?.focus();
  } else {
    activeMinute.value = next.minute;
    minutesEl.value?.focus();
  }
  emit('update:modelValue', next);
}

function onKeydown(event: KeyboardEvent, column: 'hour' | 'minute'): void {
  if (event.defaultPrevented || event.isComposing || inactive.value) return;
  const active = column === 'hour' ? activeHour : activeMinute;
  const rows = column === 'hour' ? hours.filter(enabledHour) : minuteList.value.filter(enabledMinute);
  if (!rows.length) return;
  const index = rows.indexOf(active.value ?? -1);
  let next = index;
  switch (event.key) {
    case 'ArrowDown':
      next = Math.min(index + 1, rows.length - 1);
      break;
    case 'ArrowUp':
      next = Math.max(index - 1, 0);
      break;
    case 'Home':
      next = 0;
      break;
    case 'End':
      next = rows.length - 1;
      break;
    case 'PageDown':
      next = Math.min(index + 5, rows.length - 1);
      break;
    case 'PageUp':
      next = Math.max(index - 5, 0);
      break;
    case 'Enter':
    case ' ':
      if (active.value !== null) select(column, active.value);
      event.preventDefault();
      return;
    default:
      return;
  }
  event.preventDefault();
  active.value = rows[next] ?? null;
}

function cellClass(selected: boolean, active: boolean): string {
  return cn(
    'grid h-8 w-12 shrink-0 place-items-center rounded-sm text-sm transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40',
    selected && 'bg-primary text-primary-foreground hover:bg-primary/90',
    active && 'ring-1 ring-inset ring-ring',
  );
}
const pad = (value: number): string => String(value).padStart(2, '0');
const passthroughAttrs = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class')));
const rootClass = computed(() =>
  cn(
    'flex gap-1 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md',
    attrs.class as string,
  ),
);
defineExpose({ el: root });
</script>

<template>
  <div ref="root" :class="rootClass" v-bind="passthroughAttrs">
    <div
      ref="hoursEl"
      role="listbox"
      :aria-label="locale.t('TimeColumns.hours', undefined, 'Hours')"
      :tabindex="isDisabled ? -1 : 0"
      :aria-disabled="isDisabled || undefined"
      :aria-readonly="isReadOnly || undefined"
      :aria-activedescendant="activeHour === null ? undefined : `${id}-h-${activeHour}`"
      class="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-1 outline-none"
      @keydown="onKeydown($event, 'hour')"
    >
      <button
        v-for="hour in hours"
        :id="`${id}-h-${hour}`"
        :key="hour"
        type="button"
        role="option"
        tabindex="-1"
        :disabled="inactive || !enabledHour(hour)"
        :aria-selected="modelValue?.hour === hour"
        :data-active="activeHour === hour ? '' : undefined"
        :data-selected="modelValue?.hour === hour ? '' : undefined"
        :class="cellClass(modelValue?.hour === hour, activeHour === hour)"
        @click="select('hour', hour)"
      >
        {{ pad(hour) }}
      </button>
    </div>
    <div
      ref="minutesEl"
      role="listbox"
      :aria-label="locale.t('TimeColumns.minutes', undefined, 'Minutes')"
      :tabindex="isDisabled ? -1 : 0"
      :aria-disabled="isDisabled || undefined"
      :aria-readonly="isReadOnly || undefined"
      :aria-activedescendant="activeMinute === null ? undefined : `${id}-m-${activeMinute}`"
      class="flex max-h-56 flex-col gap-0.5 overflow-y-auto outline-none"
      @keydown="onKeydown($event, 'minute')"
    >
      <button
        v-for="minute in minuteList"
        :id="`${id}-m-${minute}`"
        :key="minute"
        type="button"
        role="option"
        tabindex="-1"
        :disabled="inactive || !enabledMinute(minute)"
        :aria-selected="modelValue?.minute === minute"
        :data-active="activeMinute === minute ? '' : undefined"
        :data-selected="modelValue?.minute === minute ? '' : undefined"
        :class="cellClass(modelValue?.minute === minute, activeMinute === minute)"
        @click="select('minute', minute)"
      >
        {{ pad(minute) }}
      </button>
    </div>
  </div>
</template>
