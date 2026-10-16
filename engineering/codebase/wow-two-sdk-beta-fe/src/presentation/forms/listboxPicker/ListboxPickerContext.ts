import { inject, type InjectionKey } from 'vue';

/** Represents a function that matches items against the current selection. */
export type EqualityFn<T> = (a: T, b: T) => boolean;

/** Provides the default equality (Object.is) — primitives + reference equality. */
export const defaultEquals: EqualityFn<unknown> = (a, b) => Object.is(a, b);

/** Defines the selection-indicator style applied to every item under this listbox. */
export const ListboxPickerIndicator = {
  /** Refers to a trailing check icon on the selected item. */
  Check: 'check',
  /** Refers to a leading checkbox box per item. */
  Checkbox: 'checkbox',
  /** Refers to a leading radio dot per item. */
  Radio: 'radio',
  /** Refers to a leading filled dot per item. */
  Dot: 'dot',
  /** Refers to no indicator. */
  None: 'none',
} as const;

export type ListboxPickerIndicator = (typeof ListboxPickerIndicator)[keyof typeof ListboxPickerIndicator];

/** Represents the per-item registry entry maintained by the listbox. */
export interface ItemEntry {
  id: string;
  value: unknown;
  isDisabled: boolean;
}

/**
 * Represents the shape of the listbox context shared with descendants.
 *
 * Every reactive field is a live getter, so `ctx.activeId` re-reads on each
 * access — the Vue counterpart of React's context object being rebuilt each
 * render. Destructuring takes a one-time snapshot; bind to the object instead.
 */
export interface ListboxPickerContextValue {
  readonly isMultiple: boolean;
  readonly values: ReadonlyArray<unknown>;
  readonly isEqual: EqualityFn<unknown>;
  readonly activeId: string | null;
  readonly indicator: ListboxPickerIndicator;
  readonly isDisabled: boolean;
  onItemSelect: (value: unknown) => void;
  registerItem: (entry: ItemEntry) => void;
  unregisterItem: (id: string) => void;
  setActiveId: (id: string | null) => void;
}

export const listboxContextKey: InjectionKey<ListboxPickerContextValue> = Symbol('wow-two.listbox');

/** Reads the surrounding listbox context; throws when used outside a `<ListboxPicker>`. */
export function useListboxContext(): ListboxPickerContextValue {
  const ctx = inject(listboxContextKey, null);
  if (!ctx) throw new Error('ListboxPicker.Item / Group / SeparatorLayout must be used inside <ListboxPicker>');
  return ctx;
}
