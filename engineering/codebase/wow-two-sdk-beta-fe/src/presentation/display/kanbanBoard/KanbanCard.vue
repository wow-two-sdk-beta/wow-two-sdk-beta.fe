<script lang="ts">
/** Defines props for one board card. */
export interface KanbanCardProps {
  /** The card's identity in `move` requests. */
  readonly itemKey: string;

  /** The card's position in its column — the `v-for` index. */
  readonly index: number;

  /** The short name used in move announcements. Default the card's text. */
  readonly label?: string;

  /** Keeps the card in place — no drag, no keyboard move. */
  readonly isLocked?: boolean;
}
</script>

<script setup lang="ts">
import { computed, inject, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { KanbanColumnKey, useKanbanBoardContext, type KanbanDirection } from './KanbanBoardContext';

/** Renders one card of a `KanbanColumn` — draggable, and movable with Alt and the arrow keys. */
defineOptions({ name: 'KanbanCard', inheritAttrs: false });

/** The card's content. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<KanbanCardProps>(), { label: undefined, isLocked: false });

const attrs = useAttrs();
const board = useKanbanBoardContext();
const column = inject(KanbanColumnKey, null);

const columnKey = computed(() => column?.columnKey ?? '');
const isDragging = computed(() => board.dragging?.itemKey === props.itemKey);
const isBeforeTarget = computed(
  () =>
    board.dragging !== null &&
    board.dropTarget?.columnKey === columnKey.value &&
    !board.dropTarget.isEnd &&
    board.dropTarget.index === props.index,
);

function onDragStart(event: DragEvent): void {
  if (props.isLocked) {
    event.preventDefault();
    return;
  }
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', props.itemKey);
  }
  board.startDrag({ itemKey: props.itemKey, columnKey: columnKey.value, index: props.index });
}

/** Over a card: the dragged card lands before it, or after it past its middle. */
function onDragOver(event: DragEvent): void {
  if (!board.dragging) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const isAfter = event.clientY > box.top + box.height / 2;
  board.setDropTarget({ columnKey: columnKey.value, index: props.index + (isAfter ? 1 : 0), isEnd: false });
}

function onDrop(event: DragEvent): void {
  if (!board.dragging) return;
  event.preventDefault();
  event.stopPropagation();
  board.drop();
}

function onKeydown(event: KeyboardEvent): void {
  if (!event.altKey || props.isLocked) return;
  const isRtl = getComputedStyle(event.currentTarget as Element).direction === 'rtl';
  const directions: Readonly<Record<string, KanbanDirection>> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: isRtl ? 'next' : 'previous',
    ArrowRight: isRtl ? 'previous' : 'next',
  };
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  board.moveByKeyboard({ itemKey: props.itemKey, columnKey: columnKey.value, index: props.index }, direction);
}

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const classes = computed(() =>
  cn(
    'relative rounded-md border border-border bg-background p-3 text-sm shadow-xs transition-opacity',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    props.isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
    isDragging.value && 'opacity-50',
    attrs.class as ClassValue,
  ),
);
</script>

<template>
  <li
    v-bind="rest"
    tabindex="0"
    :draggable="!props.isLocked"
    :aria-describedby="props.isLocked ? undefined : board.hintId"
    :data-item-key="props.itemKey"
    :data-label="props.label"
    :data-dragging="isDragging ? '' : undefined"
    :class="classes"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @drop="onDrop"
    @dragend="board.endDrag"
    @keydown="onKeydown"
  >
    <span
      v-if="isBeforeTarget"
      class="pointer-events-none absolute inset-x-0 -top-1.5 h-0.5 rounded-full bg-primary"
      aria-hidden="true"
      data-drop-indicator
    />
    <slot />
  </li>
</template>
