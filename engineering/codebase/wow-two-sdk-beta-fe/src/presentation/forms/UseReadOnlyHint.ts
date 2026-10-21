import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useId } from '../../foundation/identifiers';

/** Represents the accessible read-only description of a control whose role has no `aria-readonly`. */
export interface ReadOnlyHintHandle {
  /** The id of the visually hidden description — render `<ReadOnlyHint :id="hintId" />` beside the control. */
  readonly hintId: string;

  /** Reports whether the control is read-only, so the hint renders and joins `aria-describedby`. */
  readonly isShown: ComputedRef<boolean>;

  /** Joins the control's own description ids with the hint's while it is shown; `undefined` when both are empty. */
  describedBy: (ids?: string) => string | undefined;
}

/**
 * Describes a read-only control whose ARIA role cannot carry `aria-readonly` (a `button`, a `group`, a drop zone).
 * The state reaches assistive technology as the control's accessible description — "Read only" — while the control
 * stays focusable. A control whose role allows `aria-readonly` (a `combobox`, a `listbox`, a `textbox`) sets that
 * attribute and needs no hint.
 */
export function useReadOnlyHint(isReadOnly: MaybeRefOrGetter<boolean | undefined>): ReadOnlyHintHandle {
  const hintId = useId('read-only');
  const isShown = computed(() => Boolean(toValue(isReadOnly)));
  return {
    hintId,
    isShown,
    describedBy: (ids) => {
      const joined = [ids, isShown.value ? hintId : undefined].filter(Boolean).join(' ');
      return joined === '' ? undefined : joined;
    },
  };
}
