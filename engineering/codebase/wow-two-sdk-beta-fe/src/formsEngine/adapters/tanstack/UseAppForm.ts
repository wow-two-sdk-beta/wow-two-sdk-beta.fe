import { createFormArrayIdentity } from '../../FormArrayIdentity';
import { onMounted, onScopeDispose, shallowRef, toValue, type ShallowRef } from 'vue';

import {
  revalidateLogic,
  useForm,
  type DeepKeys,
  type FormApi,
  type FormAsyncValidateOrFn,
  type FormOptions,
  type FormValidateAsyncFn,
  type VueFormApi,
} from '@tanstack/vue-form';

import { fieldIssues } from '../../../foundation/http';
import { AppErrorFactory, type AppError } from '../../../foundation/results';
import type { ResolveValidationMessage } from '../../../foundation/validators';

import type {
  AppFieldApi,
  AppForm,
  AppFormOptions,
  AppFormOptionsSource,
  AppFormState,
  AppFormValidationOptions,
} from '../../AppForm';
import { deepEqual } from '../../DeepEqual';
import { includesValidationPath, submitWithFocus, untilFormAbort, validateFormScope } from '../../FormOperations';
import { snapshotFormValues } from '../../FormSnapshot';
import { createFieldApi, createFieldComponent, createFormStateView, createUseFormState } from '../../FormGlue';
import { getPath, hasPath } from '../../Paths';
import {
  createOptionsMessageResolver,
  parseStandardSchema,
  formParseFailure,
  type FormParseResult,
} from '../../SchemaValidation';
import { defaultMapFieldPath, resolveSubmitFailure, toSubmitError } from '../../SubmitErrors';

import { createTanstackFormOverlay, type TanstackFormOverlay, type TanstackOverlayState } from './TanstackFormOverlay';

/*
 * The tanstack adapter — the facade contract over `@tanstack/vue-form` (optional peer).
 * TanStack owns values, validation scheduling, and the submit lifecycle; the overlay
 * (`TanstackFormOverlay`) owns everything the contract pins that TanStack models
 * differently — server-error merge/clearing, baseline-compared dirty, blur-or-submit
 * touched, contract array reindexing, `submitError` (see the overlay's module doc).
 *
 * Validation wiring: the whole-form Standard Schema runs as a TanStack form-level
 * `onDynamicAsync` validator under `revalidateLogic` — `validateOn` maps 1:1 onto its
 * pre-submission `mode` ('submit' default / 'blur' / 'change'), and `modeAfterSubmission:
 * 'change'` gives the pinned post-attempt change-revalidation. The validator returns
 * TanStack's global `{ form?, fields }` error shape, so client errors land in TanStack
 * field meta (created on demand — no TanStack `Field` mounts needed) and `state.isValid`
 * stays engine-native. Adapter notes (both mirror the contract's static options intent):
 *   - `validateOn` is creation-pinned; schema and message values are read per run.
 *     Schema presence may change through the options getter.
 *   - Escape-hatch writes (`engine.setFieldValue`) bypass the overlay — server-error
 *     clearing and touched semantics then follow TanStack, not the contract.
 *
 * HOW STATE IS READ. `@tanstack/vue-form` is `form-core` under a Vue host binding.
 *   - The returned instance is `FormApi & VueFormApi`.
 *   - TanStack's store is a `@tanstack/store` `Store`, invisible to Vue's tracker. It is bridged
 *     ONCE, here, into a `shallowRef` (`bridgeStore`); every contract read then flows through
 *     Vue reactivity. `form.useSelector` would do the same per slice, but it wraps its ref in
 *     `readonly()`, which would hand values back through a proxy and break the identity compares
 *     the reader and `deepEqual` rely on.
 *   - `useForm` applies its options ONCE (Vue's `setup` runs once), so the options object must
 *     stay stable: `reset()` keeps `tanstackOptions.defaultValues` in step with TanStack's own
 *     copy.
 */

/** The native TanStack form instance the adapter builds — what `form.engine` exposes. */
export type TanstackFormEngine<TValues extends object> = FormApi<
  TValues,
  undefined, // onMount
  undefined, // onChange
  undefined, // onChangeAsync
  undefined, // onBlur
  undefined, // onBlurAsync
  undefined, // onSubmit
  undefined, // onSubmitAsync
  undefined, // onDynamic
  FormAsyncValidateOrFn<TValues>, // onDynamicAsync — the adapter's schema bridge
  undefined, // onServer
  never // submitMeta
