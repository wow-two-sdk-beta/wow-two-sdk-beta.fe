<script lang="ts">
export interface StepperGroupStepProps {
  /** The value this step selects — pairs it with the `StepperGroupPanel` of the same value. */
  readonly value: string;

  /** The sub-label under the step title. Fill the `description` slot for richer content. */
  readonly description?: string | number;

  /** The disabled state. Default `false`. */
  readonly isDisabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, mergeProps, onBeforeUnmount, shallowRef, useAttrs, useSlots, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { Check } from 'lucide-vue-next';
import { cn, Orientation } from '../../../foundation/styles';
import { dataAttr } from '../../../foundation/dom';
import { useRovingFocusItem } from '../../../foundation/primitives';
import { StepStatus, useStepperContext } from './StepperGroupContext';

/** Renders one step as an index-or-tick button, its label and description, plus a trailing connector. */
defineOptions({ name: 'StepperGroupStep', inheritAttrs: false });

/** The step title — React's required `children`. */
defineSlots<{
  default(): unknown;
  description?(): unknown;
}>();

const props = withDefaults(defineProps<StepperGroupStepProps>(), { isDisabled: false });

const attrs = useAttrs();
const slots = useSlots();
const stepper = useStepperContext();

/* Reactive object: bound with `v-bind`, never destructured. React called this with no
   options, so the roving tab stop is the first enabled step rather than the active one. */
const item = useRovingFocusItem();

/* Registration order follows mount order, which is DOM order — the same ordering React got
   from its mount effect. */
const token = Symbol('wow-two.stepperStep');
watch(
  () => props.value,
  (value) => stepper.registerStep(token, value),
  { immediate: true },
);
onBeforeUnmount(() => stepper.unregisterStep(token));

/* One element, two consumers of `ref` — the roving group needs the node and `defineExpose`
   publishes it. React composed them with a callback ref; this is the same composition. */
const el = shallowRef<HTMLButtonElement | null>(null);
function setRef(node: unknown): void {
  el.value = (node ?? null) as HTMLButtonElement | null;
  item.ref(node);
}

const index = computed(() => stepper.steps.indexOf(props.value));
const activeIndex = computed(() => stepper.steps.indexOf(stepper.value));

const status = computed<StepStatus>(() => {
  if (index.value < activeIndex.value) return StepStatus.Complete;
  return index.value === activeIndex.value ? StepStatus.Active : StepStatus.Pending;
});

const stepId = computed(() => `${stepper.baseId}-step-${props.value}`);
const panelId = computed(() => `${stepper.baseId}-panel-${props.value}`);
const stepNumber = computed(() => index.value + 1);

const hasDescription = computed(
  () => (props.description != null && props.description !== '') || Boolean(slots.description),
);

const showConnector = computed(
  () => stepper.orientation === Orientation.Horizontal && index.value < stepper.steps.length - 1,
);

function onClick(event: MouseEvent): void {
  if (event.defaultPrevented || props.isDisabled) return;
  stepper.setValue(props.value);
}

const buttonClass = computed(() =>
  cn(
    'group flex items-center gap-2 text-left text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
    props.isDisabled && 'pointer-events-none opacity-50',
    attrs.class as ClassValue,
  ),
);

const markerClass = computed(() =>
  cn(
    'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold transition-colors',
    status.value === StepStatus.Pending && 'border-border text-muted-foreground',
    status.value === StepStatus.Active && 'border-primary bg-primary text-primary-foreground',
    status.value === StepStatus.Complete && 'border-primary bg-primary text-primary-foreground',
  ),
);

const titleClass = computed(() =>
  cn('font-medium', status.value === StepStatus.Pending ? 'text-muted-foreground' : 'text-foreground'),
);

const connectorClass = computed(() =>
  cn('h-px flex-1 transition-colors', status.value === StepStatus.Pending ? 'bg-border' : 'bg-primary'),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/**
 * The fallthrough attrs merged with the roving-focus item's bindings.
 *
 * `mergeProps` rather than an object spread: both sides can carry `onFocus`, and a spread
 * would drop the consumer's. Reading `item`'s members inside a computed keeps them tracked,
 * so `tabindex` still follows the group's tab stop.
 */
const bindings = computed(() => mergeProps(rest.value, item as unknown as Record<string, unknown>));

const CheckIcon = Check;

/** The rendered `<button>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el });
</script>

<template>
  <div class="flex flex-1 items-center gap-2">
    <!-- Own attrs, then `bindings` (fallthrough attrs + the roving item), then own handlers
         last — a consumer's `click` handler therefore runs before ours, the order React got
         from calling `onClick?.(e)` ahead of its own logic. -->
    <button
      :id="stepId"
      type="button"
      role="tab"
      :aria-selected="status === 'active'"
      :aria-controls="panelId"
      :aria-current="status === 'active' ? 'step' : undefined"
      :data-status="status"
      :data-disabled="dataAttr(isDisabled)"
      :disabled="isDisabled"
      v-bind="bindings"
      :ref="setRef"
      :class="buttonClass"
      @click="onClick"
    >
      <span aria-hidden="true" :class="markerClass">
        <CheckIcon v-if="status === 'complete'" class="h-4 w-4" />
        <template v-else>{{ stepNumber }}</template>
      </span>
      <span class="flex flex-col">
        <span :class="titleClass"><slot /></span>
        <span v-if="hasDescription" class="text-xs text-muted-foreground">
          <slot name="description">{{ description }}</slot>
        </span>
      </span>
    </button>
    <span v-if="showConnector" aria-hidden="true" :class="connectorClass" />
  </div>
</template>
