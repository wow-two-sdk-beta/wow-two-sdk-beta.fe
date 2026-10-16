<script lang="ts">
export interface PointControlValue {
  readonly x: number;
  readonly y: number;
}

export interface PointControlProps {
  readonly modelValue?: PointControlValue;
  readonly defaultValue?: PointControlValue;
  readonly step?: number;
  /** The disabled state — blocks dragging and keys. */
  readonly isDisabled?: boolean;
  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;
  readonly backgroundImage?: string;
  readonly ariaLabel: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';

defineOptions({ name: 'PointControl', inheritAttrs: false });
const props = withDefaults(defineProps<PointControlProps>(), {
  defaultValue: () => ({ x: 0.5, y: 0.5 }),
  step: 0.01,
  isDisabled: undefined,
  disabled: undefined,
});

const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? false);
const emit = defineEmits<{
  'update:modelValue': [value: PointControlValue];
  'interaction-start': [];
  'interaction-end': [];
}>();
const attrs = useAttrs();
const root = useTemplateRef<HTMLDivElement>('root');
const point = useControlled<PointControlValue>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue,
  onChange: (value) => emit('update:modelValue', value),
});
const currentPoint = computed(() => point.value.value);
const rootClass = computed(() =>
  cn(
    'relative aspect-square w-full touch-none select-none overflow-hidden rounded-md border border-border bg-cover bg-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    finalDisabled.value && 'pointer-events-none opacity-50',
    attrs.class as ClassValue,
  ),
);
const passthroughAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});
const backgroundStyle = computed(() => [
  attrs.style,
  props.backgroundImage ? { backgroundImage: `url(${props.backgroundImage})` } : undefined,
]);
const clamp = (value: number): number => Math.min(1, Math.max(0, value));

function update(next: PointControlValue): void {
  point.setValue({ x: clamp(next.x), y: clamp(next.y) });
}

function updateFromPointer(clientX: number, clientY: number): void {
  const bounds = root.value?.getBoundingClientRect();
  if (!bounds || bounds.width === 0 || bounds.height === 0) return;
  update({ x: (clientX - bounds.left) / bounds.width, y: (clientY - bounds.top) / bounds.height });
}

function onPointerDown(event: PointerEvent): void {
  if (finalDisabled.value) return;
  event.preventDefault();
  root.value?.setPointerCapture(event.pointerId);
  emit('interaction-start');
  updateFromPointer(event.clientX, event.clientY);
}

function onPointerMove(event: PointerEvent): void {
  if (!root.value?.hasPointerCapture(event.pointerId)) return;
  updateFromPointer(event.clientX, event.clientY);
}

function onPointerEnd(event: PointerEvent): void {
  if (!root.value?.hasPointerCapture(event.pointerId)) return;
  updateFromPointer(event.clientX, event.clientY);
  root.value.releasePointerCapture(event.pointerId);
  emit('interaction-end');
}

function onPointerCancel(event: PointerEvent): void {
  if (root.value?.hasPointerCapture(event.pointerId)) root.value.releasePointerCapture(event.pointerId);
  emit('interaction-end');
}

function onKeydown(event: KeyboardEvent): void {
  if (finalDisabled.value) return;
  const amount = event.shiftKey ? props.step * 10 : props.step;
  let next = point.value.value;
  if (event.key === 'ArrowLeft') next = { ...next, x: next.x - amount };
  else if (event.key === 'ArrowRight') next = { ...next, x: next.x + amount };
  else if (event.key === 'ArrowUp') next = { ...next, y: next.y - amount };
  else if (event.key === 'ArrowDown') next = { ...next, y: next.y + amount };
  else if (event.key === 'Home') next = { x: 0, y: 0 };
  else if (event.key === 'End') next = { x: 1, y: 1 };
  else return;
  event.preventDefault();
  if (!event.repeat) emit('interaction-start');
  update(next);
}

defineExpose({ el: root });
</script>

<template>
  <div
    ref="root"
    v-bind="passthroughAttrs"
    role="slider"
    :tabindex="finalDisabled ? -1 : 0"
    :aria-label="ariaLabel"
    :aria-valuetext="`x ${(currentPoint.x * 100).toFixed(0)}%, y ${(currentPoint.y * 100).toFixed(0)}%`"
    :aria-disabled="finalDisabled || undefined"
    :data-disabled="finalDisabled ? '' : undefined"
    :class="rootClass"
    :style="backgroundStyle"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerCancel"
    @keydown="onKeydown"
    @keyup="emit('interaction-end')"
    @blur="emit('interaction-end')"
  >
    <span
      aria-hidden="true"
      class="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-md ring-1 ring-black/20"
      :style="{ left: `${currentPoint.x * 100}%`, top: `${currentPoint.y * 100}%` }"
    />
  </div>
</template>
