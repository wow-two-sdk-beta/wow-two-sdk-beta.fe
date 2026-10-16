<script lang="ts">
import type { StatusTone } from '../../../foundation/styles';

export interface StatusIndicatorProps {
  /** The semantic status tone. */
  readonly tone?: StatusTone;

  /**
   * The bold first-line label (e.g. "All systems normal"). Rich content → the
   * `label` slot. Required in React; optional here so the slot form is usable —
   * supply one or the other.
   */
  readonly label?: string;

  /** The smaller secondary line (e.g. "Updated 2m ago"). Rich content → the `description` slot. */
  readonly description?: string;

  /** The optional pulsing ring for "live" indication. */
  readonly hasPulse?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { cn, StatusTone as StatusToneToken } from '../../../foundation/styles';

const ToneClass: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-muted-foreground',
};

/**
 * Renders a colored dot beside a bold label with a smaller helper line beneath it.
 * Use on monitoring / status pages. For an inline single-line indicator use
 * `display/Status`.
 */
defineOptions({ name: 'StatusIndicator', inheritAttrs: false });

const props = withDefaults(defineProps<StatusIndicatorProps>(), { tone: StatusToneToken.Success });

defineSlots<{
  /** The bold label beside the dot. Falls back to the `label` prop. */
  label?(): unknown;
  /** The helper line under the label. Falls back to the `description` prop. */
  description?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');

const hasDescription = computed(() => Boolean(props.description) || Boolean(slots.description));

const dotClasses = computed(() => cn('inline-block h-2.5 w-2.5 rounded-full', ToneClass[props.tone]));

const pulseClasses = computed(() =>
  cn('absolute inset-0 inline-block rounded-full opacity-75 animate-ping', ToneClass[props.tone]),
);

const classes = computed(() => cn('flex items-start gap-3', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <span class="relative mt-1 inline-flex">
      <span :class="dotClasses" />
      <span v-if="props.hasPulse" :class="pulseClasses" />
    </span>
    <div class="min-w-0 flex-1">
      <div class="text-sm font-medium text-foreground">
        <slot name="label">{{ props.label }}</slot>
      </div>
      <div v-if="hasDescription" class="text-xs text-muted-foreground">
        <slot name="description">{{ props.description }}</slot>
      </div>
    </div>
  </div>
</template>