> &
  VueFormApi<
    TValues,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    FormAsyncValidateOrFn<TValues>,
    undefined,
    never
  >;

type TanstackFormOptions<TValues extends object> = FormOptions<
  TValues,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  FormAsyncValidateOrFn<TValues>,
  undefined,
  never
>;

const EmptyMessages: ReadonlyArray<string> = Object.freeze([]);

/**
 * Folds the shared schema-error map into TanStack's global form error shape:
 * root-path (`''`) issues become the form-level error, the rest per-field errors.
 */
function toEngineValidationError(errors: Record<string, ReadonlyArray<string>>): unknown {
  const paths = Object.keys(errors);
  if (paths.length === 0) return undefined;
  const fields: Record<string, ReadonlyArray<string>> = Object.create(null);
  let form: ReadonlyArray<string> | undefined;
  for (const path of paths) {
    if (path === '') form = errors[path];
    else fields[path] = errors[path] ?? [];
  }
  return form ? { form, fields } : { fields };
}

/**
 * Normalizes TanStack field-meta errors to plain messages. The adapter's own validator
 * yields `string[]`, but escape-hatch validators may add strings, nested arrays, or
 * Standard Schema issue objects — all are accepted.
 */
function toMessages(errors: ReadonlyArray<unknown> | undefined): ReadonlyArray<string> {
  if (!errors || errors.length === 0) return EmptyMessages;
  const messages: string[] = [];
  const visit = (error: unknown): void => {
    if (error === null || error === undefined) return;
    if (typeof error === 'string') {
      messages.push(error);
      return;
    }
    if (Array.isArray(error)) {
      for (const entry of error) visit(entry);
      return;
    }
    if (typeof error === 'object' && typeof (error as { message?: unknown }).message === 'string') {
      messages.push((error as { message: string }).message);
    }
  };
  for (const error of errors) visit(error);
  return messages.length > 0 ? messages : EmptyMessages;
}

/** The per-field slice the `Field` glue reads — identity-stable while its members are unchanged. */
interface TanstackFieldState {
  readonly value: unknown;
  readonly errors: ReadonlyArray<string>;
  readonly isDirty: boolean;
  readonly isTouched: boolean;
}

/** The minimal structural view of TanStack form state the reader consumes (loose string paths). */
interface EngineStateView {
  readonly values: unknown;
  readonly isValid: boolean;
  readonly isValidating: boolean;
  readonly isFormValidating: boolean;
  readonly fieldMeta: Partial<Record<string, { readonly errors: ReadonlyArray<unknown> }>>;
}

