<script lang="ts">
export interface DaySeparatorProps {
  /** The label (e.g. "Today", "Yesterday", "Mar 5"). Rich content → the `label` slot. */
  readonly label: string | number;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/** Renders the date divider between message groups in a `MessageGroup`. */
defineOptions({ name: 'DaySeparator', inheritAttrs: false });

defineSlots<{
  /** The label override, when a plain string is not enough. */
  label(): unknown;
}>();

/** `label` was required in React and stays required here — the slot is a rich override, not a substitute. */
const props = defineProps<DaySeparatorProps>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() => cn('flex items-center gap-3 py-2', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" role="separator" v-bind="rest" :class="classes">
    <span class="h-px flex-1 bg-border" aria-hidden="true" />
    <span class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      <slot name="label">{{ props.label }}</slot>
    </span>
    <span class="h-px flex-1 bg-border" aria-hidden="true" />
  </div>
</template>
