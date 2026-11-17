<script lang="ts">
import { cn, Severity } from '../../../foundation/styles';
import { useToastCountdown, type ToastCountdownProps } from './UseToastCountdown';

/** Defines props for the countdown ring. */
export interface ToastRingProps extends ToastCountdownProps {
  /** The close-button variant, drawing a thin ring around it with a dim arc for the elapsed time. */
  readonly isAroundClose?: boolean;
}

/** @internal The countdown-ring stroke per severity — the bar's tones, drawn as an arc. */
const RingClasses: Record<Severity, string> = {
  [Severity.Neutral]: 'stroke-primary',
  [Severity.Info]: 'stroke-info',
  [Severity.Success]: 'stroke-success',
  [Severity.Warning]: 'stroke-warning',
  [Severity.Danger]: 'stroke-destructive',
};

/** @internal The ring's radius in the 16×16 view box. */
const RingRadius = 6;

/** @internal The ring's circumference, which is the dash the countdown drains. */
const RingCircumference = 2 * Math.PI * RingRadius;
</script>

<script setup lang="ts">
import { useTemplateRef } from 'vue';

/** Renders the countdown ring — an arc draining clockwise from twelve o'clock. */
defineOptions({ name: 'ToastRing' });

const props = withDefaults(defineProps<ToastRingProps>(), {
  elapsed: 0,
  isPaused: false,
  severity: Severity.Neutral,
  isAroundClose: false,
});

const arc = useTemplateRef<SVGCircleElement>('arc');
useToastCountdown(() => arc.value, [{ strokeDashoffset: '0' }, { strokeDashoffset: `${RingCircumference}` }], props);
</script>

<template>
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    :class="cn('-rotate-90 motion-reduce:hidden', props.isAroundClose ? 'size-full' : 'size-4')"
  >
    <circle
      cx="8"
      cy="8"
      :r="RingRadius"
      fill="none"
      :stroke-width="props.isAroundClose ? 1 : 2"
      :stroke-opacity="props.isAroundClose ? 0.22 : 1"
      :class="props.isAroundClose ? 'stroke-muted-foreground' : 'stroke-border'"
    />
    <circle
      ref="arc"
      cx="8"
      cy="8"
      :r="RingRadius"
      fill="none"
      :stroke-width="props.isAroundClose ? 1 : 2"
      :stroke-opacity="props.isAroundClose ? 0.85 : 1"
      stroke-linecap="round"
      :stroke-dasharray="RingCircumference"
      :class="props.isAroundClose ? 'stroke-muted-foreground' : RingClasses[props.severity]"
    />
  </svg>
</template>
