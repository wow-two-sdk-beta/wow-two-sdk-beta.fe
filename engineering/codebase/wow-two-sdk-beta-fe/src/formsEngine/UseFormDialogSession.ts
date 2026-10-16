import { toValue, watch, type MaybeRefOrGetter } from 'vue';

import type { AppForm } from './AppForm';

/** Options for `useFormDialogSession`. */
export interface FormDialogSessionOptions<TValues extends object> {
  /** Whether the dialog is open — usually `() => props.open`. */
  readonly open: MaybeRefOrGetter<boolean>;

  /** The values each session starts from, read as the dialog opens — e.g. `() => toForm(props.product)`. */
  readonly initialValues: () => TValues;

  /** Runs as each session starts, after the reset — clear view-local state such as an error banner. */
  readonly onOpen?: () => void;
}

/**
 * Starts a fresh form session each time a dialog opens: old-session work is invalidated and the form resets to
 * `initialValues()`. The reset runs in Vue's pre-flush, after the parent has written every prop of the update that
 * opened the dialog, so values derived from another prop (the record being edited) are never one update stale — the
 * failure of a `flush: 'sync'` watcher on `open`, which fires before the sibling props land. Edits made while the
 * dialog stays open are kept; reopen it to start over.
 */
export function useFormDialogSession<TValues extends object>(
  form: Pick<AppForm<TValues>, 'invalidateSession'>,
  options: FormDialogSessionOptions<TValues>,
): void {
  watch(
    () => toValue(options.open),
    (open) => {
      if (!open) return;
      form.invalidateSession(options.initialValues());
      options.onOpen?.();
    },
    { immediate: true },
  );
}
