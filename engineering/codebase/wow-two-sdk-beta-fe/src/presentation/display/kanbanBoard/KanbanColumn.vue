<script lang="ts">
/** Defines props for one board column. */
export interface KanbanColumnProps {
  /** The column's identity in `move` requests. */
  readonly columnKey: string;

  /** The column heading; also names the column and its announcements. */
  readonly title: string;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { useId } from '../../../foundation/identifiers';
import { cn } from '../../../foundation/styles';
import { KanbanColumnKey, useKanbanBoardContext } from './KanbanBoardContext';

/** Renders one column of a `KanbanBoard` — a heading and a drop zone of `KanbanCard`s. */
defineOptions({ name: 'KanbanColumn', inheritAttrs: false });

defineSlots<{
  /** The column's `KanbanCard`s, in order. */
  default(): unknown;

  /** Extra heading content — a count, a menu. */
  header?(): unknown;

  /** Content under the cards — an "add card" button. */
  footer?(): unknown;
}>();

const props = defineProps<KanbanColumnProps>();

const attrs = useAttrs();
const board = useKanbanBoardContext();
const titleId = useId('kanban-column');

provide(KanbanColumnKey, {
  get columnKey() {
    return props.columnKey;
  },
});

const isEndTarget = computed(
  () => board.dropTarget?.columnKey === props.columnKey && board.dropTarget.isEnd && board.dragging !== null,
);

/** Over the column but not over a card: the card would land last. */
function onDragOver(event: DragEvent): void {
  if (!board.dragging) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  const count = (event.currentTarget as HTMLElement).querySelectorAll('[data-item-key]').length;
  board.setDropTarget({ columnKey: props.columnKey, index: count, isEnd: true });
}

function onDrop(event: DragEvent): void {
  if (!board.dragging) return;
  event.preventDefault();
  board.drop();
}

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const classes = computed(() =>
  cn('flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted/60 p-2', attrs.class as ClassValue),
);
</script>

<template>
  <section
    v-bind="rest"
    :aria-labelledby="titleId"
    :data-column-key="props.columnKey"
    :data-column-title="props.title"
    :class="classes"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <header class="flex items-center gap-2 px-1">
      <h3 :id="titleId" class="flex-1 truncate text-sm font-semibold">{{ props.title }}</h3>
      <slot name="header" />
    </header>
    <ul role="list" class="flex min-h-12 flex-col gap-2">
      <slot />
      <li v-if="isEndTarget" class="h-0.5 rounded-full bg-primary" aria-hidden="true" data-drop-indicator />
    </ul>
    <slot name="footer" />
  </section>
</template>
