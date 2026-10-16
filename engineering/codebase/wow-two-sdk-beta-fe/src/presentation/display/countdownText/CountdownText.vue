<script lang="ts">
import type { Temporal } from 'temporal-polyfill';

/** Defines the time left until a countdown's target, split into whole units. */
export interface CountdownParts {
  /** The whole days left. */
  readonly days: number;

  /** The hours left after the days, 0–23. */
  readonly hours: number;

  /** The minutes left after the hours, 0–59. */
  readonly minutes: number;

  /** The seconds left after the minutes, 0–59, rounded up so the text reaches zero with the target. */
  readonly seconds: number;

  /** The whole time left in ms, never negative. */
  readonly totalMs: number;
}

/** Defines props for the ticking countdown. */
export interface CountdownTextProps {
  /** The moment the countdown reaches zero — a `Temporal.Instant` or epoch milliseconds. */
  readonly to: Temporal.Instant | number;

  /** Pauses ticking; the text holds the last shown value until resumed. */
  readonly isPaused?: boolean;

  /** The text for the time left. Default a clock — `1:02:03`, `02:03`, or `2d 01:02:03` with days. */
  readonly format?: (parts: CountdownParts) => string;
}

/** @internal Milliseconds per unit. */
const MsPer = { day: 86_400_000, hour: 3_600_000, minute: 60_000, second: 1000 } as const;

/** @internal Splits a remaining duration into display units, rounding seconds up. */
function toParts(totalMs: number): CountdownParts {
  const clamped = Math.max(0, totalMs);
  let rest = Math.ceil(clamped / MsPer.second);
  const days = Math.floor(rest / (MsPer.day / MsPer.second));
  rest -= days * (MsPer.day / MsPer.second);
  const hours = Math.floor(rest / 3600);
  rest -= hours * 3600;
  const minutes = Math.floor(rest / 60);
  return { days, hours, minutes, seconds: rest - minutes * 60, totalMs: clamped };
}

/** @internal Pads a unit to two digits. */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** @internal The ISO 8601 duration a `<time>` element carries. */
function isoDuration(parts: CountdownParts): string {
  const time = `T${parts.hours}H${parts.minutes}M${parts.seconds}S`;
  return parts.days > 0 ? `P${parts.days}D${time}` : `P${time}`;
}
</script>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose, shallowRef, useAttrs, watch } from 'vue';
import { useLocale } from '../../../foundation/i18n';
import { cn } from '../../../foundation/styles';

/** Renders the time left until a target instant as ticking text, and reports when it reaches zero. */
defineOptions({ name: 'CountdownText', inheritAttrs: false });

defineSlots<{
  /** Replaces the text; receives the split time left and the formatted text. */
  default?(props: { parts: CountdownParts; text: string }): unknown;
}>();

const props = withDefaults(defineProps<CountdownTextProps>(), {
  isPaused: false,
  format: undefined,
});

const emit = defineEmits<{
  /** Fires once when the countdown reaches zero, or on mount when the target has already passed. */
  complete: [];
}>();

const attrs = useAttrs();
const locale = useLocale();

/** The clock reading the text is computed from; it advances only while ticking. */
const now = shallowRef(Date.now());

/** @internal The pending tick. */
let timer: ReturnType<typeof setTimeout> | null = null;

/** @internal The target that already reported `complete`, so each target completes once. */
let completedTarget: number | null = null;

/** The target in epoch milliseconds; a non-finite target counts as already reached. */
const targetMs = computed(() => {
  const value = typeof props.to === 'number' ? props.to : props.to.epochMilliseconds;
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
});

const parts = computed(() => toParts(targetMs.value - now.value));

const text = computed(() => {
  if (props.format) return props.format(parts.value);
  const { days, hours, minutes, seconds } = parts.value;
  const clock =
    hours > 0 || days > 0
      ? `${days > 0 ? pad(hours) : hours}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${locale.t('CountdownText.days', { days }, '{days}d')} ${clock}` : clock;
});

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** Restarts ticking when the target or the pause state changes. */
watch([targetMs, () => props.isPaused], restart);

onMounted(restart);
onScopeDispose(stop);

/** Cancels the pending tick. */
function stop(): void {
  if (timer === null) return;
  clearTimeout(timer);
  timer = null;
}

/** Reads the clock, reports completion once per target, and schedules the next second boundary. */
function tick(): void {
  timer = null;
  now.value = Date.now();
  const remaining = targetMs.value - now.value;
  if (remaining <= 0) {
    if (completedTarget !== targetMs.value) {
      completedTarget = targetMs.value;
      emit('complete');
    }
    return;
  }
  if (props.isPaused) return;
  timer = setTimeout(tick, remaining % MsPer.second || MsPer.second);
}

/** Starts ticking from the current clock, unless paused. */
function restart(): void {
  stop();
  if (props.isPaused) return;
  tick();
}
</script>

<template>
  <time
    role="timer"
    aria-atomic="true"
    :datetime="isoDuration(parts)"
    v-bind="rest"
    :class="cn('tabular-nums', attrs.class as string | undefined)"
    :data-complete="parts.totalMs === 0 ? '' : undefined"
  >
    <slot :parts="parts" :text="text">{{ text }}</slot>
  </time>
</template>
