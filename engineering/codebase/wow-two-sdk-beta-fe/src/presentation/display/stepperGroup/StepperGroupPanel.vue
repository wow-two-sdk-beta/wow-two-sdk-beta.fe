<script lang="ts">
export interface StepperGroupPanelProps {
  /** The value this panel belongs to — pairs it with the `StepperGroupStep` of the same value. */
  readonly value: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useStepperContext } from './StepperGroupContext';

/** Renders one step's panel, and only while that step is the active one — the rest stay unmounted. */
defineOptions({ name: 'StepperGroupPanel', inheritAttrs: false });

/** The panel content — React's required `children`. */
defineSlots<{ default(): unknown }>();

const props = defineProps<StepperGroupPanelProps>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const stepper = useStepperContext();

const isActive = computed(() => stepper.value === props.value);

const stepId = computed(() => `${stepper.baseId}-step-${props.value}`);
const panelId = computed(() => `${stepper.baseId}-panel-${props.value}`);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const panelClass = computed(() => cn('flex-1 outline-hidden', attrs.class as ClassValue));

defineExpose({ el });
</script>

<template>
  <div
    v-if="isActive"
    ref="el"
    :id="panelId"
    role="tabpanel"
    :aria-labelledby="stepId"
    :tabindex="0"
    :class="panelClass"
    v-bind="passthroughAttrs"
  >
    <slot />
  </div>
</template>
