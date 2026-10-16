import { shallowRef, type ShallowRef } from 'vue';

import { fieldIssues } from '../../../foundation/http';
import { AppErrorFactory, type AppError } from '../../../foundation/results';

import type { AppFormOptions, AppFormState, AppFormValidationOptions } from '../../AppForm';
import { deepEqual } from '../../DeepEqual';
import { includesValidationPath, untilFormAbort, validateFormScope } from '../../FormOperations';
import { snapshotFormValues } from '../../FormSnapshot';
import { getPath, hasPath, mutateRows, remapPathMap, remapPathSet, setPath, type ArrayOperation } from '../../Paths';
import {
  createOptionsMessageResolver,
  parseStandardSchema,
  formParseFailure,
  type FormParseResult,
} from '../../SchemaValidation';
import { defaultMapFieldPath, resolveSubmitFailure, toSubmitError } from '../../SubmitErrors';

/*
 * The house micro-store — one immutable state object in a `shallowRef`.
 * SCOPE CEILING (docs/analysis/forms-engine.md §7): flat + dot-path store, whole-schema
 * Standard Schema validation, arrays, dirty/touched, submit pipeline. NO typed deep
 * paths, NO per-field async/debounce validators, NO linked-field graphs — a form that
 * needs those uses the tanstack adapter. Complete shared facade capabilities here;
 * vendor-specific graphs remain the `form.engine` escape hatch.
 *
 * NOTIFICATION IS THE `shallowRef` ITSELF — no listener list, no subscribe call. `commit` assigns
 * the ref and any getter that reads it is tracked wherever it is read. State stays ONE
 * frozen-by-convention object replaced whole, and the generation caching below hands out
 * identity-stable per-path slices so a field re-renders only when its own slice changed.
 */

type ErrorMap = Readonly<Record<string, ReadonlyArray<string>>>;

const EmptyErrors: ReadonlyArray<string> = Object.freeze([]);
const EmptyMap: ErrorMap = Object.freeze(Object.create(null) as Record<string, ReadonlyArray<string>>);

/** The per-field slice the `Field` glue reads — identity-stable while its members are unchanged. */
export interface HouseFieldState {
  readonly value: unknown;
  readonly errors: ReadonlyArray<string>;
  readonly isDirty: boolean;
  readonly isTouched: boolean;
}

interface InternalState<TValues extends object> {
  readonly values: TValues;
  /** The dirty baseline — `reset(next)` re-seeds it. */
  readonly baseline: TValues;
  readonly clientErrors: ErrorMap;
  readonly serverErrors: ErrorMap;
  /** Merged per-path messages, client first — rebuilt whenever either source changes. */
  readonly errors: ErrorMap;
  readonly touched: ReadonlySet<string>;
  readonly submitCount: number;
  readonly isSubmitting: boolean;
  readonly isValidating: boolean;
  readonly submitError: AppError | null;
  /** The last completed submit's verdict — `null` until the first attempt completes and after `reset()`. */
  readonly isSubmitSuccessful: boolean | null;
}

/** The native house form instance — what `form.engine` exposes on the house adapter. */
export interface HouseFormEngine<TValues extends object> {
  /**
   * The raw store. Reading `state.value` inside a `computed` / render / `watchEffect` subscribes
   * to it — the engine's one reactive seam.
   */
  readonly state: Readonly<ShallowRef<unknown>>;
  readonly getFormState: () => AppFormState<TValues>;
  readonly getFieldState: (path: string) => HouseFieldState;
  readonly setValue: (path: string, value: unknown) => void;
  readonly blurField: (path: string) => void;
  readonly applyArrayOperation: (path: string, operation: ArrayOperation) => void;
  readonly reset: (next?: TValues) => void;
  readonly setFieldErrors: (errors: Record<string, ReadonlyArray<string>>) => void;
  readonly clearSubmitError: () => void;
  readonly submit: () => Promise<boolean>;
  /** Validates without submitting — populates errors, marks touched, resolves client validity. */
  readonly validate: (options?: AppFormValidationOptions<TValues>) => Promise<boolean>;
  readonly cancelSubmit: () => void;
  /** Releases the pending auto-submit timer (`submitOn: 'change'`) on scope teardown. */
  readonly dispose: () => void;
}

