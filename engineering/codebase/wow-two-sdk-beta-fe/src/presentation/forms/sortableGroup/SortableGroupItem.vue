<script lang="ts">
export interface SortableGroupItemProps {
  /** The zero-based position of this item in the list. */
  readonly index: number;
}
</script>

<script setup lang="ts">
import { computed, provide, ref, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { SortableGroupItemKey, useSortableRoot, type SortableGroupItemContextValue } from './SortableGroupContext';

/** Renders one reorderable row, `draggable` only while its `SortableGroupHandle` is pressed. */
defineOptions({ name: 'SortableGroupItem', inheritAttrs: false });

/** The row content — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = defineProps<SortableGroupItemProps>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const root = useSortableRoot();

const armed = ref(false);

const isDragging = computed(() => root.dragIndex === props.index);
const isOver = computed(
  () => root.overIndex === props.index && root.dragIndex !== null && root.dragIndex !== props.index,
);

provide<SortableGroupItemContextValue>(SortableGroupItemKey, {
  get index() {
    return props.index;
  },
  arm: () => {
    armed.value = true;
  },
  disarm: () => {
    armed.value = false;
  },
});

function onDragStart(event: DragEvent): void {
  if (!armed.value || event.defaultPrevented || (event.target as Element).closest('[data-sortable-item]') !== el.value)
    return;
  event.stopPropagation();
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  root.begin(props.index);
}

function onDragOver(event: DragEvent): void {
  if (root.dragIndex !== null) event.preventDefault();
}

function onDrop(event: DragEvent): void {
  if (root.dragIndex === null) return;
  event.preventDefault();
  event.stopPropagation();
  root.hover(props.index);
  root.end(true);
  armed.value = false;
}

function onDragEnd(event: DragEvent): void {
  event.stopPropagation();
  root.end();
  armed.value = false;
}

const classes = computed(() =>
  cn('transition-opacity', isDragging.value && 'opacity-50', attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div
    ref="el"
    data-sortable-item
    :draggable="armed"
    :data-dragging="isDragging || undefined"
    :data-over="isOver || undefined"
    v-bind="rest"
    :class="classes"
    @dragstart="onDragStart"
    @dragenter.stop="root.dragIndex !== null && root.hover(props.index)"
    @dragover="onDragOver"
    @drop="onDrop"
    @dragend="onDragEnd"
  >
    <slot />
  </div>
</template>
