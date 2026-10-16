import { inject, type InjectionKey } from 'vue';

/** The drag state a `SortableGroup` root shares with its items and handles. */
export interface SortableGroupContextValue {
  readonly count: number;
  dragIndex: number | null;
  overIndex: number | null;
  begin: (index: number) => void;
  hover: (index: number) => void;
  end: (commit?: boolean) => void;
  move: (from: number, to: number) => void;
}

export const SortableGroupKey: InjectionKey<SortableGroupContextValue> = Symbol('wow-two.sortable');

/** The per-row state a `SortableGroupItem` shares with its handle. */
export interface SortableGroupItemContextValue {
  index: number;
  arm: () => void;
  disarm: () => void;
}

export const SortableGroupItemKey: InjectionKey<SortableGroupItemContextValue> = Symbol('wow-two.sortableItem');

/** Reads the enclosing `SortableGroup` drag state. */
export function useSortableRoot(): SortableGroupContextValue {
  const context = inject(SortableGroupKey, null);
  if (!context) throw new Error('SortableGroup.Item must be rendered inside <SortableGroup>.');
  return context;
}

/** Reads the enclosing `SortableGroupItem` state. */
export function useSortableItem(): SortableGroupItemContextValue {
  const context = inject(SortableGroupItemKey, null);
  if (!context) throw new Error('SortableGroup.Handle must be rendered inside <SortableGroup.Item>.');
  return context;
}
