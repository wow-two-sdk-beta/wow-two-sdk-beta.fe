<script lang="ts">
import { cn, Severity } from '../../../foundation/styles';
import { useToastCountdown, type ToastCountdownProps } from './UseToastCountdown';

/** Defines props for the countdown bar. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ToastProgressProps extends ToastCountdownProps {}

/** @internal The countdown fill per severity; the neutral countdown uses the brand primary. */
const ProgressClasses: Record<Severity, string> = {
  [Severity.Neutral]: 'bg-primary',
  [Severity.Info]: 'bg-info',
  [Severity.Success]: 'bg-success',
  [Severity.Warning]: 'bg-warning',
  [Severity.Danger]: 'bg-destructive',
};
</script>

<script setup lang="ts">
import { useTemplateRef } from 'vue';

/** Renders the countdown bar — a scale transform draining along the toast's bottom edge. */
defineOptions({ name: 'ToastProgress' });

const props = withDefaults(defineProps<ToastProgressProps>(), {
  elapsed: 0,
  isPaused: false,
  severity: Severity.Neutral,
});

const fill = useTemplateRef<HTMLDivElement>('fill');
useToastCountdown(() => fill.value, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], props);
</script>

<template>
  <div aria-hidden="true" data-toast-progress class="absolute inset-x-0 bottom-0 h-1 motion-reduce:hidden">
    <div ref="fill" :class="cn('h-full w-full origin-left opacity-80', ProgressClasses[props.severity])" />
  </div>
</template>
