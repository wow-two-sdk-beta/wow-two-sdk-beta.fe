<script setup lang="ts">
import { computed, nextTick, provide, shallowRef, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { useLocale } from '../../../foundation/i18n';
import { useId } from '../../../foundation/identifiers';
import { cn } from '../../../foundation/styles';
import {
  KanbanBoardKey,
  type KanbanDirection,
  type KanbanDrag,
  type KanbanDropTarget,
  type KanbanMove,
} from './KanbanBoardContext';

/**
 * Renders a board of `KanbanColumn`s whose `KanbanCard`s move by drag and drop or by Alt with the arrow keys.
 * The board only requests moves; the caller owns the columns and applies each `move`.
 */
defineOptions({ name: 'KanbanBoard', inheritAttrs: false });

/** The `KanbanColumn` parts. */
defineSlots<{ default(): unknown }>();

const emit = defineEmits<{
  /** Fires when the reader drops or keyboard-moves a card — apply it to the columns you own. */
  move: [move: KanbanMove];
}>();

const attrs = useAttrs();
const locale = useLocale();
const hintId = useId('kanban-hint');
const board = useTemplateRef<HTMLElement>('board');

const dragging = shallowRef<KanbanDrag | null>(null);
const dropTarget = shallowRef<KanbanDropTarget | null>(null);
const announcement = shallowRef('');

/** The columns in on-screen order, read from the DOM so late-mounted columns count. */
function columnElements(): HTMLElement[] {
  return [...(board.value?.querySelectorAll<HTMLElement>('[data-column-key]') ?? [])];
}

function columnElement(columnKey: string): HTMLElement | undefined {
  return columnElements().find((element) => element.dataset.columnKey === columnKey);
}

function cardCount(columnKey: string): number {
  return columnElement(columnKey)?.querySelectorAll('[data-item-key]').length ?? 0;
}

function cardLabel(itemKey: string): string {
  const card = board.value?.querySelector<HTMLElement>(`[data-item-key="${CSS.escape(itemKey)}"]`);
  return card?.dataset.label || card?.textContent?.trim() || itemKey;
}

/** Requests a move, then announces it and keeps focus on the card once the caller has applied it. */
function request(move: KanbanMove, isKeyboard: boolean): void {
  emit('move', move);
  const column = columnElement(move.toColumn)?.dataset.columnTitle ?? move.toColumn;
  const label = cardLabel(move.itemKey);
  void nextTick(() => {
    announcement.value = locale.t(
      'KanbanBoard.moved',
      { card: label, column, position: move.toIndex + 1, total: cardCount(move.toColumn) },
      'Moved {card} to {column}, position {position} of {total}',
    );
    if (isKeyboard) {
      board.value?.querySelector<HTMLElement>(`[data-item-key="${CSS.escape(move.itemKey)}"]`)?.focus();
    }
  });
}

function endDrag(): void {
  dragging.value = null;
  dropTarget.value = null;
}

function drop(): void {
  const drag = dragging.value;
  const target = dropTarget.value;
  endDrag();
  if (!drag || !target) return;
  const isSameColumn = target.columnKey === drag.columnKey;
  const toIndex = isSameColumn && drag.index < target.index ? target.index - 1 : target.index;
  if (isSameColumn && toIndex === drag.index) return;
  request(
    { itemKey: drag.itemKey, fromColumn: drag.columnKey, fromIndex: drag.index, toColumn: target.columnKey, toIndex },
    false,
  );
}

function moveByKeyboard(drag: KanbanDrag, direction: KanbanDirection): void {
  const move = { itemKey: drag.itemKey, fromColumn: drag.columnKey, fromIndex: drag.index };
  if (direction === 'up' || direction === 'down') {
    const toIndex = drag.index + (direction === 'up' ? -1 : 1);
    if (toIndex < 0 || toIndex >= cardCount(drag.columnKey)) return;
    request({ ...move, toColumn: drag.columnKey, toIndex }, true);
    return;
  }
  const columns = columnElements();
  const position = columns.findIndex((element) => element.dataset.columnKey === drag.columnKey);
  const target = columns[position + (direction === 'next' ? 1 : -1)];
  const toColumn = target?.dataset.columnKey;
  if (!toColumn) return;
  request({ ...move, toColumn, toIndex: Math.min(drag.index, cardCount(toColumn)) }, true);
}

provide(KanbanBoardKey, {
  get dragging() {
    return dragging.value;
  },
  get dropTarget() {
    return dropTarget.value;
  },
  hintId,
  startDrag: (drag) => {
    dragging.value = drag;
  },
  setDropTarget: (target) => {
    dropTarget.value = target;
  },
  drop,
  endDrag,
  moveByKeyboard,
});

const rest = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class')));

const classes = computed(() => cn('flex items-start gap-3 overflow-x-auto pb-2', attrs.class as ClassValue));
</script>

<template>
  <div ref="board" v-bind="rest" :class="classes" :data-dragging="dragging ? '' : undefined">
    <slot />
    <span :id="hintId" class="sr-only">
      {{ locale.t('KanbanBoard.hint', undefined, 'Press Alt with the arrow keys to move this card.') }}
    </span>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
