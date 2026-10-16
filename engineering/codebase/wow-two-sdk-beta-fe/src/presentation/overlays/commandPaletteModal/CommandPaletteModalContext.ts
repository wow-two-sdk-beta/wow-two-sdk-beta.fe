import { inject, type InjectionKey, type Ref, type ShallowRef } from 'vue';

/** One registered `CommandPaletteModalItem` — the unit the filter and the arrow walk move across. */
export interface CommandItemEntry {
  id: string;
  value: string;
  searchText: string;
  disabled: boolean;
  select: () => void;
  closeOnSelect: boolean;
}

/**
 * The seam between `CommandPaletteModal` and its parts.
 *
 * React carried the registry as a mutable `useRef` array plus a `registryVersion`
 * counter, because a ref mutation cannot re-render. A `shallowRef` holding a
 * replaced array is reactive on its own, so the counter is gone — readers watch
 * `items` directly.
 */
export interface CommandPaletteModalContextValue {
  /** The resolved open state. Writable — an assignment routes through `setOpen`. */
  open: Ref<boolean>;
  setOpen: (open: boolean) => void;

  /** The resolved search text. Writable — an assignment routes through `setInputValue`. */
  inputValue: Ref<string>;
  setInputValue: (input: string) => void;

  /** The `aria-activedescendant` target — the id of the highlighted option. */
  activeId: ShallowRef<string | null>;
  setActiveId: (id: string | null) => void;

  /** The live item registry. */
  items: ShallowRef<ReadonlyArray<CommandItemEntry>>;
  registerItem: (entry: CommandItemEntry) => void;
  unregisterItem: (id: string) => void;

  /** The match predicate. Reads the root's live `filter` prop. */
  filter: (searchText: string, search: string) => boolean;

  inputId: string;
  listboxId: string;
  inputEl: ShallowRef<HTMLInputElement | null>;
}

export const commandPaletteContextKey: InjectionKey<CommandPaletteModalContextValue> = Symbol('wow-two.commandPalette');

export function useCommandPaletteContext(): CommandPaletteModalContextValue {
  const context = inject(commandPaletteContextKey, null);
  if (!context) throw new Error('CommandPaletteModal.* must be used inside <CommandPaletteModal>');
  return context;
}

/** The default match predicate — case-insensitive substring. */
export const defaultFilter = (searchText: string, search: string): boolean =>
  searchText.toLowerCase().includes(search.toLowerCase());
