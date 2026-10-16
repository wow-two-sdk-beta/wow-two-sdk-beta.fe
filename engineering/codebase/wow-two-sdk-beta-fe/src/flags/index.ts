// @wow-two-beta/ui-vue/flags — headless feature-flag evaluation, OpenFeature-SHAPED but dependency-free
// (the vocabulary is mirrored structurally, exactly as `forms-engine/StandardSchema.ts` vendors the
// Standard Schema spec — see FlagTypes.ts for the three deliberate divergences).
//
// `createFlagClient({ provider })` evaluates boolean / string / number / JSON-object flags against a
// `FlagProvider` — the one seam a backend adapter implements. Every evaluation is TOTAL: it returns
// the type asked for and never throws, falling back to the caller's `defaultValue` on a miss
// ('default'), an off switch ('disabled'), a wrong wire type ('error' + 'type-mismatch') or a
// throwing provider ('error' + 'provider-error'); `onError` is the only channel that surfaces a
// fault. `staticFlagProvider(flags)` ships in the box as the test double and local-dev default, with
// rule-based variants so targeting is exercised without a flag service. `FlagsProvider` + `useFlag`
// mirror the provide/inject seam of `foundation/primitives`' `DirectionProvider`, standalone
// fallback included — a flag read works with no provider mounted. This subpath carries NO peer
// dependency (plain Vue) and NO UI: gates, banners, and admin panels stay app-side.
//
// Naming, once: `FlagProvider` (singular) = the backend adapter · `FlagsProvider` (plural) = the
// Vue component. Same split as the spec.
//
// PORT NOTE: `useFlag` returns a `ComputedRef<TValue>` where React returned a bare `TValue`, and
// accepts its `key` / `defaultValue` as `MaybeRefOrGetter` — a bare value could never re-evaluate,
// and the reactive params are what let a flag read follow a changing key. `useFlags()` still returns
// the plain `FlagClient`. Everything below the seam is framework-free and byte-identical to React.

// Vocabulary — value types, evaluation result, targeting context
export {
  FlagReason,
  FlagErrorCode,
  type JsonPrimitive,
  type JsonValue,
  type JsonObject,
  type FlagValue,
  type FlagScalar,
  type FlagScalarValue,
  type FlagObjectDecoder,
  type ContextAttribute,
  type EvaluationContext,
  type FlagEvaluation,
  type FlagErrorInfo,
} from './FlagTypes';

// Backend seam — what a flag source implements
export type { FlagProvider, FlagResolution } from './FlagProvider';

// Built-in provider — test double + local-dev default, with rule-based targeting
export {
  staticFlagProvider,
  type StaticFlags,
  type StaticFlagEntry,
  type StaticFlagDefinition,
  type StaticFlagRule,
  type StaticFlagCondition,
} from './StaticFlagProvider';

// Evaluator — the app-facing client
export {
  createFlagClient,
  type FlagClient,
  type CreateFlagClientOptions,
  type FlagErrorListener,
  type FlagContextListener,
} from './FlagClient';

// Vue seam — provider component + composables
export { default as FlagsProvider, type FlagsProviderProps } from './providers/FlagsProvider.vue';
export { useFlag, useFlags, useObjectFlag } from './providers/FlagsContext';