function sameMessages(a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean {
  return a === b || (a.length === b.length && a.every((message, index) => message === b[index]));
}

function fieldStatesEqual(a: TanstackFieldState, b: TanstackFieldState): boolean {
  return (
    Object.is(a.value, b.value) &&
    a.isDirty === b.isDirty &&
    a.isTouched === b.isTouched &&
    sameMessages(a.errors, b.errors)
  );
}

/**
 * Mirrors the `@tanstack/store` store into a `shallowRef` — the ONE seam that puts TanStack
 * state inside Vue's tracker. Deliberately not `useSelector`/`useStore` from
 * `@tanstack/vue-store`: those wrap the ref in `readonly()`, which would hand every read back
 * through a deep proxy and defeat the `Object.is` identity compares the reader, `deepEqual`, and
 * TanStack's own writes all depend on.
 */
function bridgeStore<TValues extends object>(engine: TanstackFormEngine<TValues>): ShallowRef<EngineStateView> {
  const snapshot = shallowRef(engine.store.state as unknown as EngineStateView);
  const subscription = engine.store.subscribe((next) => {
    snapshot.value = next as unknown as EngineStateView;
  });
  onScopeDispose(() => subscription.unsubscribe(), true);
  return snapshot;
}

interface CombinedReader<TValues extends object> {
  readonly getFormState: () => AppFormState<TValues>;
  readonly getFieldState: (path: string) => TanstackFieldState;
}

/**
 * Derives the contract state from the (TanStack store state, overlay state) pair with
 * generation caching: snapshots are rebuilt only when either source commits, and per-path
 * field slices reuse the previous generation's identity when unchanged — so a read stays
 * referentially stable between commits. Both sources are `shallowRef`s, so every read below
 * is also the subscription.
 */
function createCombinedReader<TValues extends object>(
  snapshot: ShallowRef<EngineStateView>,
  overlay: TanstackFormOverlay<TValues>,
): CombinedReader<TValues> {
  let generation: { tan: EngineStateView; ov: TanstackOverlayState<TValues> } | null = null;
  let formState: AppFormState<TValues> | null = null;
  let fieldCache = new Map<string, TanstackFieldState>();
  let previousFieldCache = new Map<string, TanstackFieldState>();

  function currentGeneration(): { tan: EngineStateView; ov: TanstackOverlayState<TValues> } {
    const tan = snapshot.value;
    const ov = overlay.state.value;
    if (generation && generation.tan === tan && generation.ov === ov) return generation;
    generation = { tan, ov };
    formState = null;
    previousFieldCache = fieldCache;
    fieldCache = new Map();
    return generation;
  }

  return {
    getFormState: () => {
      const { tan, ov } = currentGeneration();
      formState ??= {
        values: tan.values as TValues,
        isDirty: !deepEqual(tan.values, ov.baseline),
        // Client validity is engine-native; the server-error overlay holds it false too.
        isValid:
          (ov.scopedErrors === null
            ? tan.isValid
            : Object.keys(ov.scopedErrors).length === 0 &&
              Object.entries(tan.fieldMeta).every(
                ([path, meta]) => includesValidationPath(path, ov.scopedFields) || !meta?.errors.length,
              )) && Object.keys(ov.serverErrors).length === 0,
        isSubmitting: ov.isSubmitting,
        // Whole-schema validation is a FORM-level validator — TanStack's derived
        // `isValidating` counts field-level validators only, so merge both flags.
        isValidating: tan.isFormValidating || tan.isValidating || ov.isScopeValidating,
        submitError: ov.submitError,
        isSubmitSuccessful: ov.isSubmitSuccessful,
      };
      return formState;
    },
    getFieldState: (path) => {
      const { tan, ov } = currentGeneration();
      const cached = fieldCache.get(path);
      if (cached) return cached;
      const value = getPath(tan.values, path);
      const clientMessages =
        ov.scopedErrors !== null && includesValidationPath(path, ov.scopedFields)
          ? (ov.scopedErrors[path] ?? EmptyMessages)
          : toMessages(tan.fieldMeta[path]?.errors);
      const serverMessages = ov.serverErrors[path] ?? EmptyMessages;
      const computed: TanstackFieldState = {
        value,
        // Client + server messages merged, client first (contract JSDoc).
        errors:
          serverMessages.length === 0
            ? clientMessages
            : clientMessages.length === 0
              ? serverMessages
              : [...clientMessages, ...serverMessages],
        isDirty: !deepEqual(value, getPath(ov.baseline, path)),
        // A submit attempt counts as touching everything — error-display gating works post-attempt.
        isTouched: [...ov.touched].some((selected) => includesValidationPath(path, [selected])) || ov.submitCount > 0,
      };
      const previous = previousFieldCache.get(path);
      const stable = previous && fieldStatesEqual(previous, computed) ? previous : computed;
      fieldCache.set(path, stable);
      return stable;
    },
  };
}

interface AdapterPrelude<TValues extends object, TOutput> {
  readonly getOptions: () => AppFormOptions<TValues, TOutput>;
  readonly overlay: TanstackFormOverlay<TValues>;
  readonly tanstackOptions: TanstackFormOptions<TValues>;
  readonly parseValues: (values: TValues, fresh?: boolean) => Promise<FormParseResult<TOutput>>;
  /** The form's message resolver, memoized against the `messages` / `labels` option identities. */
  readonly messageResolver: () => ResolveValidationMessage;
  readonly bindValues: (read: () => TValues) => void;
}

/** Builds the overlay + the stable TanStack options (all callbacks read the latest options through `getOptions`). */
function createAdapterPrelude<TValues extends object, TOutput>(
  getOptions: () => AppFormOptions<TValues, TOutput>,
): AdapterPrelude<TValues, TOutput> {
  let readCurrentValues: (() => TValues) | null = null;
  const initialOptions = getOptions();
  const initialValues = snapshotFormValues(initialOptions.defaultValues);
  const overlay = createTanstackFormOverlay<TValues>(snapshotFormValues(initialValues));
  const messageResolver = createOptionsMessageResolver(getOptions);

  let cached: {
    values: TValues;
    schema: AppFormOptions<TValues, TOutput>['schema'];
    resolver: ResolveValidationMessage;
    result: Promise<FormParseResult<TOutput>>;
  } | null = null;
  const parseValues = (values: TValues, fresh = false): Promise<FormParseResult<TOutput>> => {
    const schema = getOptions().schema;
    const resolver = messageResolver();
    if (
      !fresh &&
      cached !== null &&
      deepEqual(cached.values, values) &&
      cached.schema === schema &&
      cached.resolver === resolver
    )
      return cached.result;
    const snapshot = snapshotFormValues(values);
    const result = Promise.resolve()
      .then(() =>
        schema
          ? parseStandardSchema(schema, snapshot, resolver)
          : { ok: true as const, value: snapshot as unknown as TOutput },
      )
      .catch((): FormParseResult<TOutput> =>
        formParseFailure({ '': [getOptions().fallbackErrorMessage ?? 'Validation failed'] }),
      );
    cached = { values: snapshotFormValues(values), schema, resolver, result };
    return result;
  };

  const tanstackOptions: TanstackFormOptions<TValues> = {
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      // The contract's `isSubmitting` brackets ONLY the app submit call (house-identical),
      // not TanStack's validation window. Failures propagate to the adapter's
      // `handleSubmit` catch, so TanStack's own submit lifecycle stays truthful.
      overlay.setSubmitting(true);
      try {
        const parsed = await parseValues(value, true);
        if (!parsed.ok) return;
        const result = await getOptions().onSubmit(parsed.value, { signal: new AbortController().signal });
        // Reached only when validation passed AND the app submit resolved — the verdict's
        // sole success signal (the invalid path never runs this; a throw skips it).
        overlay.setSubmitSuccessful(result.ok);
      } finally {
        overlay.setSubmitting(false);
      }
    },
  };

  const validateWithSchema: FormValidateAsyncFn<TValues> = async ({ value, signal }) => {
    overlay.setScope(null);
    const snapshot = snapshotFormValues(value);
    const result = await untilFormAbort(parseValues(snapshot), signal, null);
    if (!result || (readCurrentValues && !deepEqual(snapshot, readCurrentValues()))) return undefined;
    return toEngineValidationError(result.ok ? {} : result.failure.fieldErrors);
  };
  tanstackOptions.validators = { onDynamicAsync: validateWithSchema };
  tanstackOptions.validationLogic = (props) =>
    revalidateLogic({
      mode:
        overlay.getState().submitCount > 0 || overlay.getState().touched.size > 0
          ? 'change'
          : (initialOptions.validateOn ?? 'submit'),
      modeAfterSubmission: 'change',
    })(props);

  return {
    getOptions,
    overlay,
    tanstackOptions,
    messageResolver,
    parseValues,
    bindValues: (read) => {
      readCurrentValues = read;
    },
  };
}

