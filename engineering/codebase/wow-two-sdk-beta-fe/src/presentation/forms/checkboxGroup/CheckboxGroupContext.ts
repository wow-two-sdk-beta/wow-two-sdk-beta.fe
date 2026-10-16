/**
 * The group ↔ item channel for `CheckboxGroup`.
 *
 * React injected `checked` / `onChange` into each child with `Children.map` +
 * `cloneElement`. Vue cannot rewrite a slot child's props, so the group PROVIDES this
 * context and `CheckboxField` INJECTS it — the item reads its own selected state and
 * reports toggles back. The item's `value` prop is what keys it, exactly as React's
 * `ChildLike.value` did.
 *
 * `isDisabled` / `isInvalid` ride along so the flags still cascade, and `severFormControl`
 * reproduces React's fresh per-item `FormControlProvider`: without it every item would
 * adopt the surrounding `Field`'s id (duplicate DOM ids) and its `describedBy`.
 */
import { inject, type InjectionKey } from 'vue';

export interface CheckboxGroupContextValue {
  /** Whether `value` is currently selected. */
  readonly isSelected: (value: string | undefined) => boolean;
  /** Toggles `value` in or out of the selection. */
  readonly toggle: (value: string | undefined) => void;
  /** The group-level disabled flag, cascaded to every item. */
  readonly isDisabled: () => boolean | undefined;
  /** The group-level invalid flag, cascaded to every item. */
  readonly isInvalid: () => boolean;
}

export const CheckboxGroupKey: InjectionKey<CheckboxGroupContextValue> = Symbol('wow-two.checkboxGroup');

/** Reads the surrounding `CheckboxGroup`, or `null` when the item stands alone. */
export function useCheckboxGroup(): CheckboxGroupContextValue | null {
  return inject(CheckboxGroupKey, null);
}
