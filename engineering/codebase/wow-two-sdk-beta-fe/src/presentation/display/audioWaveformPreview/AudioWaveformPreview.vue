<script lang="ts">
/** Defines the AudioWaveformPreview color tone. */
export const AudioWaveformPreviewTone = {
  /** Refers to the primary brand color. */
  Brand: 'brand',
  /** Refers to the positive / confirmation color. */
  Success: 'success',
  /** Refers to the caution color. */
  Warning: 'warning',
  /** Refers to the destructive / error color. */
  Danger: 'danger',
  /** Refers to the muted color. */
  Muted: 'muted',
  /** Refers to the inherited `currentColor`. */
  Current: 'current',
} as const;

export type AudioWaveformPreviewTone = (typeof AudioWaveformPreviewTone)[keyof typeof AudioWaveformPreviewTone];

const ToneClass: Record<AudioWaveformPreviewTone, string> = {
  brand: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
  current: '',
};

export interface AudioWaveformPreviewProps {
  /** The per-bin amplitudes in 0..1. */
  readonly peaks: ReadonlyArray<number>;
  /** The played fraction in 0..1. Default `0`. */
  readonly progress?: number;
  /** The SVG width in px. Default `320`. */
  readonly width?: number;
  /** The SVG height in px. Default `48`. */
  readonly height?: number;
  /** The width of a single bar in px. Default `2`. */
  readonly barWidth?: number;
  /** The gap between bars in px. Default `1`. */
  readonly gap?: number;
  /** The color tone. Default `brand`. */
  readonly tone?: AudioWaveformPreviewTone;
  /**
   * Fires with the seeked progress in 0..1.
   *
   * Kept a prop rather than an emit because its *presence* is load-bearing —
   * it decides `role="slider"` vs `role="img"` when `isInteractive` is omitted,
   * and Vue strips declared emit listeners out of `useAttrs()`, leaving no way
   * to observe them.
   */
  readonly onSeek?: (progress: number) => void;
  /** The interactive state. Defaults to whether `onSeek` was supplied. */
  readonly isInteractive?: boolean;
}

/** Resample `peaks` to exactly `n` bars by max-pooling consecutive runs. */
function sampleTo(peaks: ReadonlyArray<number>, n: number): ReadonlyArray<number> {
  if (peaks.length === 0) return new Array<number>(n).fill(0);
  if (peaks.length === n) return peaks;
  const out: Array<number> = new Array<number>(n);
  const ratio = peaks.length / n;
  for (let i = 0; i < n; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.max(start + 1, Math.floor((i + 1) * ratio));
    let max = 0;
    for (let j = start; j < end && j < peaks.length; j++) {
      const v = Math.abs(peaks[j]!);
      if (v > max) max = v;
    }
    out[i] = max;
  }
  return out;
}

