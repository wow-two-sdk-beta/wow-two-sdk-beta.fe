// @wow-two-beta/fe/forms-engine — the engine-free forms facade contract.
// One house surface (`useAppForm` options/result) implemented by swappable engine adapters;
// the seam is the import path: apps pin an engine once in `src/form.ts`
// (`export { useAppForm } from '@wow-two-beta/fe/forms-engine/house'`) and screens import
// from `@/form` — changing engines is editing that one line. This entry carries the contract
// types, the vendored Standard Schema v1 spec types (zero runtime dep — any zod/valibot/arktype
// schema plugs in), the engine-free `Field` glue + the reactive-surface factories, and the
// server-error pipeline defaults (`fieldErrors` ProblemDetails mapping + camelCase path rewrite).
// Behavior across engines is pinned by the conformance suite.
//
// Adapters: `/forms-engine/house` (zero deps) · `/forms-engine/tanstack` (default, optional
// `@tanstack/vue-form` peer). Neither peer is reachable from this entry.
//
// PORT NOTE — `Subscribe` IS NOT HERE. React's read path was a render prop
// (`<form.Subscribe selector={s => s.values.style}>`); in Vue, reading `form.values.style` IS the
// subscription, so the component and its `AppSubscribeProps` / `AppSubscribeComponent` types are
// gone, as is `createSubscribeComponent`. `form.useFormState(selector, isEqual)` keeps the one
// capability plain reactivity lacks — a slice with a custom equality — and returns a `Ref`.

// Facade contract (docs/analysis/forms-engine.md §4)
export type {
  AppFormOptions,
  AppFormSubmitContext,
  AppFormValidationOptions,
  AppFormOptionsSource,
  AppFieldApi,
  AppFormState,
  AppFieldValue,
  AppFieldPath,
  AppFieldProps,
  AppFieldComponent,
  AppArrayApi,
  AppForm,
  FormEngine,
} from './AppForm';

// Vendored Standard Schema v1 spec types (types-only, MIT — https://standardschema.dev)
export type { StandardSchemaV1 } from './StandardSchema';

// Server-error path rewrite default — exported so apps can wrap it (`mapFieldPath`)
export { defaultMapFieldPath } from './SubmitErrors';

// Dialog-hosted forms — a fresh session from the record being edited each time the dialog opens.
export { useFormDialogSession, type FormDialogSessionOptions } from './UseFormDialogSession';

// Submit-rejection a11y hop — focuses the first `aria-invalid` control after a failed submit.
// Engine-neutral (reads the FormControlContext-stamped aria, not engine state).
export { focusFirstInvalid } from './FocusFirstInvalid';

// Typed array-row helper — engine-free, composes the contract (`form.array` + `form.Field` +
// `form.useFormState`), so a row cell binds `f.value` typed one level deep (`TItem[name]`) with
// no per-row cast and no vendor deep-path types. The same instance drives both adapters.
export { useFieldArray } from './UseFieldArray';
export type {
  FieldArray,
  FieldArrayField,
  FieldArrayFieldProps,
  FieldArrayForm,
  FieldArrayGlueField,
  FieldArrayGlueFieldProps,
  FieldArrayRow,
  FieldArrayVariant,
} from './UseFieldArray';

// Adapter-author seams — building blocks the in-repo adapters share
export {
  createFieldComponent,
  createFieldApi,
  createFormStateView,
  createUseFormState,
  type FieldSlice,
  type FieldOps,
} from './FormGlue';
export {
  resolveSubmitFailure,
  toSubmitError,
  type SubmitFailureResolution,
  type SubmitErrorMap,
  type SubmitFieldEntry,
} from './SubmitErrors';
export {
  runStandardSchema,
  createOptionsMessageResolver,
  issuePathToString,
  resultToFieldErrors,
} from './SchemaValidation';
export { parsePath, formatPath, getPath, setPath, hasPath, type PathKey, type ArrayOperation } from './Paths';
