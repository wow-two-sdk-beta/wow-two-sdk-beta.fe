<script lang="ts">
/** Represents the prop surface of the `SelectPickerValue`. */
export interface SelectPickerValueProps {
  /** The content shown when no item is selected. Fill the `placeholder` slot for richer content. */
  readonly placeholder?: string | number;

  /**
   * The override for the auto-resolved label, rendered as-is with no item lookup —
   * React's `children`. The default slot does the same for richer content.
   */
  readonly label?: string | number;
}
</script>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { cn } from '../../../foundation/styles';
import { useSelectContext } from './SelectPickerContext';

/** Renders the selected item's label inside the trigger, or the placeholder while nothing is selected. */
defineOptions({ name: 'SelectPickerValue' });

const props = defineProps<SelectPickerValueProps>();

defineSlots<{
  /** The label override, rendered with no item lookup. Falls back to the `label` prop. */
  default?(): unknown;
  /** The empty-selection content, richer than the `placeholder` prop can carry. */
  placeholder?(): unknown;
}>();

const slots = useSlots();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useSelectContext();

const hasOverride = computed(() => Boolean(props.label) || Boolean(slots.default));

/* Resolution order: live registry → label captured at selection → persistent cache (labels a
   closed trigger post-unmount) → `getOptionLabel` (human label before first open) → serialized key. */
const resolvedLabel = computed<string | number | null>(() => {
  if (!ctx.hasSelection) return null;
  const match = ctx.items.find((i) => ctx.keyEquals(i.itemKey, ctx.selectedKey));
  return (
    match?.label ??
    ctx.selectedLabel ??
    ctx.getCachedLabel(ctx.selectedKey) ??
    ctx.getOptionLabel(ctx.selectedKey) ??
    ctx.serializeKey(ctx.selectedKey)
  );
});

/* `muted-foreground` (not `subtle-foreground`): the trigger surface is muted, where subtle is
   only 4.2:1 (see index.css). */
const valueClass = computed(() => cn('truncate text-left', !resolvedLabel.value && 'text-muted-foreground'));
</script>

<template>
  <span v-if="hasOverride" class="truncate">
    <slot>{{ label }}</slot>
  </span>
  <span v-else :class="valueClass">
    <template v-if="resolvedLabel !== null">{{ resolvedLabel }}</template>
    <slot v-else name="placeholder">{{ placeholder }}</slot>
  </span>
</template>