/** What `buildAppForm` returns — the contract surface plus the teardown the adapter's own timer needs. */
interface BuiltForm<TValues extends object> {
  readonly form: AppForm<TValues, TanstackFormEngine<TValues>>;
  /** Releases the pending `submitOn: 'change'` debounce timer on scope teardown. */
  readonly dispose: () => void;
}

/** Builds the stable contract surface over the TanStack engine + overlay pair. */
function buildAppForm<TValues extends object, TOutput>(
  engine: TanstackFormEngine<TValues>,
  prelude: AdapterPrelude<TValues, TOutput>,
): BuiltForm<TValues> {
  const { getOptions, overlay, tanstackOptions, messageResolver, parseValues } = prelude;
  let lifecycleEpoch = 0;
  let validationEpoch = 0;
  let focusEpoch = 0;
  let requestController = new AbortController();
  let disposed = false;
  let trailingSubmit = false;
  let submittingValues: TValues | null = null;
  const reader = createCombinedReader(bridgeStore(engine), overlay);
  const identity = createFormArrayIdentity(() => engine.store.state.values);

  // ── Submit path shared by `handleSubmit` + auto-submit (validate → onSubmit → map failure) ─────
  /** Resolves a thrown submit failure onto the overlay (matched paths → fields, remainder → banner). */
  function applySubmitFailure(error: AppError, submittedValues = engine.store.state.values): void {
    const options = getOptions();
    const values = engine.store.state.values;
    overlay.applySubmitFailure(
      resolveSubmitFailure(
        error,
        options.mapSubmitError ?? fieldIssues,
        options.mapFieldPath ?? defaultMapFieldPath,
        (path) => hasPath(submittedValues, path) && deepEqual(getPath(submittedValues, path), getPath(values, path)),
        options.fallbackErrorMessage,
        messageResolver(),
      ),
    );
  }

  async function performSubmit(values: TValues): Promise<boolean> {
    if (disposed || getOptions().isDisabled) return false;
    const epoch = lifecycleEpoch;
    const signal = requestController.signal;
    const isCurrent = (): boolean => !disposed && epoch === lifecycleEpoch;
    validationEpoch += 1;
    overlay.setScope(null);
    overlay.beginSubmitAttempt();
    // The facade owns submission snapshots; TanStack still owns field validation and metadata.
    // Its validator reuses this parse, so transforming/async schemas run once for this input.
    const parsing = parseValues(values, true);
    await engine.validate('submit');
    const parsed = await parsing;
    if (!isCurrent()) return false;
    if (!parsed.ok) {
      overlay.setSubmitSuccessful(false);
      return false;
    }
    overlay.setSubmitting(true);
    let successful = false;
    try {
      const result = await untilFormAbort(getOptions().onSubmit(parsed.value, { signal }), signal, {
        ok: false,
        failure: AppErrorFactory.cancelled(),
      });
      successful = result.ok;
      if (isCurrent() && result.ok) overlay.setBaseline(values);
      else if (isCurrent() && !result.ok) applySubmitFailure(result.failure, values);
    } catch (error) {
      if (isCurrent()) applySubmitFailure(toSubmitError(error, getOptions().fallbackErrorMessage), values);
    } finally {
      if (isCurrent()) overlay.setSubmitting(false);
      if (isCurrent()) overlay.setSubmitSuccessful(successful);
    }
    return successful && isCurrent();
  }

  /** Serializes submissions and coalesces newer edits into one trailing snapshot. */
  let inFlight: Promise<boolean> | null = null;
  async function guardedSubmit(): Promise<boolean> {
    if (disposed) return false;
    if (inFlight) {
      if (!deepEqual(engine.store.state.values, submittingValues)) trailingSubmit = true;
      return inFlight;
    }
    const run = async (): Promise<boolean> => {
      let successful = false;
      do {
        trailingSubmit = false;
        submittingValues = snapshotFormValues(engine.store.state.values);
        successful = await untilFormAbort(performSubmit(submittingValues), requestController.signal, false);
      } while (
        !disposed &&
        trailingSubmit &&
        !deepEqual(engine.store.state.values, submittingValues) &&
        !deepEqual(engine.store.state.values, overlay.getState().baseline)
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

  /** Validate without submitting — marks touched, runs the whole-form schema, resolves client validity. */
  async function validate(options?: AppFormValidationOptions<TValues>): Promise<boolean> {
    if (disposed) return false;
    const epoch = ++validationEpoch;
    const lifecycle = lifecycleEpoch;
    if (options) {
      for (const meta of Object.values(engine.state.validationMetaMap)) meta?.lastAbortController.abort();
      const values = snapshotFormValues(engine.store.state.values);
      for (const path of options.fields ?? Object.keys(values)) overlay.markBlurred(path);
      overlay.setScopeValidating(true);
      const errors = await untilFormAbort(
        validateFormScope(
          values,
          options,
          getOptions().schema,
          messageResolver(),
          getOptions().fallbackErrorMessage ?? 'Validation failed',
        ),
        requestController.signal,
        {},
      );
      if (disposed || epoch !== validationEpoch || lifecycle !== lifecycleEpoch) return false;
      overlay.setScopeValidating(false);
      if (!deepEqual(values, engine.store.state.values)) return false;
      const previous = overlay.getState();
      const retained = Object.fromEntries(
        Object.entries(previous.scopedErrors ?? {}).filter(([path]) => !includesValidationPath(path, options.fields)),
      );
      const fields =
        options.fields &&
        (previous.scopedErrors === null
          ? options.fields
          : previous.scopedFields && [...previous.scopedFields, ...options.fields]);
      overlay.setScope({ ...retained, ...errors }, fields);
      return Object.keys(errors).length === 0;
    }
    overlay.setScope(null);
    overlay.touchAll();
    const values = snapshotFormValues(engine.store.state.values);
    const parsing = parseValues(values, true);
    const result = await untilFormAbort(
      Promise.all([engine.validate('submit'), parsing]),
      requestController.signal,
      null,
    );
    return (
      !disposed &&
      lifecycle === lifecycleEpoch &&
      epoch === validationEpoch &&
      result !== null &&
      result[1].ok &&
      deepEqual(values, engine.store.state.values)
    );
  }

  // ── Auto-submit (`submitOn`) — routes through the SAME `guardedSubmit` as manual submit ────────
  let autoSubmitTimer: ReturnType<typeof setTimeout> | null = null;
  const clearAutoSubmitTimer = (): void => {
    if (autoSubmitTimer !== null) {
      clearTimeout(autoSubmitTimer);
      autoSubmitTimer = null;
    }
  };
  const scheduleAutoSubmit = (): void => {
    if ((getOptions().submitOn ?? 'manual') !== 'change') return;
    clearAutoSubmitTimer();
    const delay = getOptions().submitDebounceMs ?? 0;
    autoSubmitTimer = setTimeout(() => {
      autoSubmitTimer = null;
      void guardedSubmit();
    }, delay);
  };
  const autoSubmitOnBlur = (): void => {
    if ((getOptions().submitOn ?? 'manual') === 'blur') void guardedSubmit();
  };

  // One API object per path — memoized, so the identity a slot payload sees is stable.
  const fieldApis = new Map<string, AppFieldApi<unknown>>();
  const fieldOps = {
    getState: (path: string) => reader.getFieldState(path),
    setValue: (path: string, value: unknown) => {
      // Server messages clear on the next change to the field (contract JSDoc).
      overlay.clearServerErrorsAt(path);
      // Triggers TanStack 'change'-cause validation, gated by `revalidateLogic`.
      engine.setFieldValue(path as DeepKeys<TValues>, snapshotFormValues(value) as never);
      identity.replace(path);
      // `submitOn: 'change'` — a user-origin write schedules the debounced auto-submit.
      scheduleAutoSubmit();
    },
    blur: (path: string) => {
      overlay.markBlurred(path);
      // 'blur'-cause validation — runs the schema only in `validateOn: 'blur'` mode.
      void engine.validateField(path as DeepKeys<TValues>, 'blur');
      // `submitOn: 'blur'` — save-on-blur.
      autoSubmitOnBlur();
    },
  };
  const getFieldApi = (path: string): AppFieldApi<unknown> => {
    const existing = fieldApis.get(path);
    if (existing) return existing;
    const api = createFieldApi(path, fieldOps);
    fieldApis.set(path, api);
    return api;
  };

  const arrayOperation = (path: string, operation: Parameters<typeof overlay.remapForArrayOperation>[1]): void => {
    // TanStack's array ops are constrained to its typed array paths (`DeepKeysOfType`); the
    // contract's paths are loose strings, so the vendor's path algebra is opted out of with
    // `never` rather than reimplemented here.
    identity.operation(path, operation, () => {
      const field = path as never;
      switch (operation.kind) {
        case 'push':
          engine.pushFieldValue(field, snapshotFormValues(operation.value) as never);
          break;
        case 'insert':
          void engine.insertFieldValue(field, operation.index, snapshotFormValues(operation.value) as never);
          break;
        case 'remove':
          void engine.removeFieldValue(field, operation.index);
          break;
        case 'swap':
          engine.swapFieldValues(field, operation.indexA, operation.indexB);
          break;
        case 'move':
          engine.moveFieldValues(field, operation.fromIndex, operation.toIndex);
          break;
      }
      // Contract reindexing for the overlay: row-scoped server errors + touched marks
      // follow their rows. TanStack shifts its OWN field meta by its rules; where they
      // differ, the contract wins because errors/touched surface from the overlay and
      // client errors are recomputed by the op's change-revalidation.
      overlay.remapForArrayOperation(path, operation);
    });
    scheduleAutoSubmit();
  };

  function invalidateWork(): void {
    lifecycleEpoch += 1;
    validationEpoch += 1;
    focusEpoch += 1;
    requestController.abort();
    requestController = new AbortController();
    for (const meta of Object.values(engine.state.validationMetaMap)) meta?.lastAbortController.abort();
    engine.baseStore.setState((previous) => ({ ...previous, isFormValidating: false }));
    overlay.setSubmitting(false);
    overlay.setScopeValidating(false);
    trailingSubmit = false;
    clearAutoSubmitTimer();
  }

  const state = createFormStateView<TValues>(reader.getFormState);

  const form: AppForm<TValues, TanstackFormEngine<TValues>> = {
    Field: createFieldComponent<TValues>(getFieldApi, () => getOptions().isDisabled ?? false),
    state,
    // The same computed `state.values` reads — `form.values` is a shorthand, never a second source.
    get values() {
      return state.values;
    },
    useFormState: createUseFormState<TValues>(reader.getFormState),
    handleSubmit: async (event?: Event) => {
      const epoch = ++focusEpoch;
      return submitWithFocus(guardedSubmit, () => epoch === focusEpoch, event, getOptions().focusRoot?.());
    },
    validate,
    cancelSubmit: () => {
      invalidateWork();
      overlay.applySubmitFailure({ fieldErrors: {}, submitError: AppErrorFactory.cancelled() });
      overlay.setSubmitSuccessful(false);
    },
    invalidateSession: (next) => form.reset(next),
    setValue: (path, value) => {
      // Server messages clear on the next change to the field (contract JSDoc) — mirror the
      // in-field `setValue`; TanStack's 'change'-cause validation runs under `revalidateLogic`.
      overlay.clearServerErrorsAt(path);
      engine.setFieldValue(path as DeepKeys<TValues>, snapshotFormValues(value) as never);
      identity.replace(path);
      scheduleAutoSubmit();
    },
    array: (path: string) => ({
      get keys() {
        return identity.keys(path);
      },
      push: (value: unknown) => arrayOperation(path, { kind: 'push', value }),
      insert: (index: number, value: unknown) => arrayOperation(path, { kind: 'insert', index, value }),
      remove: (index: number) => arrayOperation(path, { kind: 'remove', index }),
      swap: (indexA: number, indexB: number) => arrayOperation(path, { kind: 'swap', indexA, indexB }),
      move: (fromIndex: number, toIndex: number) => arrayOperation(path, { kind: 'move', fromIndex, toIndex }),
    }),
    reset: (next?: TValues) => {
      invalidateWork();
      const values = snapshotFormValues(next ?? overlay.getState().baseline);
      // Keep the options object TanStack was created with in sync: its own `reset(values)`
      // rewrites `options.defaultValues`, and any later `update()` would otherwise clobber the
      // re-seeded values back from the stale copy.
      tanstackOptions.defaultValues = values;
      overlay.reset(snapshotFormValues(values));
      engine.reset(values);
      identity.reset();
      clearAutoSubmitTimer(); // a reset/prefill never auto-submits — drop any pending trailing submit
    },
    setFieldErrors: (errors: Record<string, ReadonlyArray<string>>) => overlay.replaceServerErrors(errors),
    clearSubmitError: () => overlay.clearSubmitError(),
    engine,
  };

  return {
    form,
    dispose: () => {
      invalidateWork();
      disposed = true;
    },
  };
}

/**
 * The tanstack adapter's `useAppForm` — the facade contract over `@tanstack/vue-form`.
 * The returned form object is stable for the owning scope's lifetime and every state member on
 * it is a live getter, so `form.values.title` / `form.state.isSubmitting` read in a template ARE
 * the subscription; `form.engine` exposes the native {@link TanstackFormEngine} (the 90/10
 * escape hatch — typed here, `unknown` on the shared contract), including TanStack's typed
 * deep-path `Field`/`Subscribe` and per-field validator graph.
 *
 * Call it in `setup()`: `useForm` registers an `onMounted` of its own, and the store bridge +
 * the pending `submitOn: 'change'` timer release on scope teardown.
 */
export function useAppForm<TValues extends object, TOutput = TValues>(
  options: AppFormOptionsSource<TValues, TOutput>,
): AppForm<TValues, TanstackFormEngine<TValues>> {
  const prelude = createAdapterPrelude<TValues, TOutput>(() => toValue(options));
  const engine = useForm(prelude.tanstackOptions) as TanstackFormEngine<TValues>;
  prelude.bindValues(() => engine.store.state.values);
  const built = buildAppForm<TValues, TOutput>(engine, prelude);

  // Validate once on mount when flagged — seeds `isValid` / field errors WITHOUT marking touched
  // (the mount pass shows validity without asserting the user interacted).
  onMounted(() => {
    if (toValue(options).validateOnMount) void engine.validate('submit');
  });
  onScopeDispose(built.dispose, true);

  return built.form;
}
