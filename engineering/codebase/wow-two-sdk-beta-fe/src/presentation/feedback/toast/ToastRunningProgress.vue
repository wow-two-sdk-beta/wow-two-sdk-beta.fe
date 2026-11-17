<script lang="ts">
import type { NoticeProgress } from '../../../feedback';
import { cn, Severity } from '../../../foundation/styles';

/** Defines props for the running operation's progress bar. */
export interface ToastRunningProgressProps {
  /** The running operation's progress. Omit `value` for indeterminate; `max` defaults to 1. */
  readonly progress: NoticeProgress;

  /** The severity palette of the fill. Default `neutral`. */
  readonly severity?: Severity;

  /** Draws the thinner bar of compact cards and group rows. */
  readonly isCompact?: boolean;
}

/** @internal The fill colour per severity; the neutral bar uses the brand primary. */
const FillClasses: Record<Severity, string> = {
  [Severity.Neutral]: 'bg-primary',
  [Severity.Info]: 'bg-info',
  [Severity.Success]: 'bg-success',
  [Severity.Warning]: 'bg-warning',
  [Severity.Danger]: 'bg-destructive',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useId } from 'vue';

import { AriaAttribute } from '../../../foundation/dom';
import { useLocale } from '../../../foundation/i18n';

/**
 * Renders the progress of a running operation as a slim bar with an optional step label under it. Name the bar
 * with `aria-labelledby`; without it, `progress.label` does.
 */
defineOptions({ name: 'ToastRunningProgress', inheritAttrs: false });

const props = withDefaults(defineProps<ToastRunningProgressProps>(), { severity: Severity.Neutral });

const attrs = useAttrs();
const locale = useLocale();
const labelId = useId();

/** The id of the element that names the bar — the toast's title. */
const labelledby = computed(() => attrs[AriaAttribute.LabelledBy] as string | undefined);

/** The fallthrough attributes minus `class` and the one relocated to the bar. */
const rest = computed(() => {
  const { class: _class, [AriaAttribute.LabelledBy]: _labelledby, ...others } = attrs;
  return others;
});

const rootClasses = computed(() => cn('min-w-0', attrs.class as string | undefined));

/** The usable maximum — 1 when absent, zero, negative or not finite. */
const max = computed(() => {
  const value = props.progress.max;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1;
});

/** The value kept inside 0–`max`; `undefined` (or `NaN`) is indeterminate. */
const now = computed(() => {
  const value = props.progress.value;
  return typeof value === 'number' && !Number.isNaN(value) ? Math.min(max.value, Math.max(0, value)) : undefined;
});

const percent = computed(() => (now.value === undefined ? undefined : (now.value / max.value) * 100));
const label = computed(() => props.progress.label || undefined);
const fallbackName = computed(() => label.value ?? locale.t('Toast.progress', undefined, 'Progress'));

const trackClasses = computed(() =>
  cn('relative w-full overflow-hidden rounded-full bg-foreground/15', props.isCompact ? 'h-0.5' : 'h-1'),
);

/** The fill's classes; reduced motion keeps the indeterminate fill still, at a third of the track. */
const fillClasses = computed(() =>
  cn(
    'h-full rounded-full',
    FillClasses[props.severity],
    percent.value === undefined
      ? 'w-1/3 motion-safe:animate-[indeterminate_1.4s_ease-in-out_infinite]'
      : 'motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out',
  ),
);
</script>

<template>
  <div data-toast-running v-bind="rest" :class="rootClasses">
    <div
      role="progressbar"
      data-toast-running-bar
      :data-toast-running-mode="percent === undefined ? 'indeterminate' : 'determinate'"
      :aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuenow="now"
      :aria-labelledby="labelledby"
      :aria-label="labelledby ? undefined : fallbackName"
      :aria-describedby="labelledby && label ? labelId : undefined"
      :class="trackClasses"
    >
      <div
        data-toast-running-fill
        :class="fillClasses"
        :style="percent === undefined ? undefined : { width: `${percent}%` }"
      />
    </div>
    <div v-if="label" :id="labelId" data-toast-running-label class="mt-1 text-xs text-muted-foreground">
      {{ label }}
    </div>
  </div>
</template>
