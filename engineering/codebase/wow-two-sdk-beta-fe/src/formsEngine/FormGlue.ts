import { computed, defineComponent, h, type Ref } from 'vue';

// The one primitive this entry needs, imported from its own folder rather than the `primitives`
// barrel: the barrel makes every other primitive's dependency (`@floating-ui/vue`) REACHABLE from
// the zero-peer `/forms-engine` entry, and a promise that rests on a bundler's tree-shaking is a
// weaker promise than one the import graph makes on its own.
import { FormControlProvider } from '../foundation/primitives/formControlContext';

import type { AppFieldApi, AppFieldComponent, AppFormState } from './AppForm';

/*
 * Engine-free `Field` glue — adapters feed their per-field accessor in, apps get an identical
 * component back regardless of engine. `Field` always mounts a `FormControlProvider`
 * (foundation) with `isInvalid`, the merged `errors`, and the per-mode flags, so every SDK
 * control that reads `useFormControl()` auto-wires aria unmodified — and the presentation
 * `Field` / `FormErrorMessage` composed inside the slot ADOPT this provider (no second
 * provider, no `:error="f.errors[0]"` hand-wiring): label/helper/error chrome renders straight
 * from the context. Boundaries: this module never imports presentation — the chrome side of the
 * seam is the foundation `FormControlContext` alone.
 *
 * Whole-form subscription runs through `form.state` / `form.values` (see `AppForm.ts`); `Field`
 * stays a component because `provide()` requires one. This module also carries the three
 * live-getter factories BOTH adapters build their reactive surface from, engine-free: a getter
 * reads the engine's `shallowRef` and whoever reads the getter is subscribed.
 *
 * Authored as `defineComponent` + `h` in plain `.ts`, not an SFC: the glue renders no markup of
 * its own, and runtime props sidestep the SFC type resolver entirely.
 */

/** The per-field read slice an engine hands back — both adapters' internal field states satisfy it. */
export interface FieldSlice {
  readonly value: unknown;
  readonly errors: ReadonlyArray<string>;
  readonly isDirty: boolean;
  readonly isTouched: boolean;
}

/** The per-field write seam an engine hands in. */
export interface FieldOps {
  readonly getState: (path: string) => FieldSlice;
  readonly setValue: (path: string, value: unknown) => void;
  readonly blur: (path: string) => void;
}

/**
 * Builds one path's field API — every member a live getter, so a read inside a template /
 * `computed` subscribes to exactly that field. `value` is writable, which is what makes
 * `v-model="field.value"` bind a control with no handler.
 *
 * EVERY READ GOES THROUGH ONE `computed`, and that is what makes the subscription per-FIELD rather
 * than per-form. An engine commits by replacing one state object, so a raw getter would wake every
 * reader in the form on any commit — the "form-wide re-render" the contract exists to avoid. A
 * `computed` only notifies when its value changes, and `ops.getState` hands back the SAME slice
 * object while nothing about the field moved (both engines cache per-path identity), so a control
 * re-renders on its own edits and sits still through everyone else's.
 *
 * Adapters memoize this per path: the object identity is then stable across commits, so a slot
 * payload does not churn.
 */
export function createFieldApi(path: string, ops: FieldOps): AppFieldApi<unknown> {
  const slice = computed(() => ops.getState(path));
  return {
    get value() {
      return slice.value.value;
    },
    set value(next: unknown) {
      ops.setValue(path, next);
    },
    setValue: (value: unknown) => ops.setValue(path, value),
    onBlur: () => ops.blur(path),
    get errors() {
      return slice.value.errors;
    },
    get isDirty() {
      return slice.value.isDirty;
    },
    get isTouched() {
      return slice.value.isTouched;
    },
  };
}

/**
 * Builds the `form.state` view — live getters, each backed by its OWN `computed`, so a reader of
 * `state.isSubmitting` wakes when that flag flips and stays asleep through every unrelated commit.
 * `values` is one computed too: it re-emits when the values object is replaced (any field write),
 * which is the granularity a whole-values read can have — narrow further with a `computed` of your
 * own, or with `form.useFormState`.
 */
