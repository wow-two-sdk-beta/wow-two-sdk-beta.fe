<script lang="ts">
export interface OnboardingChecklistCardTaskProps {
  /** The task label. Rich content → the `label` slot. Supply this or the slot. */
  readonly label?: string;
  /** The secondary line under the label. Rich content → the `description` slot. */
  readonly description?: string;
  readonly isDone?: boolean;
  /** The trailing call-to-action, hidden once done. Rich content → the `action` slot. */
  readonly action?: string;
}
</script>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, useAttrs, useSlots, useTemplateRef } from 'vue';
import { Check } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { onboardingRegistryKey, type OnboardingTaskRecord } from './OnboardingChecklistCard.vue';

const CheckIcon = Check;

/** Renders one checklist row and registers it with the enclosing `OnboardingChecklistCard` for progress. */
defineOptions({ name: 'OnboardingChecklistCardTask', inheritAttrs: false });

const props = withDefaults(defineProps<OnboardingChecklistCardTaskProps>(), { isDone: false });

defineSlots<{
  /** The task label. Falls back to the `label` prop. */
  label?(): unknown;
  /** The helper line under the label. Falls back to the `description` prop. */
  description?(): unknown;
  /** The trailing control, hidden once the task is done. Falls back to the `action` prop. */
  action?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLLIElement>('el');

/**
 * `isDone` is exposed as a getter so the root's progress computeds re-evaluate
 * on toggle without this task re-registering.
 */
const record: OnboardingTaskRecord = {
  get isDone() {
    return props.isDone;
  },
};

const registry = inject(onboardingRegistryKey, null);
onMounted(() => registry?.register(record));
onUnmounted(() => registry?.unregister(record));

const hasDescription = computed(() => Boolean(props.description) || Boolean(slots.description));
const hasAction = computed(() => Boolean(props.action) || Boolean(slots.action));

const classes = computed(() =>
  cn(
    'flex items-start gap-3 px-4 py-3 transition-colors',
    props.isDone && 'opacity-60',
    attrs.class as string | undefined,
  ),
);

const markerClasses = computed(() =>
  cn(
    'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border',
    props.isDone ? 'border-success bg-success text-success-foreground' : 'border-border',
  ),
);

const labelClasses = computed(() => cn('text-sm font-medium text-foreground', props.isDone && 'line-through'));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <li ref="el" :data-done="props.isDone || undefined" v-bind="rest" :class="classes">
    <span aria-hidden="true" :class="markerClasses">
      <Icon v-if="props.isDone" :icon="CheckIcon" :size="12" />
    </span>
    <div class="min-w-0 flex-1">
      <div :class="labelClasses">
        <slot name="label">{{ props.label }}</slot>
      </div>
      <div v-if="hasDescription" class="mt-0.5 text-xs text-muted-foreground">
        <slot name="description">{{ props.description }}</slot>
      </div>
    </div>
    <div v-if="hasAction && !props.isDone" class="shrink-0">
      <slot name="action">{{ props.action }}</slot>
    </div>
  </li>
</template>
