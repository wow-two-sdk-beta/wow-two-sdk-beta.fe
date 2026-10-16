<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { Plus } from 'lucide-vue-next';
import { Button } from '@wow-two-beta/ui-vue/presentation/actions';
import {
  Avatar,
  EmptyState,
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  Tag,
} from '@wow-two-beta/ui-vue/presentation/display';
import { SearchInput, ToggleGroup, ToggleInput } from '@wow-two-beta/ui-vue/presentation/forms';

/* Board archetype: filters shared with the list view above stage columns. Filtering hides cards without
   reordering them, so a move made in a filtered view lands relative to the visible neighbours. */

interface Card {
  readonly key: string;
  readonly title: string;
  readonly owner: string;
  readonly label: 'bug' | 'feature' | 'chore';
  readonly isBlocked?: boolean;
}

interface Column {
  readonly key: string;
  readonly title: string;
  cards: Card[];
}

interface BoardMove {
  readonly itemKey: string;
  readonly fromColumn: string;
  readonly fromIndex: number;
  readonly toColumn: string;
  readonly toIndex: number;
}

const Me = 'Aziza';

const board = ref<Column[]>([
  {
    key: 'backlog',
    title: 'Backlog',
    cards: [
      { key: 'c1', title: 'Offline drafts for the composer', owner: 'Timur', label: 'feature' },
      { key: 'c2', title: 'Flaky upload retry on Safari', owner: 'Aziza', label: 'bug' },
      { key: 'c3', title: 'Bump the chart library', owner: 'Dilnoza', label: 'chore' },
    ],
  },
  {
    key: 'progress',
    title: 'In progress',
    cards: [
      { key: 'c4', title: 'Saved filters in the grid', owner: 'Aziza', label: 'feature' },
      { key: 'c5', title: 'Billing webhook signature', owner: 'Timur', label: 'bug', isBlocked: true },
    ],
  },
  {
    key: 'review',
    title: 'Review',
    cards: [{ key: 'c6', title: 'Keyboard moves on the board', owner: 'Dilnoza', label: 'feature' }],
  },
  {
    key: 'done',
    title: 'Done',
    cards: [
      { key: 'c7', title: 'Dark mode for charts', owner: 'Aziza', label: 'feature' },
      { key: 'c8', title: 'Remove the legacy router', owner: 'Timur', label: 'chore' },
    ],
  },
]);

const LabelTag = { bug: 'danger', feature: 'brand', chore: 'neutral' } as const;

const query = shallowRef('');
const scope = shallowRef<'all' | 'mine' | 'blocked'>('all');

function isVisible(card: Card): boolean {
  const text = query.value.trim().toLowerCase();
  if (text && !card.title.toLowerCase().includes(text)) return false;
  if (scope.value === 'mine') return card.owner === Me;
  if (scope.value === 'blocked') return Boolean(card.isBlocked);
  return true;
}

const visibleColumns = computed(() =>
  board.value.map((column) => ({ ...column, visible: column.cards.filter(isVisible) })),
);
const visibleCount = computed(() => visibleColumns.value.reduce((sum, column) => sum + column.visible.length, 0));

/** Applies a move reported against the VISIBLE cards to the full columns. */
function applyMove(move: BoardMove): void {
  const from = board.value.find((column) => column.key === move.fromColumn);
  const to = board.value.find((column) => column.key === move.toColumn);
  if (!from || !to) return;
  const index = from.cards.findIndex((card) => card.key === move.itemKey);
  if (index < 0) return;
  const [card] = from.cards.splice(index, 1);
  const anchor = to.cards.filter(isVisible)[move.toIndex];
  const at = anchor ? to.cards.indexOf(anchor) : to.cards.length;
  to.cards.splice(at, 0, card!);
}

function chooseScope(value: unknown): void {
  scope.value = value === 'mine' || value === 'blocked' ? value : 'all';
}

defineExpose({ applyMove, board });
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 p-4">
    <header class="flex flex-wrap items-center gap-2">
      <h2 class="mr-auto text-lg font-semibold">Release 2.4</h2>
      <SearchInput v-model="query" placeholder="Filter cards" aria-label="Filter cards" class="w-48" />
      <ToggleGroup :model-value="scope" variant="segmented" aria-label="Scope" @update:model-value="chooseScope">
        <ToggleInput value="all">All</ToggleInput>
        <ToggleInput value="mine">Mine</ToggleInput>
        <ToggleInput value="blocked">Blocked</ToggleInput>
      </ToggleGroup>
      <Button size="sm">
        <Plus class="size-4" aria-hidden="true" />
        New card
      </Button>
    </header>

    <EmptyState
      v-if="visibleCount === 0"
      title="No cards match"
      description="Clear the filter or switch the scope to see the board again."
    />
    <div v-else class="min-h-0 flex-1 overflow-auto">
      <KanbanBoard aria-label="Release 2.4 board" @move="applyMove">
        <KanbanColumn v-for="column in visibleColumns" :key="column.key" :column-key="column.key" :title="column.title">
          <template #header>
            <span class="text-xs tabular-nums text-muted-foreground">{{ column.visible.length }}</span>
          </template>
          <KanbanCard
            v-for="(card, index) in column.visible"
            :key="card.key"
            :item-key="card.key"
            :index="index"
            :label="card.title"
          >
            <div class="flex flex-col gap-2">
              <p class="text-sm font-medium leading-snug">{{ card.title }}</p>
              <div class="flex items-center justify-between gap-2">
                <div class="flex gap-1">
                  <Tag :variant="LabelTag[card.label]">{{ card.label }}</Tag>
                  <Tag v-if="card.isBlocked" variant="warning">blocked</Tag>
                </div>
                <Avatar :name="card.owner" size="xs" :alt="card.owner" can-auto-color />
              </div>
            </div>
          </KanbanCard>
        </KanbanColumn>
      </KanbanBoard>
    </div>
  </div>
</template>
