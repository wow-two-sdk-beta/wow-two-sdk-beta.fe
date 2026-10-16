import { nextTick } from 'vue';

import type { AppFormValidationOptions } from './AppForm';
import { focusFirstInvalid } from './FocusFirstInvalid';
import { snapshotFormValues } from './FormSnapshot';
import { parsePath } from './Paths';
import { formParseFailure, parseStandardSchema } from './SchemaValidation';
import type { ResolveValidationMessage } from '../foundation/validators';
import type { StandardSchemaV1 } from './StandardSchema';

/** Matches path segments, so selecting row 1 never selects row 10. Root errors always apply. */
export function includesValidationPath(path: string, fields?: ReadonlyArray<string>): boolean {
  if (!fields || path === '') return true;
  const segments = parsePath(path);
  return fields.some((field) => {
    const selected = parsePath(field);
    return selected.every((segment, index) => segments[index] === segment);
  });
}

/** Runs a display-only gate and filters issues without bypassing whole-form submit parsing. */
export async function validateFormScope<TValues extends object>(
  values: TValues,
  options: AppFormValidationOptions<TValues>,
  schema: StandardSchemaV1<TValues, unknown> | undefined,
  resolver: ResolveValidationMessage,
  fallback: string,
): Promise<Record<string, ReadonlyArray<string>>> {
  try {
    const selected = options.schema ?? schema;
    if (!selected) return {};
    const result = await parseStandardSchema(selected, snapshotFormValues(values), resolver);
    return result.ok
      ? {}
      : Object.fromEntries(
          Object.entries(result.failure.fieldErrors).filter(([path]) => includesValidationPath(path, options.fields)),
        );
  } catch {
    const result = formParseFailure({ '': [fallback] });
    return result.ok ? {} : result.failure.fieldErrors;
  }
}

/** Settles even when a transport ignores abort, while observing its eventual rejection. */
export function untilFormAbort<T>(work: Promise<T>, signal: AbortSignal, cancelled: T): Promise<T> {
  if (signal.aborted) {
    void work.catch(() => undefined);
    return Promise.resolve(cancelled);
  }
  return new Promise<T>((resolve, reject) => {
    const abort = (): void => resolve(cancelled);
    signal.addEventListener('abort', abort, { once: true });
    void work.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

/** Captures event scope synchronously, then focuses rendered failures only for current manual attempts. */
export async function submitWithFocus(
  submit: () => Promise<boolean>,
  isCurrent: () => boolean,
  event?: Event,
  root?: ParentNode | null,
): Promise<boolean> {
  event?.preventDefault();
  const target = event?.currentTarget;
  const scope = root ?? (target && 'querySelector' in target ? (target as ParentNode) : null);
  const successful = await submit();
  await nextTick();
  if (!successful && isCurrent() && scope && !focusFirstInvalid(scope)) {
    const summary = scope.querySelector<HTMLElement>('[data-form-error-summary]');
    if (summary && !summary.closest('[inert], [hidden], [aria-hidden="true"]')) summary.focus();
  }
  return successful;
}
