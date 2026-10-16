<script lang="ts">
export interface MultiSelectPickerItemProps {
  /** The value this row contributes to the selection. */
  readonly value: string;

  /** The disabled state for this row. */
  readonly isDisabled?: boolean;

  /**
   * The chip text registered for the trigger. Defaults to `value`.
   *
   * React registered the row's `children` (a `ReactNode`); a slot cannot be captured into
   * the label registry, so the scalar lives here and the default slot renders the row.
   */
  readonly label?: string | number;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { ListboxPickerItem } from '../listboxPicker';
import { useMultiSelectContext } from './MultiSelectPickerContext';

/** Renders one togglable row of the panel, and registers the chip text the trigger shows for it. */
defineOptions({ name: 'MultiSelectPickerItem', inheritAttrs: false });

/** The row content — React's required `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<MultiSelectPickerItemProps>(), { isDisabled: false });

const el = useTemplateRef<InstanceType<typeof ListboxPickerItem>>('el');

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useMultiSelectContext();

const registeredLabel = computed<string | number>(() => props.label ?? props.value);

/* Registers only — never unregisters; items unmount on popover close and the tags still
   need the labels. `immediate` because the first registration has to happen on mount, and
   nothing in this watcher touches the DOM. */
watch([() => props.value, registeredLabel], ([value, label]) => ctx.registerLabel(value, label), { immediate: true });
</script>

<template>
  <ListboxPickerItem ref="el" :value="value" :is-disabled="isDisabled">
    <slot />
  </ListboxPickerItem>
</template>
