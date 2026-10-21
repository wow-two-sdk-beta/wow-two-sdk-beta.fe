import { inject, type InjectionKey } from 'vue';

/**
 * The seam between `MultiSelectPicker` and its `Trigger` / `Tags` / `Content` / `Item` children.
 *
 * React attached those as `MultiSelectPicker.Trigger` / `.Tags` / … statics over a `createContext`.
 * An SFC's generated default export cannot carry statics cleanly, so they ship as sibling
 * components and share state through provide/inject instead.
 *
 * Every field but the setters is a live getter — read them off the object, don't destructure.
 */
export interface MultiSelectPickerContextValue {
  readonly open: boolean;
  setOpen: (open: boolean) => void;
  readonly values: ReadonlyArray<string>;
  setValues: (values: ReadonlyArray<string>) => void;

  /**
   * The chip text per selected value.
   *
   * React registered each item's `children` (a `ReactNode`) here. It is `string | number`
   * in this port for the same reason `SelectPickerOption.label` is: a slot cannot be captured into
   * a plain registry, and the tag also feeds the remove button's accessible name. Rich rows
   * stay available through `<MultiSelectPickerItem>`'s default slot.
   */
  readonly labels: Record<string, string | number>;
  registerLabel: (value: string, label: string | number) => void;
  unregisterLabel: (value: string) => void;

  /**
   * Resolves a chip label for a value no row carries, and for the server render — `null` when it cannot.
   *
   * A closed panel mounts its rows off-document, so rows label a preselected value before the first
   * open; the registry wins where it has an entry.
   */
  getOptionLabel: (value: string) => string | number | null;

  /** Reports a disabled or read-only picker alike — the picker neither opens nor changes. */
  readonly isDisabled: boolean;
  /** Reports a read-only picker that is not also disabled: it stays focusable and shows its values. */
  readonly isReadOnly: boolean;
  readonly name?: string;
  readonly isInvalid?: boolean;

  /** Stable id of the panel's listbox — wired to the trigger's `aria-controls`. */
  readonly listboxId: string;

  /** Form-control wiring inherited from a surrounding `<Field>` (undefined when standalone).
   *  `labelId`/`describedBy` carry only ids of chrome that is actually rendered. */
  readonly fieldId?: string;
  readonly labelId?: string;
  readonly describedBy?: string;
}

export const multiSelectContextKey: InjectionKey<MultiSelectPickerContextValue> = Symbol('wow-two.multiSelect');

/** Reads the surrounding multi-select context; throws when used outside a `<MultiSelectPicker>`. */
export function useMultiSelectContext(): MultiSelectPickerContextValue {
  const ctx = inject(multiSelectContextKey, null);
  if (!ctx) throw new Error('MultiSelectPicker.* must be used inside <MultiSelectPicker>');
  return ctx;
}
