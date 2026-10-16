import { inject, type InjectionKey } from 'vue';

/** Describes one requested card move; the caller owns the data and applies it. */
export interface KanbanMove {
  /** The moved card. */
  readonly itemKey: string;

  /** The column the card leaves. */
  readonly fromColumn: string;

  /** The card's index in the column it leaves. */
  readonly fromIndex: number;

  /** The column the card joins — the same column for a reorder. */
  readonly toColumn: string;

  /** The card's index in the target column once the move is applied. */
  readonly toIndex: number;
}

/** @internal The card being dragged. */
export interface KanbanDrag {
  readonly itemKey: string;
  readonly columnKey: string;
  readonly index: number;
}

/** @internal Where a dragged card would land — before the card at `index`, or after the last card. */
export interface KanbanDropTarget {
  readonly columnKey: string;
  readonly index: number;
  readonly isEnd: boolean;
}

/** @internal The direction of a keyboard move. */
export type KanbanDirection = 'up' | 'down' | 'previous' | 'next';

/** The drag state a `KanbanBoard` shares with its columns and cards. */
export interface KanbanBoardContextValue {
  /** The card being dragged. Live getter. */
  readonly dragging: KanbanDrag | null;

  /** Where the dragged card would land. Live getter. */
  readonly dropTarget: KanbanDropTarget | null;

  /** The id of the board's keyboard hint, which every card references. */
  readonly hintId: string;

  startDrag: (drag: KanbanDrag) => void;
  setDropTarget: (target: KanbanDropTarget | null) => void;
  drop: () => void;
  endDrag: () => void;
  moveByKeyboard: (drag: KanbanDrag, direction: KanbanDirection) => void;
}

export const KanbanBoardKey: InjectionKey<KanbanBoardContextValue> = Symbol('wow-two.kanbanBoard');

/** Reads the surrounding `KanbanBoard`. Throws outside one — columns and cards are not standalone. */
export function useKanbanBoardContext(): KanbanBoardContextValue {
  const context = inject(KanbanBoardKey, null);
  if (!context) throw new Error('KanbanColumn and KanbanCard must be used inside <KanbanBoard>');
  return context;
}

/** @internal The column key a `KanbanColumn` shares with its cards. */
export const KanbanColumnKey: InjectionKey<{ readonly columnKey: string }> = Symbol('wow-two.kanbanColumn');