export function createFormStateView<TValues extends object>(
  getFormState: () => AppFormState<TValues>,
): AppFormState<TValues> {
  const values = computed(() => getFormState().values);
  const isDirty = computed(() => getFormState().isDirty);
  const isValid = computed(() => getFormState().isValid);
  const isSubmitting = computed(() => getFormState().isSubmitting);
  const isValidating = computed(() => getFormState().isValidating);
  const submitError = computed(() => getFormState().submitError);
  const isSubmitSuccessful = computed(() => getFormState().isSubmitSuccessful);
  return {
    get values() {
      return values.value;
    },
    get isDirty() {
      return isDirty.value;
    },
    get isValid() {
      return isValid.value;
    },
    get isSubmitting() {
      return isSubmitting.value;
    },
    get isValidating() {
      return isValidating.value;
    },
    get submitError() {
      return submitError.value;
    },
    get isSubmitSuccessful() {
      return isSubmitSuccessful.value;
    },
  };
}

/**
 * Builds `form.useFormState` — a selected slice as a `Ref`. Without `isEqual` it is a plain
 * `computed`. With one, the previous slice is HELD when the comparison says nothing changed:
 * `computed` only ever compares with `Object.is`, so a composite selector (`() => ({a, b})`)
 * would otherwise hand every downstream effect a fresh object on every store commit.
 */
export function createUseFormState<TValues extends object>(getFormState: () => AppFormState<TValues>) {
  return <TSlice>(
    selector: (state: AppFormState<TValues>) => TSlice,
    isEqual?: (a: TSlice, b: TSlice) => boolean,
  ): Readonly<Ref<TSlice>> => {
    if (!isEqual) return computed(() => selector(getFormState()));
    let cached: { slice: TSlice } | null = null;
    return computed(() => {
      const slice = selector(getFormState());
      if (cached && isEqual(cached.slice, slice)) return cached.slice;
      cached = { slice };
      return slice;
    });
  };
}

/**
 * Builds the `form.Field` component from an adapter's per-field accessor.
 * `getFieldApi(path)` returns a live-getter API object for that path — the adapter memoizes it
 * per path, so a slot payload keeps its identity across commits. `isFormDisabled` (optional)
 * reads the whole-form `isDisabled` option per render and ORs it into every field's
 * control-disabled flag — the lowest-leverage read-only / role-locked path.
 */
export function createFieldComponent<TValues extends object>(
  getFieldApi: (path: string) => AppFieldApi<unknown>,
  isFormDisabled?: () => boolean,
): AppFieldComponent<TValues> {
  const AppField = defineComponent({
    name: 'AppField',
    props: {
      name: { type: String, required: true },
      // `default: undefined` on every optional boolean — Vue casts an undefaulted `Boolean` prop
      // to `false`, which would forward "explicitly enabled" where the field meant "unset" and
      // shadow the form-level flag below.
      isDisabled: { type: Boolean, default: undefined },
      isRequired: { type: Boolean, default: undefined },
      isReadOnly: { type: Boolean, default: undefined },
    },
    setup(props, { slots }) {
      // Recomputed only when the bound path changes; the API's own getters carry the reactivity.
      const field = computed(() => getFieldApi(props.name));
      return () =>
        h(
          FormControlProvider,
          {
            isInvalid: field.value.errors.length > 0,
            errors: field.value.errors,
            isDisabled: props.isDisabled || (isFormDisabled?.() ?? false),
            isRequired: props.isRequired,
            isReadOnly: props.isReadOnly,
          },
          { default: () => slots.default?.(field.value) },
        );
    },
  });

  // `defineComponent`'s inferred type is the runtime-props one; the contract's constructor shape
  // is what gives a consumer `TPath`-narrowed slot payloads.
  return AppField as unknown as AppFieldComponent<TValues>;
}
