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
   * Resolves a chip label for a value the registry has never seen — `null` when it cannot.
   *
   * Rows only register while the panel is mounted, so a preselected value has no registered
   * label until the dropdown has been opened once and the trigger shows the raw key. Same
   * gap `SelectPicker` closes with `getOptionLabel`; this is that escape hatch, and the registry
   * still wins where it has an entry.
   */
  getOptionLabel: (value: string) => string | number | null;

  readonly isDisabled: boolean;
  readonly name?: string;
  readonly isInvalid?: boolean;

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
