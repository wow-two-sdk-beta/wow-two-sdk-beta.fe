<script lang="ts">
import type { Orientation } from '../../../foundation/styles';

export interface StepperGroupProps {
  /** The active step value, controlled. The `v-model` binding target. */
  readonly modelValue?: string;

  /** The initial active step value when uncontrolled. */
  readonly defaultValue?: string;

  /** The layout axis. Default `horizontal`. */
  readonly orientation?: Orientation;
}
</script>

<script setup lang="ts">
import { computed, provide, ref, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, Orientation as OrientationValue } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useId } from '../../../foundation/identifiers';
import { StepperGroupKey, type StepperGroupContextValue } from './StepperGroupContext';

/**
 * Renders the stepper root, owning the active step value for the strip and panels below it.
 *
 * Publishes that value to `StepperGroupList` / `StepperGroupStep` / `StepperGroupPanel` through injection — React
 * attached those as `StepperGroup.List` / `.Step` / `.Panel` statics, which an SFC's default export
 * cannot carry.
 */
/* `inheritAttrs: false` so `class` folds into the root's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'StepperGroup', inheritAttrs: false });

/** The step list and panels — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<StepperGroupProps>(), {
  orientation: OrientationValue.Horizontal,
  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`. */
  modelValue: undefined,
  defaultValue: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader moves to a different step — the `v-model` half. */
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const controlled = useControlled<string>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? '',
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const active = controlled.value;
const baseId = useId();

/* Reactive, unlike React's `useRef` array: `StepperGroupStep` derives its status and its connector
   visibility from this list at render time, so a sibling registering has to re-render it. */
const steps = ref<Array<{ token: symbol; value: string }>>([]);

function registerStep(token: symbol, value: string): void {
  const existing = steps.value.find((step) => step.token === token);
  if (existing) existing.value = value;
  else steps.value = [...steps.value, { token, value }];
}

function unregisterStep(token: symbol): void {
  steps.value = steps.value.filter((step) => step.token !== token);
}

/* Live getters, not a snapshot — an orientation change on the root has to reach every
   already-mounted step. */
provide<StepperGroupContextValue>(StepperGroupKey, {
  get value() {
    return active.value;
  },
  setValue: controlled.setValue,
  get orientation() {
    return props.orientation;
  },
  baseId,
  get steps() {
    return steps.value.map((step) => step.value);
  },
  registerStep,
  unregisterStep,
});

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(props.orientation === OrientationValue.Vertical ? 'flex gap-4' : 'flex flex-col gap-4', attrs.class as ClassValue),
);

/** The rendered root `<div>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el });
</script>

<template>
  <div ref="el" :data-orientation="orientation" :class="rootClass" v-bind="passthroughAttrs">
    <slot />
  </div>
</template>
