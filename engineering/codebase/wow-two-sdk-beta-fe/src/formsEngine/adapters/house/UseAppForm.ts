import { onScopeDispose, toValue } from 'vue';

import type { AppFieldApi, AppForm, AppFormOptionsSource } from '../../AppForm';
import { createFormArrayIdentity } from '../../FormArrayIdentity';
import { submitWithFocus } from '../../FormOperations';
import { createFieldApi, createFieldComponent, createFormStateView, createUseFormState } from '../../FormGlue';

import { createHouseFormEngine, type HouseFormEngine } from './HouseFormCore';

/**
 * The house adapter's `useAppForm` — the facade contract over the zero-dependency
 * micro-store. The returned form object is stable for the owning scope's lifetime and every
 * state member on it is a live getter, so `form.values.title` / `form.state.isSubmitting` read
 * in a template ARE the subscription; `form.engine` exposes the native {@link HouseFormEngine}
 * (the 90/10 escape hatch — typed here, `unknown` on the shared contract).
 *
 * Pass a getter / ref when an option must stay live (see `AppFormOptionsSource`); a plain object
 * is read once, which is what `defaultValues` + a closure `onSubmit` want.
 *
 * Call it in `setup()`: the pending `submitOn: 'change'` timer is released on scope teardown,
 * which is the whole of React's unmount effect here.
 */
export function useAppForm<TValues extends object, TOutput = TValues>(
  options: AppFormOptionsSource<TValues, TOutput>,
): AppForm<TValues, HouseFormEngine<TValues>> {
  const engine = createHouseFormEngine<TValues, TOutput>(() => toValue(options));
  onScopeDispose(engine.dispose, true);
  const identity = createFormArrayIdentity(() => engine.getFormState().values);
  const setValue = (path: string, value: unknown): void => {
    engine.setValue(path, value);
    identity.replace(path);
  };
  const reset = (next?: TValues): void => {
    engine.reset(next);
    identity.reset();
  };

  // One API object per path, so a slot payload keeps its identity across commits (React got this
  // from `useMemo` inside the per-field hook; here the map outlives every render).
  const fieldApis = new Map<string, AppFieldApi<unknown>>();
  const fieldOps = {
    getState: (path: string) => engine.getFieldState(path),
    setValue,
    blur: (path: string) => engine.blurField(path),
  };
  const getFieldApi = (path: string): AppFieldApi<unknown> => {
    const existing = fieldApis.get(path);
    if (existing) return existing;
    const api = createFieldApi(path, fieldOps);
    fieldApis.set(path, api);
    return api;
  };

  const state = createFormStateView<TValues>(engine.getFormState);

  let focusEpoch = 0;
  onScopeDispose(() => {
    focusEpoch += 1;
  }, true);
  return {
    Field: createFieldComponent<TValues>(getFieldApi, () => toValue(options).isDisabled ?? false),
    state,
    // The same computed `state.values` reads — `form.values` is a shorthand, never a second source.
    get values() {
      return state.values;
    },
    useFormState: createUseFormState<TValues>(engine.getFormState),
    handleSubmit: (event?: Event) => {
      const epoch = ++focusEpoch;
      return submitWithFocus(
        () => engine.submit(),
        () => epoch === focusEpoch,
        event,
        toValue(options).focusRoot?.(),
      );
    },
    validate: (scope) => engine.validate(scope),
    cancelSubmit: () => {
      focusEpoch += 1;
      engine.cancelSubmit();
    },
    invalidateSession: (next) => {
      focusEpoch += 1;
      reset(next);
    },
    setValue,
    array: (path: string) => ({
      get keys() {
        return identity.keys(path);
      },
      push: (value: unknown) =>
        identity.operation(path, { kind: 'push', value }, () =>
          engine.applyArrayOperation(path, { kind: 'push', value }),
        ),
      insert: (index: number, value: unknown) =>
        identity.operation(path, { kind: 'insert', index, value }, () =>
          engine.applyArrayOperation(path, { kind: 'insert', index, value }),
        ),
      remove: (index: number) =>
        identity.operation(path, { kind: 'remove', index }, () =>
          engine.applyArrayOperation(path, { kind: 'remove', index }),
        ),
      swap: (indexA: number, indexB: number) =>
        identity.operation(path, { kind: 'swap', indexA, indexB }, () =>
          engine.applyArrayOperation(path, { kind: 'swap', indexA, indexB }),
        ),
      move: (fromIndex: number, toIndex: number) =>
        identity.operation(path, { kind: 'move', fromIndex, toIndex }, () =>
          engine.applyArrayOperation(path, { kind: 'move', fromIndex, toIndex }),
        ),
    }),
    reset: (next?: TValues) => {
      focusEpoch += 1;
      reset(next);
    },
    setFieldErrors: (errors: Record<string, ReadonlyArray<string>>) => engine.setFieldErrors(errors),
    clearSubmitError: () => engine.clearSubmitError(),
    engine,
  };
}
