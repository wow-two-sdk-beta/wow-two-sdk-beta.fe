<script lang="ts">
import type { ToastCountdownProps } from './UseToastCountdown';

/** Defines props for the seconds display. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ToastSecondsProps extends ToastCountdownProps {}

/** @internal How often the display re-reads its clock (ms); a quarter second keeps a whole-second flip on time. */
const SecondsTickMs = 250;
</script>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

/** Renders the whole seconds left, rounded up so it reads `1s` until the toast goes. */
defineOptions({ name: 'ToastSeconds' });

const props = withDefaults(defineProps<ToastSecondsProps>(), { elapsed: 0, isPaused: false });

const left = ref(Math.max(0, props.duration - props.elapsed));
let lastTick = 0;
let handle: number | undefined;

onMounted(() => {
  if (!props.isPaused) start();
});
watch(
  () => props.isPaused,
  (isPaused) => (isPaused ? stop() : start()),
);
onUnmounted(() => {
  if (handle !== undefined) window.clearInterval(handle);
  handle = undefined;
});

/** Takes the time since the last tick off the seconds left. */
function tick(): void {
  const now = Date.now();
  left.value = Math.max(0, left.value - (now - lastTick));
  lastTick = now;
}

/** Starts the interval; a running one is left alone. */
function start(): void {
  if (handle !== undefined) return;
  lastTick = Date.now();
  handle = window.setInterval(tick, SecondsTickMs);
}

/** Banks the time spent so far and stops the interval. */
function stop(): void {
  if (handle === undefined) return;
  tick();
  window.clearInterval(handle);
  handle = undefined;
}
</script>

<template>
  <span aria-hidden="true" class="text-xs tabular-nums text-muted-foreground">{{ Math.ceil(left / 1000) }}s</span>
</template>
