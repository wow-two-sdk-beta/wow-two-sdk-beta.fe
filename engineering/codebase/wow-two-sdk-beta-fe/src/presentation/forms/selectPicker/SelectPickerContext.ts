import { inject, type InjectionKey, type ShallowRef } from 'vue';
import type { EqualityComparer } from '../../../foundation/collections';

/**
 * Represents a single dropdown option as `{ itemKey, value, label }` — V defaults to K.
 *
 * React typed `label` as `ReactNode`. It is `string | number` here: `options` is
 * plain data, and the label doubles as the substring-search text, which a slot
 * cannot supply. Rich per-row rendering stays available through `<SelectPickerItem>`'s
 * default slot.
 */
export interface SelectPickerOption<K, V = K> {
  readonly itemKey: K;
  readonly value: V;
  readonly label: string | number;
  readonly isDisabled?: boolean;
}

/** Represents an internal item-registry entry — option + plain-text for substring search. */
export interface ItemRegistryEntry {
  itemKey: unknown;
  value: unknown;
  label: string | number;
  text: string;
  /** Mirrors the item's disabled state so closed-trigger typeahead can skip it (the list skips via ListboxPicker). */
  isDisabled: boolean;
}

/** Provides a plain-text representation of a label for substring search. */
export function extractText(label: string | number | null | undefined): string {
  return label == null ? '' : String(label);
}

/**
 * Represents the shape of the select context shared with descendants.
 *
 * Every reactive field is a live getter, so `ctx.open` re-reads on each access —
 * the Vue counterpart of React's context object being rebuilt each render.
 * Destructuring takes a one-time snapshot; bind to the object instead.
 */
export interface SelectPickerContextValue {
  readonly open: boolean;
  setOpen: (open: boolean) => void;
  readonly selectedKey: unknown;
  readonly hasSelection: boolean;
  /** Holds the label captured at selection time — keeps the trigger labelled while the popover is closed. */
  readonly selectedLabel: string | number | null;
  onSelect: (entry: ItemRegistryEntry) => void;
  onClear: () => void;
  readonly keyEquals: EqualityComparer<unknown>;
  readonly items: ReadonlyArray<ItemRegistryEntry>;
  registerItem: (entry: ItemRegistryEntry) => void;
  unregisterItem: (itemKey: unknown) => void;
  /** Resolves a label last seen for a key from the persistent cache (survives unmount). */
  getCachedLabel: (key: unknown) => string | number | undefined;
  readonly query: string;
  setQuery: (query: string) => void;
  readonly isDisabled: boolean;
  readonly isLoading: boolean;
  readonly loadingLabel: string;
  readonly isClearable: boolean;
  readonly clearLabel: string;
  serializeKey: (key: unknown) => string;
  getOptionLabel: (key: unknown) => string | number | null;
  readonly name?: string;
  readonly isInvalid: boolean;
  /** Stable id of the inner ListboxPicker — wired to the trigger's `aria-controls`. */
  readonly listboxId: string;

  /** Reflects the listbox's active option id for `aria-activedescendant`. */
  readonly activeDescendant: string | null;
  setActiveDescendant: (id: string | null) => void;
  /** Holds the DOM node of the inner ListboxPicker — the keyboard bridge re-dispatches onto it. */
  listboxEl: ShallowRef<HTMLElement | null>;

  /** Form-control wiring inherited from a surrounding `<Field>` (undefined when standalone).
   *  `labelId`/`describedBy` carry only ids of chrome that is actually rendered. */
  readonly fieldId?: string;
  readonly labelId?: string;
  readonly describedBy?: string;
}

export const selectContextKey: InjectionKey<SelectPickerContextValue> = Symbol('wow-two.select');

/** Reads the surrounding select context; throws when used outside a `<SelectPicker>`. */
export function useSelectContext(): SelectPickerContextValue {
  const ctx = inject(selectContextKey, null);
  if (!ctx) throw new Error('SelectPicker.* must be used inside <SelectPicker>');
  return ctx;
}