function mergeErrors(client: ErrorMap, server: ErrorMap): ErrorMap {
  const clientKeys = Object.keys(client);
  const serverKeys = Object.keys(server);
  if (serverKeys.length === 0) return client;
  if (clientKeys.length === 0) return server;
  const merged: Record<string, ReadonlyArray<string>> = Object.assign(Object.create(null), client);
  for (const key of serverKeys) {
    const existing = merged[key];
    merged[key] = existing ? [...existing, ...(server[key] ?? [])] : (server[key] ?? EmptyErrors);
  }
  return merged;
}

function sameMessages(a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean {
  return a === b || (a.length === b.length && a.every((message, index) => message === b[index]));
}

function fieldStatesEqual(a: HouseFieldState, b: HouseFieldState): boolean {
  return (
    Object.is(a.value, b.value) &&
    a.isDirty === b.isDirty &&
    a.isTouched === b.isTouched &&
    sameMessages(a.errors, b.errors)
  );
}

function normalizeErrorMap(errors: Record<string, ReadonlyArray<string>>): ErrorMap {
  const normalized: Record<string, ReadonlyArray<string>> = Object.create(null);
  for (const [path, messages] of Object.entries(errors)) normalized[path] = [...messages];
  return normalized;
}

/** Creates the house form store. `getOptions` reads the latest options (`AppFormOptionsSource`). */
export function createHouseFormEngine<TValues extends object, TOutput = TValues>(
  getOptions: () => AppFormOptions<TValues, TOutput>,
): HouseFormEngine<TValues> {
  const initialValues = snapshotFormValues(getOptions().defaultValues);

  const store = shallowRef<InternalState<TValues>>({
    values: initialValues,
    baseline: snapshotFormValues(initialValues),
    clientErrors: EmptyMap,
    serverErrors: EmptyMap,
    errors: EmptyMap,
    touched: new Set<string>(),
    submitCount: 0,
    isSubmitting: false,
    isValidating: false,
    submitError: null,
    isSubmitSuccessful: null,
  });

  /** The generation the caches below belong to — swapped lazily on the first read after a commit. */
  let generation: InternalState<TValues> | null = null;
  let formState: AppFormState<TValues> | null = null;
  /** Per-path field slices for the current generation, rebuilt lazily and reusing identity when unchanged. */
  let fieldCache = new Map<string, HouseFieldState>();
  let previousFieldCache = new Map<string, HouseFieldState>();
  /** Monotonic guard: only the newest validation run may apply its result (async schemas). */
  let validationEpoch = 0;
  let lifecycleEpoch = 0;
  let requestController = new AbortController();
  let disposed = false;
  let trailingSubmit = false;
  let submittingValues: TValues | null = null;
  /** The pending trailing-debounce auto-submit timer (`submitOn: 'change'`); cleared on reset / teardown. */
  let autoSubmitTimer: ReturnType<typeof setTimeout> | null = null;
  /** Single-flight latch: an in-flight submit coalesces re-entrant triggers (double-click / change-burst). */
  let inFlight: Promise<boolean> | null = null;
  /** The form's message resolver, memoized against the `messages` / `labels` option identities. */
  const messageResolver = createOptionsMessageResolver(getOptions);

  /**
   * Reads the store — THE reactive dependency every getter below inherits — and rolls the cache
   * generation when it has moved. Rolling it on read, not eagerly in `commit`, keeps the commit
   * path free of work no one may look at.
   */
  function currentState(): InternalState<TValues> {
    const internal = store.value;
    if (generation !== internal) {
      generation = internal;
      formState = null;
      previousFieldCache = fieldCache;
      fieldCache = new Map();
    }
    return internal;
  }

  /** The untracked read — for the imperative paths (submit, validation, actions), which must never subscribe. */
  function peek(): InternalState<TValues> {
    return store.value;
  }

  function buildFormState(internal: InternalState<TValues>): AppFormState<TValues> {
    return {
      values: internal.values,
      isDirty: !deepEqual(internal.values, internal.baseline),
      isValid: Object.keys(internal.errors).length === 0,
      isSubmitting: internal.isSubmitting,
      isValidating: internal.isValidating,
      submitError: internal.submitError,
      isSubmitSuccessful: internal.isSubmitSuccessful,
    };
  }

  function commit(next: InternalState<TValues>): void {
    if (disposed) return;
    store.value = next;
  }

  function patch(partial: Partial<InternalState<TValues>>): void {
    const next = { ...peek(), ...partial };
    const errorsChanged = partial.clientErrors !== undefined || partial.serverErrors !== undefined;
    commit(errorsChanged ? { ...next, errors: mergeErrors(next.clientErrors, next.serverErrors) } : next);
  }

  function currentOptions(): AppFormOptions<TValues, TOutput> {
    return getOptions();
  }

  function shouldValidateOnChange(): boolean {
    const validateOn = currentOptions().validateOn ?? 'submit';
    // 'submit' (default) + 'blur' both re-validate on change after the first attempt,
    // so errors clear as the user fixes them.
    return validateOn === 'change' || peek().submitCount > 0 || peek().touched.size > 0;
  }

  function clearAutoSubmitTimer(): void {
    if (autoSubmitTimer !== null) {
      clearTimeout(autoSubmitTimer);
      autoSubmitTimer = null;
    }
  }

  /**
   * Schedules a trailing-debounced auto-submit for `submitOn: 'change'` — a user-origin write
   * calls this; a change burst coalesces onto one submit (the timer resets each write), and the
   * single-flight guard queues the latest overlapping edit. No-op for `'blur'` / `'manual'`. `reset()` cancels it.
   */
  function scheduleAutoSubmit(): void {
    if ((currentOptions().submitOn ?? 'manual') !== 'change') return;
    clearAutoSubmitTimer();
    const delay = currentOptions().submitDebounceMs ?? 0;
    autoSubmitTimer = setTimeout(() => {
      autoSubmitTimer = null;
      void submit();
    }, delay);
  }

  /** Runs whole-schema validation; sync schemas apply synchronously, async ones flip `isValidating`. */
  function runValidation(
    values = snapshotFormValues(peek().values),
  ): FormParseResult<TOutput> | Promise<FormParseResult<TOutput>> {
    const epoch = ++validationEpoch;
    const schema = currentOptions().schema;
    const apply = (result: FormParseResult<TOutput>): FormParseResult<TOutput> => {
      if (epoch === validationEpoch && deepEqual(values, peek().values)) {
        patch({ clientErrors: normalizeErrorMap(result.ok ? {} : result.failure.fieldErrors), isValidating: false });
      } else if (epoch === validationEpoch) patch({ isValidating: false });
      return result;
    };
    const failed = (): FormParseResult<TOutput> =>
      apply(formParseFailure({ '': [currentOptions().fallbackErrorMessage ?? 'Validation failed'] }));
    try {
      const outcome = schema
        ? parseStandardSchema(schema, snapshotFormValues(values), messageResolver())
        : { ok: true as const, value: snapshotFormValues(values) as unknown as TOutput };
      if (outcome instanceof Promise) {
        patch({ isValidating: true });
        return outcome.then(apply, failed);
      }
      return apply(outcome);
    } catch {
      return failed();
    }
  }

  function getFieldState(path: string): HouseFieldState {
    const state = currentState();
    const cached = fieldCache.get(path);
    if (cached) return cached;
    const value = getPath(state.values, path);
    const computed: HouseFieldState = {
      value,
      errors: state.errors[path] ?? EmptyErrors,
      isDirty: !deepEqual(value, getPath(state.baseline, path)),
      // A submit attempt counts as touching everything — error-display gating works post-attempt.
      isTouched:
        [...state.touched].some((selected) => includesValidationPath(path, [selected])) || state.submitCount > 0,
    };
    const previous = previousFieldCache.get(path);
    const stable = previous && fieldStatesEqual(previous, computed) ? previous : computed;
    fieldCache.set(path, stable);
    return stable;
  }

  function setValue(path: string, value: unknown): void {
    const state = peek();
    // Server messages clear on the next change to the field (contract JSDoc).
    const serverErrors = Object.prototype.hasOwnProperty.call(state.serverErrors, path)
      ? Object.fromEntries(Object.entries(state.serverErrors).filter(([key]) => key !== path))
      : state.serverErrors;
    patch({ values: setPath(state.values, path, snapshotFormValues(value)), serverErrors });
    if (shouldValidateOnChange()) void runValidation();
    scheduleAutoSubmit();
  }

  function blurField(path: string): void {
    const state = peek();
    if (!state.touched.has(path)) {
      const touched = new Set(state.touched);
      touched.add(path);
      patch({ touched });
    }
    const options = currentOptions();
    if ((options.validateOn ?? 'submit') === 'blur') void runValidation();
    if ((options.submitOn ?? 'manual') === 'blur') void submit();
  }

  function applyArrayOperation(path: string, operation: ArrayOperation): void {
    const state = peek();
    const current = getPath(state.values, path);
    const rows: unknown[] = Array.isArray(current) ? [...(current as unknown[])] : [];
    mutateRows(
      rows,
      operation.kind === 'push' || operation.kind === 'insert'
        ? { ...operation, value: snapshotFormValues(operation.value) }
        : operation,
    );
    patch({
      values: setPath(state.values, path, rows),
      // Row-scoped errors + touched marks follow their rows (insert/remove/swap/move reindex).
      clientErrors: remapPathMap(state.clientErrors, path, operation),
      serverErrors: remapPathMap(state.serverErrors, path, operation),
      touched: remapPathSet(state.touched, path, operation),
    });
    if (shouldValidateOnChange()) void runValidation();
    scheduleAutoSubmit();
  }

  function reset(next?: TValues): void {
    validationEpoch += 1;
    lifecycleEpoch += 1;
    requestController.abort();
    requestController = new AbortController();
    trailingSubmit = false;
    clearAutoSubmitTimer(); // a reset/prefill never auto-submits — drop any pending trailing submit
    const values = snapshotFormValues(next ?? peek().baseline);
    commit({
      values,
      baseline: snapshotFormValues(values),
      clientErrors: EmptyMap,
      serverErrors: EmptyMap,
      errors: EmptyMap,
      touched: new Set<string>(),
      submitCount: 0,
      isSubmitting: false,
      isValidating: false,
      submitError: null,
      isSubmitSuccessful: null,
    });
  }

  function setFieldErrorsAction(errors: Record<string, ReadonlyArray<string>>): void {
    patch({ serverErrors: normalizeErrorMap(errors) });
  }

  function clearSubmitError(): void {
    if (peek().submitError !== null) patch({ submitError: null });
  }

  async function performSubmit(values: TValues): Promise<boolean> {
    if (disposed || currentOptions().isDisabled) return false;
    const epoch = lifecycleEpoch;
    const signal = requestController.signal;
    const isCurrent = (): boolean => !disposed && epoch === lifecycleEpoch;
    patch({ submitCount: peek().submitCount + 1, serverErrors: EmptyMap, submitError: null, isSubmitSuccessful: null });
    const parsed = await runValidation(values);
    if (!isCurrent()) return false;
    if (!parsed.ok) {
      patch({ isSubmitSuccessful: false });
      return false;
    }
    const options = currentOptions();
    patch({ isSubmitting: true });
    let successful = false;
    try {
      const result = await untilFormAbort(options.onSubmit(parsed.value, { signal }), signal, {
        ok: false,
        failure: AppErrorFactory.cancelled(),
      });
      successful = result.ok;
      if (isCurrent() && result.ok) patch({ baseline: values });
      else if (isCurrent() && !result.ok) {
        const resolution = resolveSubmitFailure(
          result.failure,
          options.mapSubmitError ?? fieldIssues,
          options.mapFieldPath ?? defaultMapFieldPath,
          (path) => hasPath(values, path) && deepEqual(getPath(values, path), getPath(peek().values, path)),
          options.fallbackErrorMessage,
          messageResolver(),
        );
        patch({ serverErrors: normalizeErrorMap(resolution.fieldErrors), submitError: resolution.submitError });
      }
    } catch (error) {
      if (isCurrent()) {
        const resolution = resolveSubmitFailure(
          toSubmitError(error, options.fallbackErrorMessage),
          options.mapSubmitError ?? fieldIssues,
          options.mapFieldPath ?? defaultMapFieldPath,
          (path) => hasPath(values, path) && deepEqual(getPath(values, path), getPath(peek().values, path)),
          options.fallbackErrorMessage,
          messageResolver(),
        );
        patch({ serverErrors: normalizeErrorMap(resolution.fieldErrors), submitError: resolution.submitError });
      }
    } finally {
      if (isCurrent()) patch({ isSubmitting: false, isSubmitSuccessful: successful });
    }
    return successful && isCurrent();
  }

  /** Serializes submissions and coalesces newer edits into one trailing snapshot. */
  async function submit(): Promise<boolean> {
    if (disposed) return false;
    if (inFlight) {
      if (!deepEqual(peek().values, submittingValues)) trailingSubmit = true;
      return inFlight;
    }
    const run = async (): Promise<boolean> => {
      let successful = false;
      do {
        trailingSubmit = false;
        submittingValues = snapshotFormValues(peek().values);
        successful = await untilFormAbort(performSubmit(submittingValues), requestController.signal, false);
      } while (
        !disposed &&
        trailingSubmit &&
        !deepEqual(peek().values, submittingValues) &&
        !deepEqual(peek().values, peek().baseline)
      );
      return successful;
    };
    inFlight = run();
    try {
      return await inFlight;
    } finally {
      inFlight = null;
      submittingValues = null;
    }
  }

  /**
   * Validates without submitting — the validation half of `submit()`: marks every field touched
   * (so errors display and subsequent changes re-validate), runs the whole-form schema, and resolves
   * the client validity. `onSubmit` never runs; the server-error overlay is left untouched.
   */
  async function validate(options?: AppFormValidationOptions<TValues>): Promise<boolean> {
    if (disposed) return false;
    if (options) {
      const epoch = ++validationEpoch;
      const lifecycle = lifecycleEpoch;
      const values = snapshotFormValues(peek().values);
      const touched = new Set(peek().touched);
      for (const path of options.fields ?? Object.keys(values)) touched.add(path);
      patch({ touched, isValidating: true });
      const errors = await untilFormAbort(
        validateFormScope(
          values,
          options,
          currentOptions().schema,
          messageResolver(),
          currentOptions().fallbackErrorMessage ?? 'Validation failed',
        ),
        requestController.signal,
        {},
      );
      if (epoch !== validationEpoch || lifecycle !== lifecycleEpoch || disposed) return false;
      if (!deepEqual(values, peek().values)) {
        patch({ isValidating: false });
        return false;
      }
      const retained = Object.fromEntries(
        Object.entries(peek().clientErrors).filter(([path]) => !includesValidationPath(path, options.fields)),
      );
      patch({ clientErrors: Object.assign(Object.create(null), retained, errors), isValidating: false });
      return Object.keys(errors).length === 0;
    }
    if (peek().submitCount === 0) patch({ submitCount: 1 });
    const lifecycle = lifecycleEpoch;
    const values = snapshotFormValues(peek().values);
    const result = await untilFormAbort(Promise.resolve(runValidation(values)), requestController.signal, null);
    return (
      !disposed && lifecycle === lifecycleEpoch && deepEqual(values, peek().values) && result !== null && result.ok
    );
  }

  // Validate on mount when flagged — seed `isValid` / field errors before any interaction WITHOUT
  // marking fields touched (submitCount stays 0), so an edit screen shows validity without asserting
  // the user has interacted. Runs after every action above is defined.
  if (currentOptions().validateOnMount) void runValidation();

  return {
    state: store,
    getFormState: () => {
      const internal = currentState();
      formState ??= buildFormState(internal);
      return formState;
    },
    getFieldState,
    setValue,
    blurField,
    applyArrayOperation,
    reset,
    setFieldErrors: setFieldErrorsAction,
    clearSubmitError,
    submit,
    validate,
    cancelSubmit: () => {
      lifecycleEpoch += 1;
      validationEpoch += 1;
      requestController.abort();
      requestController = new AbortController();
      trailingSubmit = false;
      clearAutoSubmitTimer();
      patch({
        isSubmitting: false,
        isValidating: false,
        submitError: AppErrorFactory.cancelled(),
        isSubmitSuccessful: false,
      });
    },
    dispose: () => {
      requestController.abort();
      disposed = true;
      lifecycleEpoch += 1;
      validationEpoch += 1;
      trailingSubmit = false;
      clearAutoSubmitTimer();
    },
  };
}
