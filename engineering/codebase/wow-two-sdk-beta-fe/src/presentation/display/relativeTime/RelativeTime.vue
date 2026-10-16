<script lang="ts">
/** Represents the prop surface of `RelativeTime`. */
export interface RelativeTimeProps {
  /** The instant — a `Date`, epoch milliseconds or an ISO-8601 string. */
  readonly value: Date | number | string;

  /** Re-renders as time passes, at a pace matched to the distance. Default `false`. */
  readonly isLive?: boolean;

  /** The instant the distance is measured from. Default: now — the clock at render, and on each live tick. */
  readonly now?: Date | number;

  /** `auto` words near distances ("yesterday", "now"); `always` keeps numbers. Default `auto`. */
  readonly numeric?: 'always' | 'auto';

  /** The unit wording length. Default `long`. */
  readonly unitDisplay?: 'long' | 'short' | 'narrow';

  /** The tooltip's absolute-time format. Default medium date and short time. */
  readonly absoluteFormat?: Intl.DateTimeFormatOptions;

  /** Shows the absolute time in a tooltip on hover. Default `true`. */
  readonly hasTooltip?: boolean;
}

const DefaultAbsoluteFormat: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

/** How often a live label re-renders: often while it counts seconds, rarely once it counts days. */
function tickMs(distanceMs: number): number {
  const distance = Math.abs(distanceMs);
  if (distance < 60_000) return 5_000;
  if (distance < 3_600_000) return 30_000;
  if (distance < 86_400_000) return 300_000;
  return 3_600_000;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useAttrs, watch } from 'vue';
import { toEpochMs, toRelativeTimeParts, useLocaleFormatters } from '../../../foundation/i18n';
import { cn } from '../../../foundation/styles';
import Tooltip from '../../overlays/tooltip/Tooltip.vue';

/**
 * Renders a `<time datetime>` reading as a relative distance ("3 days ago"), with the absolute time in a tooltip
 * and an optional live tick.
 */
defineOptions({ name: 'RelativeTime', inheritAttrs: false });

const props = withDefaults(defineProps<RelativeTimeProps>(), {
  isLive: false,
  now: undefined,
  numeric: 'auto',
  unitDisplay: 'long',
  absoluteFormat: undefined,
  hasTooltip: true,
});

const attrs = useAttrs();
const formatters = useLocaleFormatters();

/* The clock: the `now` prop when given, else the time at render, advanced by each live tick. */
const clock = shallowRef(Date.now());
const reference = computed(() => (props.now === undefined ? clock.value : toEpochMs(props.now)));

const instant = computed(() => toEpochMs(props.value));
const isValid = computed(() => Number.isFinite(instant.value));
const iso = computed(() => (isValid.value ? new Date(instant.value).toISOString() : undefined));

const relative = computed(() => {
  const parts = toRelativeTimeParts(instant.value, reference.value);
  if (!parts) return '';
  return formatters.value.relativeTime(parts.value, parts.unit, {
    numeric: props.numeric,
    style: props.unitDisplay,
  });
});

const absolute = computed(() =>
  isValid.value ? formatters.value.date(instant.value, props.absoluteFormat ?? DefaultAbsoluteFormat) : '',
);

let timer: ReturnType<typeof setTimeout> | undefined;

function stop(): void {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
}

/* A timeout chain rather than an interval, so the pace follows the distance as it grows. */
function schedule(): void {
  stop();
  if (!props.isLive || props.now !== undefined || !isValid.value) return;
  timer = setTimeout(
    () => {
      clock.value = Date.now();
      schedule();
    },
    tickMs(instant.value - clock.value),
  );
}

onMounted(() => {
  clock.value = Date.now();
  schedule();
});
watch(() => [props.isLive, props.now, props.value], schedule);
onBeforeUnmount(stop);

const classes = computed(() => cn('tabular-nums', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});
</script>

<template>
  <Tooltip v-if="props.hasTooltip && isValid" :content="absolute">
    <time v-bind="rest" :datetime="iso" :class="classes">{{ relative }}</time>
  </Tooltip>
  <time v-else v-bind="rest" :datetime="iso" :class="classes">{{ relative }}</time>
</template>
