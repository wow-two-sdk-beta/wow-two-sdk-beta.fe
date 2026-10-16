import { shallowRef, type ShallowRef } from 'vue';

import type { AppError } from '../../../foundation/results';

import { remapPathMap, remapPathSet, type ArrayOperation } from '../../Paths';
import type { SubmitFailureResolution } from '../../SubmitErrors';

/*
 * The adapter-owned overlay store — the contract state TanStack Form does not model
 * (docs/analysis/forms-engine.md §4/§5). TanStack has no client/server error merge, its
 * touched marks on change (contract: blur OR submit attempt), its dirty is sticky
 * per-field (contract: deep-compared against a resettable baseline), and its array
 * reindexing of field meta differs from the contract's remap rules. All four live here,
 * outside TanStack state, exactly like the house engine keeps them:
 *   - `serverErrors` — the server-error overlay, cleared per-path on the next change,
 *     replaced wholesale by `setFieldErrors`, remapped through array ops.
 *   - `baseline` — the dirty baseline `reset(next)` re-seeds.
 *   - `touched` — blur marks; `submitCount > 0` touches everything.
 *   - `isSubmitting` / `submitError` — the contract submit pipeline flags: `isSubmitting`
 *     wraps only the app's `onSubmit` call (not TanStack's validation window), and
 *     `submitError` holds the failure remainder no field could represent.
 *
 * The overlay is one immutable object in a `shallowRef`, so a read of `state.value` is the
 * subscription. TanStack's own store stays a `@tanstack/store` `Store` — the adapter bridges it
 * separately.
 */

type ErrorMap = Readonly<Record<string, ReadonlyArray<string>>>;

const EmptyMap: ErrorMap = Object.freeze(Object.create(null) as Record<string, ReadonlyArray<string>>);

/** The adapter-owned slice merged with TanStack state into the contract's form/field state. */
export interface TanstackOverlayState<TValues extends object> {
  /** The dirty baseline — `reset(next)` re-seeds it. */
  readonly baseline: TValues;
  readonly scopedErrors: ErrorMap | null;
  readonly scopedFields: ReadonlyArray<string> | undefined;
  readonly isScopeValidating: boolean;
  /** The server-error overlay, keyed by form path (`rules[0].destination`). */
  readonly serverErrors: ErrorMap;
  readonly touched: ReadonlySet<string>;
  readonly submitCount: number;
  readonly isSubmitting: boolean;
  readonly submitError: AppError | null;
  /** The last completed submit's verdict — `null` until the first attempt completes and after `reset()`. */
  readonly isSubmitSuccessful: boolean | null;
}

/** The overlay store the tanstack adapter combines with the TanStack form store. */
export interface TanstackFormOverlay<TValues extends object> {
  /** The reactive seam; reading `state.value` subscribes. */
  readonly state: Readonly<ShallowRef<TanstackOverlayState<TValues>>>;
  readonly getState: () => TanstackOverlayState<TValues>;
  /** Marks a field touched (wired onto the control's blur). */
  readonly markBlurred: (path: string) => void;
  /** Server messages clear on the next change to the field (contract JSDoc). */
  readonly clearServerErrorsAt: (path: string) => void;
  /** Row-scoped server errors + touched marks follow their rows through array ops. */
  readonly remapForArrayOperation: (arrayPath: string, operation: ArrayOperation) => void;
  /** A new attempt clears prior server errors, re-arms the verdict, and counts as touching every field. */
  readonly beginSubmitAttempt: () => void;
  /** Marks every field touched without clearing errors or the verdict — `validate()`'s display gate. */
  readonly touchAll: () => void;
  /** Brackets the app's `onSubmit` call — the contract's `isSubmitting` window. */
  readonly setSubmitting: (isSubmitting: boolean) => void;
  /** Settles the last completed submit's verdict (`handleSubmit` mirrors it into `isSubmitSuccessful`). */
  readonly setSubmitSuccessful: (value: boolean | null) => void;
  /** Lands a resolved submit failure: matches as the server overlay, remainder as `submitError`. */
  readonly applySubmitFailure: (resolution: SubmitFailureResolution) => void;
  /** Replaces the server-error overlay (`setFieldErrors`). */
  readonly replaceServerErrors: (errors: Record<string, ReadonlyArray<string>>) => void;
  /** Clears the form-level `submitError` without touching field errors (`clearSubmitError`). */
  readonly clearSubmitError: () => void;
  /** Clears everything and re-seeds the dirty baseline. */
  readonly reset: (baseline: TValues) => void;
  /** Advances the saved baseline without replacing newer editing values. */
  readonly setScope: (errors: ErrorMap | null, fields?: ReadonlyArray<string>) => void;
  readonly setScopeValidating: (value: boolean) => void;
  readonly setBaseline: (baseline: TValues) => void;
}