interface Bar {
  index: number;
  x: number;
  y: number;
  height: number;
  isPlayed: boolean;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

const locale = useLocale();

/**
 * Renders an SVG bar waveform from per-bin `peaks` amplitudes, seekable by click and arrow keys.
 *
 * `peaks` are amplitudes in 0..1. Seeking is live only when `onSeek` is provided.
 */
defineOptions({ name: 'AudioWaveformPreview', inheritAttrs: false });

const props = withDefaults(defineProps<AudioWaveformPreviewProps>(), {
  /* `peaks` stays declared-required — Vue still warns when it is missing — but a
     default keeps an absent (or transiently-undefined) value from reaching
     `sampleTo`, which read `.length` off it and took the whole page down. */
  peaks: () => [],
  progress: 0,
  width: 320,
  height: 48,
  barWidth: 2,
  gap: 1,
  tone: 'brand',
  onSeek: undefined,
  // `undefined` is meaningful — it falls back to `onSeek != null`. Without an
  // explicit default Vue would cast the absent Boolean prop to `false`.
  isInteractive: undefined,
});

const attrs = useAttrs();
const el = useTemplateRef<SVGSVGElement>('el');

const positive = (value: number, fallback: number): number => (Number.isFinite(value) && value > 0 ? value : fallback);
const resolvedWidth = computed(() => positive(props.width, 320));
const resolvedHeight = computed(() => positive(props.height, 48));
const resolvedBarWidth = computed(() => positive(props.barWidth, 2));
const stepX = computed(() => resolvedBarWidth.value + (Number.isFinite(props.gap) && props.gap >= 0 ? props.gap : 1));
// Do not invent amplitude samples or render more bars than horizontal pixels.
const barCount = computed(() =>
  Math.max(1, Math.min(props.peaks.length || 1, Math.floor(resolvedWidth.value / Math.max(1, stepX.value)))),
);
const resolvedProgress = computed(() =>
  Number.isFinite(props.progress) ? Math.max(0, Math.min(1, props.progress)) : 0,
);
const playedBars = computed(() => Math.round(resolvedProgress.value * barCount.value));
const resolvedInteractive = computed(() => props.isInteractive ?? props.onSeek != null);

const bars = computed<ReadonlyArray<Bar>>(() =>
  sampleTo(props.peaks, barCount.value).map((amp, index) => {
    const height = Math.max(
      1,
      (Number.isFinite(amp) ? Math.max(0, Math.min(1, Math.abs(amp))) : 0) * resolvedHeight.value,
    );
    return {
      index,
      x: index * (resolvedWidth.value / barCount.value),
      y: (resolvedHeight.value - height) / 2,
      height,
      isPlayed: index < playedBars.value,
    };
  }),
);

function seekFromX(clientX: number, rect: DOMRect): void {
  if (!Number.isFinite(clientX) || !Number.isFinite(rect.width) || rect.width <= 0) return;
  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  props.onSeek?.(x / rect.width);
}

function onClick(event: MouseEvent): void {
  if (!resolvedInteractive.value || event.defaultPrevented) return;
  const rect = el.value?.getBoundingClientRect();
  if (rect) seekFromX(event.clientX, rect);
}

function onKeydown(event: KeyboardEvent): void {
  const seek = props.onSeek;
  if (!seek || !resolvedInteractive.value || event.defaultPrevented || event.isComposing) return;
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    seek(Math.min(1, resolvedProgress.value + 0.05));
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    seek(Math.max(0, resolvedProgress.value - 0.05));
  } else if (event.key === 'Home') {
    event.preventDefault();
    seek(0);
  } else if (event.key === 'End') {
    event.preventDefault();
    seek(1);
  }
}

const classes = computed(() =>
  cn(
    'inline-block',
    resolvedInteractive.value &&
      'cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
    ToneClass[props.tone],
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!-- Own attrs, then `rest` (a consumer attr wins, as React's trailing `{...rest}` did),
       then own handlers last so a consumer's handler runs first. -->
  <svg
    ref="el"
    :role="resolvedInteractive ? 'slider' : 'img'"
    :aria-label="locale.t('AudioWaveformPreview.audioWaveform', undefined, 'Audio waveform')"
    :aria-valuenow="resolvedInteractive ? Math.round(resolvedProgress * 100) : undefined"
    :aria-valuemin="resolvedInteractive ? 0 : undefined"
    :aria-valuemax="resolvedInteractive ? 100 : undefined"
    :tabindex="resolvedInteractive ? 0 : -1"
    :width="resolvedWidth"
    :height="resolvedHeight"
    :viewBox="`0 0 ${resolvedWidth} ${resolvedHeight}`"
    preserveAspectRatio="none"
    v-bind="rest"
    :class="classes"
    @click="onClick"
    @keydown="onKeydown"
  >
    <rect
      v-for="bar in bars"
      :key="bar.index"
      :x="bar.x"
      :y="bar.y"
      :width="resolvedBarWidth"
      :height="bar.height"
      :rx="1"
      :class="bar.isPlayed ? 'fill-current' : 'fill-current opacity-30'"
    />
  </svg>
</template>
