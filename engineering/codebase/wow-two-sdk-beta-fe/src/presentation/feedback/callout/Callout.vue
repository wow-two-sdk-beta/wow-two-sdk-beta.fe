<script lang="ts">
import type { Severity } from '../../../foundation/styles';

export interface CalloutProps {
  /** The semantic severity palette. */
  readonly severity?: Severity;
  /** The optional leading icon. Rich content → the `icon` slot. */
  readonly icon?: string;
  /** The bold heading line. Rich content → the `title` slot. */
  readonly title?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { cn, Severity as SeverityToken } from '../../../foundation/styles';

const SeverityClass: Record<Severity, string> = {
  info: 'border-l-info text-foreground',
  success: 'border-l-success text-foreground',
  warning: 'border-l-warning text-foreground',
  danger: 'border-l-destructive text-foreground',
  neutral: 'border-l-border text-foreground',
};

/**
 * Renders an inline doc-style note — colored left rule, no fill, quieter than `Alert`.
 * Use for supplementary content (think MDX callouts).
 *
 * React's `children` becomes the default slot; `icon` / `title` keep their
 * string form and gain same-named slots for rich content.
 */
defineOptions({ name: 'Callout', inheritAttrs: false });

const props = withDefaults(defineProps<CalloutProps>(), { severity: SeverityToken.Info });

defineSlots<{
  /** The note body. */
  default?(): unknown;
  /** The leading icon. Falls back to the `icon` prop. */
  icon?(): unknown;
  /** The heading line. Falls back to the `title` prop. */
  title?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');

const hasIcon = computed(() => Boolean(props.icon) || Boolean(slots.icon));
const hasTitle = computed(() => Boolean(props.title) || Boolean(slots.title));

const classes = computed(() =>
  cn(
    'flex items-start gap-3 rounded-md border-l-4 bg-card px-4 py-3 text-sm',
    SeverityClass[props.severity],
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <span v-if="hasIcon" class="mt-0.5 shrink-0">
      <slot name="icon">{{ props.icon }}</slot>
    </span>
    <div class="min-w-0 flex-1">
      <div v-if="hasTitle" class="mb-0.5 font-medium">
        <slot name="title">{{ props.title }}</slot>
      </div>
      <slot />
    </div>
  </div>
</template>
