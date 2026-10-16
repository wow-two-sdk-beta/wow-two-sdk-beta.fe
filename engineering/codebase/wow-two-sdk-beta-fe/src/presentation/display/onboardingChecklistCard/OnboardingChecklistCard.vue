<script lang="ts">
import { inject, type InjectionKey } from 'vue';

export interface OnboardingContextValue {
  /** A live getter — read it, never destructure it. */
  readonly open: boolean;
  setOpen: (open: boolean) => void;
}

/**
 * The record a `OnboardingChecklistCardTask` hands the root on mount. `isDone` is a
 * live getter over the task's own prop, so the root's progress computeds track
 * it without the task re-registering on every toggle.
 */
export interface OnboardingTaskRecord {
  readonly isDone: boolean;
}

export interface OnboardingRegistry {
  register: (task: OnboardingTaskRecord) => void;
  unregister: (task: OnboardingTaskRecord) => void;
}

export const onboardingContextKey: InjectionKey<OnboardingContextValue> = Symbol('wow-two.onboardingChecklist');

/**
 * Replaces React's `Children.toArray` + `isValidElement` child-walking, which
 * has no Vue counterpart: slots are functions, so the root cannot inspect its
 * children's props. Tasks register themselves instead.
 */
export const onboardingRegistryKey: InjectionKey<OnboardingRegistry> = Symbol('wow-two.onboardingChecklist.registry');

export interface OnboardingChecklistCardProps {
  /** The card heading. Rich content → the `title` slot. */
  readonly title?: string;
  readonly defaultOpen?: boolean;
  readonly canDismissOnComplete?: boolean;
  /** The delay in ms after 100% before unmounting. */
  readonly dismissDelay?: number;
}

export function useOnboardingChecklist(): OnboardingContextValue {
  const context = inject(onboardingContextKey, null);
  if (!context) throw new Error('useOnboardingChecklist must be used inside <OnboardingChecklistCard>');
  return context;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { computed, provide, ref, shallowRef, useAttrs, useTemplateRef, watch } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';

const locale = useLocale();

const ChevronDownIcon = ChevronDown;

/**
 * Renders an onboarding card — title, progress meter, and the checklist rows in its default slot.
 * The default slot holds `OnboardingChecklistCardTask` components; progress is auto-derived from the
 * `isDone` prop each one registers with this root.
 */
defineOptions({ name: 'OnboardingChecklistCard', inheritAttrs: false });

const componentProps = withDefaults(defineProps<OnboardingChecklistCardProps>(), {
  defaultOpen: true,
  canDismissOnComplete: false,
  dismissDelay: 2000,
});
const props = useLocaleDefaults(componentProps, 'OnboardingChecklistCard', { title: 'Get started' });

const emit = defineEmits<{
  /** Fires when the card dismisses itself, `dismissDelay` ms after the reader completes the last task. */
  dismiss: [];
}>();

defineSlots<{
  /** The `OnboardingChecklistCardTask` rows driving the progress meter. */
  default?(): unknown;
  /** The card heading. Falls back to the `title` prop. */
  title?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const open = ref(props.defaultOpen);
const dismissed = ref(false);

const tasks = shallowRef<ReadonlyArray<OnboardingTaskRecord>>([]);

provide<OnboardingRegistry>(onboardingRegistryKey, {
  register: (task) => {
    if (!tasks.value.includes(task)) tasks.value = [...tasks.value, task];
  },
  unregister: (task) => {
    tasks.value = tasks.value.filter((existing) => existing !== task);
  },
});

provide<OnboardingContextValue>(onboardingContextKey, {
  get open() {
    return open.value;
  },
  setOpen: (value: boolean) => {
    open.value = value;
  },
});

const total = computed(() => tasks.value.length);
const done = computed(() => tasks.value.filter((task) => task.isDone).length);
const complete = computed(() => total.value > 0 && done.value === total.value);

watch(
  [complete, () => props.canDismissOnComplete, () => props.dismissDelay, dismissed],
  ([isComplete, canDismiss, delay, isDismissed], _previous, onCleanup) => {
    if (!canDismiss || !isComplete || isDismissed) return;
    const handle = window.setTimeout(() => {
      dismissed.value = true;
      emit('dismiss');
    }, delay);
    onCleanup(() => window.clearTimeout(handle));
  },
  { immediate: true, flush: 'post' },
);

const classes = computed(() =>
  cn('overflow-hidden rounded-lg border border-border bg-card shadow-sm', attrs.class as string | undefined),
);

const fillClasses = computed(() =>
  cn('h-full bg-primary transition-[width] duration-300', complete.value && 'bg-success'),
);

const fillStyle = computed(() => ({
  width: total.value ? `${(done.value / total.value) * 100}%` : '0%',
}));

const chevronClasses = computed(() => cn('text-muted-foreground transition-transform', open.value && 'rotate-180'));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div v-if="!dismissed" ref="el" v-bind="rest" :class="classes">
    <button
      type="button"
      :aria-expanded="open"
      class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      @click="open = !open"
    >
      <div class="flex-1">
        <div class="text-sm font-medium text-foreground">
          <slot name="title">{{ props.title }}</slot>
        </div>
        <div class="mt-1 text-xs text-muted-foreground">
          {{ locale.t('OnboardingChecklistCard.progress', { done, total }, '{done} of {total} tasks complete') }}
        </div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
          <div :class="fillClasses" :style="fillStyle" />
        </div>
      </div>
      <Icon :icon="ChevronDownIcon" :size="16" :class="chevronClasses" />
    </button>
    <!--
      Tasks register on mount, so they must stay mounted for `total` / `done` to
      be correct while collapsed — `v-show`, not `v-if`, unlike React's `{open && …}`
      which could re-derive counts from the children array without rendering them.
    -->
    <ul v-show="open" role="list" class="border-t border-border">
      <slot />
    </ul>
  </div>
</template>
