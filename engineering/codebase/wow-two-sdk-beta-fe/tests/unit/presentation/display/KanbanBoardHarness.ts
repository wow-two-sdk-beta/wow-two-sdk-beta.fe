import { defineComponent, h, ref, type PropType } from 'vue';
import { KanbanBoard, KanbanCard, KanbanColumn, type KanbanMove } from '@src/presentation/display';

interface BoardCard {
  readonly key: string;
  readonly text: string;
  readonly isLocked?: boolean;
}

interface BoardColumn {
  readonly key: string;
  readonly title: string;
  readonly cards: BoardCard[];
}

/** A board that owns its columns and applies every requested move, the way a caller would. */
export const KanbanBoardHarness = defineComponent({
  name: 'KanbanBoardHarness',
  props: { isLocked: { type: Boolean as PropType<boolean>, default: false } },
  emits: { applied: (move: KanbanMove) => Boolean(move) },
  setup(props, { emit }) {
    const columns = ref<BoardColumn[]>([
      {
        key: 'todo',
        title: 'To do',
        cards: [
          { key: 't1', text: 'Write spec', isLocked: props.isLocked },
          { key: 't2', text: 'Draw icons' },
        ],
      },
      { key: 'doing', title: 'Doing', cards: [{ key: 'd1', text: 'Build board' }] },
      { key: 'done', title: 'Done', cards: [] },
    ]);
    function apply(move: KanbanMove): void {
      const from = columns.value.find((column) => column.key === move.fromColumn)!;
      const [card] = from.cards.splice(move.fromIndex, 1);
      columns.value.find((column) => column.key === move.toColumn)!.cards.splice(move.toIndex, 0, card!);
      emit('applied', move);
    }
    return () =>
      h(KanbanBoard, { onMove: apply }, () =>
        columns.value.map((column) =>
          h(KanbanColumn, { key: column.key, columnKey: column.key, title: column.title }, () =>
            column.cards.map((card, index) =>
              h(KanbanCard, { key: card.key, itemKey: card.key, index, isLocked: card.isLocked }, () => card.text),
            ),
          ),
        ),
      );
  },
});
