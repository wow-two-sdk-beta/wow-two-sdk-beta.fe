<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an
   exported name: React declared `SortableGroupProps` and consumers import it. Its one
   member, `onReorder`, is the `reorder` emit below; every div attribute falls through. */
export interface SortableGroupProps {}
</script>

<script setup lang="ts">
import { computed, onMounted, onUpdated, provide, ref, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { SortableGroupKey, type SortableGroupContextValue } from './SortableGroupContext';

/**
 * Renders a drag-to-reorder list, headless — consumers render their own rows.
 *
 * Reorder fires the `reorder` emit; the consumer owns the array and re-renders. Drag is handle-initiated (a row
 * becomes draggable only while a `SortableGroupHandle` is pressed), so inputs and selects inside a row stay
 * interactive.
 * Keyboard: focus a handle, Arrow Up/Down to move.
 *
 * React attached the parts as `SortableGroup.Item` / `.Handle` via `Object.assign`. An SFC's generated default export
 * cannot carry statics cleanly, so they ship as siblings: `SortableGroupItem`, `SortableGroupHandle`.
 */
defineOptions({ name: 'SortableGroup', inheritAttrs: false });

/** The `SortableGroupItem` rows — React's `children`. */
defineSlots<{ default(): unknown }>();

/**
 * React's `onReorder`. Emits the `from`/`to` indices when a drag or keyboard move
 * completes — move the item at `from` to `to`. Indices are raw; clamp in the handler.
 */
const emit = defineEmits<{
  /** Fires when a drag or a keyboard move completes, with the `from` and `to` indices. */
  reorder: [from: number, to: number];
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const dragIndex = ref<number | null>(null);
const overIndex = ref<number | null>(null);
const itemCount = ref(0);
function measureItems(): void {
  const root = el.value;
  itemCount.value = root
    ? Array.from(root.querySelectorAll('[data-sortable-item]')).filter(
        (item) => item.closest('[data-sortable-root]') === root,
      ).length
    : 0;
}
onMounted(measureItems);
onUpdated(measureItems);
/* Plain locals, not refs — React held these in `useRef` because the drop handler
   must read the latest values without waiting for a re-render. */
let dragged: number | null = null;
let over: number | null = null;

function begin(index: number): void {
  dragged = index;
  dragIndex.value = index;
}

function hover(index: number): void {
  over = index;
  overIndex.value = index;
}

function end(commit = false): void {
  const from = dragged;
  const to = over;
  if (commit && from !== null && to !== null) move(from, to);
  dragged = null;
  over = null;
  dragIndex.value = null;
  overIndex.value = null;
}

function move(from: number, to: number): void {
  if (
    Number.isInteger(from) &&
    Number.isInteger(to) &&
    from >= 0 &&
    from < itemCount.value &&
    from !== to &&
    to >= 0 &&
    to < itemCount.value
  )
    emit('reorder', from, to);
}

/* Live getters on the two indices — every mounted item reads them each render. */
provide<SortableGroupContextValue>(SortableGroupKey, {
  get count() {
    return itemCount.value;
  },
  get dragIndex() {
    return dragIndex.value;
  },
  get overIndex() {
    return overIndex.value;
  },
  begin,
  hover,
  end,
  move,
});

const classes = computed(() => cn('flex flex-col', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div data-sortable-root ref="el" v-bind="rest" :class="classes"><slot /></div>
</template>