function normalizeErrorMap(errors: Record<string, ReadonlyArray<string>>): ErrorMap {
  const normalized: Record<string, ReadonlyArray<string>> = Object.create(null);
  for (const [path, messages] of Object.entries(errors)) normalized[path] = [...messages];
  return normalized;
}

/** Creates the adapter-owned overlay store seeded with the initial dirty baseline. */
export function createTanstackFormOverlay<TValues extends object>(
  initialBaseline: TValues,
): TanstackFormOverlay<TValues> {
  const store = shallowRef<TanstackOverlayState<TValues>>({
    baseline: initialBaseline,
    scopedErrors: null,
    scopedFields: undefined,
    isScopeValidating: false,
    serverErrors: EmptyMap,
    touched: new Set<string>(),
    submitCount: 0,
    isSubmitting: false,
    submitError: null,
    isSubmitSuccessful: null,
  });

  function commit(next: TanstackOverlayState<TValues>): void {
    store.value = next;
  }

  function patch(partial: Partial<TanstackOverlayState<TValues>>): void {
    commit({ ...store.value, ...partial });
  }

  return {
    state: store,
    getState: () => store.value,
    markBlurred: (path) => {
      if (store.value.touched.has(path)) return;
      const touched = new Set(store.value.touched);
      touched.add(path);
      patch({ touched });
    },
    clearServerErrorsAt: (path) => {
      if (!Object.prototype.hasOwnProperty.call(store.value.serverErrors, path)) return;
      patch({
        serverErrors: Object.fromEntries(Object.entries(store.value.serverErrors).filter(([key]) => key !== path)),
      });
    },
    remapForArrayOperation: (arrayPath, operation) => {
      patch({
        serverErrors: remapPathMap(store.value.serverErrors, arrayPath, operation),
        touched: remapPathSet(store.value.touched, arrayPath, operation),
      });
    },
    beginSubmitAttempt: () => {
      patch({
        submitCount: store.value.submitCount + 1,
        serverErrors: EmptyMap,
        submitError: null,
        isSubmitSuccessful: null,
      });
    },
    touchAll: () => {
      if (store.value.submitCount === 0) patch({ submitCount: 1 });
    },
    setSubmitting: (isSubmitting) => {
      if (store.value.isSubmitting !== isSubmitting) patch({ isSubmitting });
    },
    setSubmitSuccessful: (value) => {
      if (store.value.isSubmitSuccessful !== value) patch({ isSubmitSuccessful: value });
    },
    applySubmitFailure: (resolution) => {
      patch({
        serverErrors: normalizeErrorMap(resolution.fieldErrors),
        submitError: resolution.submitError,
      });
    },
    replaceServerErrors: (errors) => {
      patch({ serverErrors: normalizeErrorMap(errors) });
    },
    clearSubmitError: () => {
      if (store.value.submitError !== null) patch({ submitError: null });
    },
    setScope: (scopedErrors, scopedFields) => patch({ scopedErrors, scopedFields }),
    setScopeValidating: (isScopeValidating) => patch({ isScopeValidating }),
    setBaseline: (baseline) => patch({ baseline }),
    reset: (baseline) => {
      commit({
        baseline,
        scopedErrors: null,
        scopedFields: undefined,
        isScopeValidating: false,
        serverErrors: EmptyMap,
        touched: new Set<string>(),
        submitCount: 0,
        isSubmitting: false,
        submitError: null,
        isSubmitSuccessful: null,
      });
    },
  };
}
