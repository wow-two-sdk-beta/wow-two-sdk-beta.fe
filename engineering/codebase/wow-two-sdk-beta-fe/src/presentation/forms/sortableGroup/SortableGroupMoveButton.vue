<script lang="ts">
export interface SortableGroupMoveButtonProps {
  /** The adjacent position to move this item into. */
  readonly direction: 'previous' | 'next';

  /** The localized action label; the default names the direction. */
  readonly label?: string;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useSortableItem, useSortableRoot } from './SortableGroupContext';

/** Renders a single-pointer and keyboard alternative to dragging an item. */
defineOptions({ name: 'SortableGroupMoveButton' });
const props = defineProps<SortableGroupMoveButtonProps>();
defineSlots<{ default?(): unknown }>();
const item = useSortableItem();
const root = useSortableRoot();
const target = computed(() => item.index + (props.direction === 'previous' ? -1 : 1));
const isDisabled = computed(() => target.value < 0 || target.value >= root.count);
const label = computed(() => props.label ?? (props.direction === 'previous' ? 'Move item up' : 'Move item down'));
</script>

<template>
  <button type="button" :aria-label="label" :disabled="isDisabled" @click="root.move(item.index, target)">
    <slot>{{ label }}</slot>
  </button>
</template>
