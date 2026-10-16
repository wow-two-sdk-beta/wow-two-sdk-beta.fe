<script lang="ts">
import type { Orientation } from '../../../foundation/styles';

export interface ProgressStepsIndicatorProps {
  /** The step labels in order. */
  readonly steps: ReadonlyArray<string>;

  /** The index of the active step (0-based). Steps before are marked complete. */
  readonly current: number;

  /** The layout direction. Default `horizontal`. */
  readonly orientation?: Orientation;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { Check } from 'lucide-vue-next';
import { cn, Orientation as OrientationToken } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';

const CheckIcon = Check;

/**
 * Renders N-of-M progress dots or pills joined by connectors, horizontally or vertically.
 * No state machine — the consumer drives `current`. For full wizard-with-content semantics use
 * the L5 `StepperGroup` organism.
 */
defineOptions({ name: 'ProgressStepsIndicator', inheritAttrs: false });

const props = withDefaults(defineProps<ProgressStepsIndicatorProps>(), {
  orientation: OrientationToken.Horizontal,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLOListElement>('el');

const isHorizontal = computed(() => props.orientation === OrientationToken.Horizontal);

const classes = computed(() =>
  cn('flex', isHorizontal.value ? 'flex-row items-center gap-2' : 'flex-col gap-3', attrs.class as string | undefined),
);

/** The per-index step status, driving both the marker and the connector tone. */
const statusAt = (i: number) => (i < props.current ? 'complete' : i === props.current ? 'current' : 'upcoming');

const itemClasses = (i: number) =>
  cn('flex items-center gap-2', isHorizontal.value && i < props.steps.length - 1 && 'flex-1');

const markerClasses = (i: number) => {
  const status = statusAt(i);
  return cn(
    'grid h-7 w-7 place-items-center rounded-full text-xs font-medium',
    status === 'complete' && 'bg-primary text-primary-foreground',
    status === 'current' && 'border-2 border-primary text-primary-soft-foreground',
    status === 'upcoming' && 'border border-border text-muted-foreground',
  );
};

const labelClasses = (i: number) =>
  cn('text-sm', statusAt(i) === 'upcoming' ? 'text-muted-foreground' : 'text-foreground');

const connectorClasses = (i: number) => cn('h-px flex-1', i < props.current ? 'bg-primary' : 'bg-border');

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <ol ref="el" v-bind="rest" :class="classes">
    <li v-for="(label, i) in props.steps" :key="i" :class="itemClasses(i)">
      <span :class="markerClasses(i)" :aria-current="statusAt(i) === 'current' ? 'step' : undefined">
        <Icon v-if="statusAt(i) === 'complete'" :icon="CheckIcon" :size="14" />
        <template v-else>{{ i + 1 }}</template>
      </span>
      <span :class="labelClasses(i)">{{ label }}</span>
      <span v-if="isHorizontal && i < props.steps.length - 1" :class="connectorClasses(i)" aria-hidden="true" />
    </li>
  </ol>
</template>
