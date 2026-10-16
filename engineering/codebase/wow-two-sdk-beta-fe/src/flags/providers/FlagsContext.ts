import {
  computed,
  inject,
  provide,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

import { createFlagClient, type FlagClient } from '../FlagClient';
import type { FlagScalar, FlagScalarValue, FlagObjectDecoder, JsonObject, EvaluationContext } from '../FlagTypes';

/*
 * The Vue seam over `FlagClient` — the provide/inject + composable pattern used by
 * `foundation/primitives`' `DirectionProvider`, including its standalone fallback: `useFlag` works
 * with no provider mounted (every flag returns the caller's default), so an SDK component may read
 * a flag without forcing every consuming app to wire one.
 *
 * NOTE ON NAMING: `FlagsProvider` (plural) is the Vue component in `FlagsProvider.vue`;
 * `FlagProvider` (singular, `FlagProvider.ts`) is the backend adapter it evaluates against. Same
 * split as OpenFeature.
 *
 * RE-EVALUATION ON CONTEXT CHANGE. The client is created once and never re-created — swapping it
 * mid-life would drop its subscribers — so a context change cannot propagate by client identity.
 * Instead the provider subscribes to the client and bumps a `revision` ref; every `useFlag` computed
 * reads that ref, so a context change invalidates all of them at once. Evaluation is a synchronous
 * map lookup, so the computed re-evaluates on read with no extra bookkeeping, and never goes stale.
 *
 * NARROWING. The revision is a ref read inside each `useFlag` computed rather than a value carried
 * by the context, so only the flags actually read are re-evaluated, and only the components that
 * depend on a CHANGED flag re-render — Vue's dependency graph does the narrowing.
 */

/** The active client plus the counter that re-evaluates consumers when the evaluation context moves. */
interface FlagsContextValue {
  /** The client in force. A computed, so a swapped `client` prop still reaches every consumer. */
  readonly client: ComputedRef<FlagClient>;

  /** Bumped on every context change — what invalidates each `useFlag` computed. */
  readonly revision: Ref<number>;
}

/**
 * The injection key for the flags context; the standalone fallback is resolved at the injection
 * site. Deliberately NOT re-exported from `index.ts` — the context stays module-private.
 */
const FlagsKey: InjectionKey<FlagsContextValue> = Symbol('wow-two.flags');

/**
 * Backs the composables when no `FlagsProvider` is mounted — an empty static provider, so every flag
 * returns the caller's default. Each injection fallback gets its own client, isolating app-root context.
 */
function standaloneContext(): FlagsContextValue {
  const client = createFlagClient();
  return { client: computed(() => client), revision: ref(0) };
}

/**
 * The provider half — used by `FlagsProvider`, and by any component that owns a flag client.
 * Subscribes to the client and re-subscribes if the active client is swapped, disposing the previous
 * subscription through the watcher's `onCleanup`.
 *
 * Pass `client` as a getter (`() => props.client ?? ownClient`) so the active client stays tracked.
 */
export function provideFlags(client: MaybeRefOrGetter<FlagClient>): void {
  const active = computed(() => toValue(client));
  const revision = ref(0);

  // A watcher owns the subscription and bumps `revision`. `immediate` is safe under SSR —
  // `subscribe` only adds to a Set and touches no browser global.
  watch(
    active,
    (current, _previous, onCleanup) => {
      onCleanup(current.subscribe(() => (revision.value += 1)));
    },
    { immediate: true },
  );

  provide(FlagsKey, { client: active, revision });
}

/** Resolves the surrounding flags context, or the standalone fallback when no provider is mounted. */
function resolveFlags(): FlagsContextValue {
  return inject(FlagsKey, standaloneContext, true);
}

/**
 * Reads the flag client. Works without a {@link FlagsProvider} — falls back to an empty one, where
 * every flag returns the caller's default.
 *
 * Returns a stable facade whose commands reach the current provider client. Use it for imperative reads
 * and `setContext`; for a value that
 * must re-evaluate when the evaluation context moves, use {@link useFlag}, whose computed is the
 * reactive path.
 */
export function useFlags(): FlagClient {
  const { client } = resolveFlags();
  return {
    get provider() {
      return client.value.provider;
    },
    getBoolean: (...args) => client.value.getBoolean(...args),
    getString: (...args) => client.value.getString(...args),
    getNumber: (...args) => client.value.getNumber(...args),
    getObject<TValue extends JsonObject>(
      key: string,
      fallback: TValue,
      decode: FlagObjectDecoder<TValue>,
      context?: EvaluationContext,
    ): TValue {
      return client.value.getObject(key, fallback, decode, context);
    },
    evaluateBoolean: (...args) => client.value.evaluateBoolean(...args),
    evaluateString: (...args) => client.value.evaluateString(...args),
    evaluateNumber: (...args) => client.value.evaluateNumber(...args),
    evaluateObject<TValue extends JsonObject>(
      key: string,
      fallback: TValue,
      decode: FlagObjectDecoder<TValue>,
      context?: EvaluationContext,
    ) {
      return client.value.evaluateObject(key, fallback, decode, context);
    },
    getValue<TValue extends FlagScalar>(
      key: string,
      fallback: TValue,
      context?: EvaluationContext,
    ): FlagScalarValue<TValue> {
      return client.value.getValue(key, fallback, context);
    },
    evaluate<TValue extends FlagScalar>(key: string, fallback: TValue, context?: EvaluationContext) {
      return client.value.evaluate(key, fallback, context);
    },
    getContext: () => client.value.getContext(),
    setContext: (context) => client.value.setContext(context),
    subscribe: (listener) =>
      watch(
        client,
        (current, _previous, cleanup) => {
          cleanup(current.subscribe(listener));
        },
        { immediate: true, flush: 'sync' },
      ),
  };
}

/**
 * Reads one flag's value, re-evaluating whenever the evaluation context changes. The typed path is
 * picked from `defaultValue`, which also types the result — `useFlag('newNav', false)` is
 * `ComputedRef<boolean>`. Object flags use useObjectFlag with an explicit decoder.
 *
 * Returns a `ComputedRef<TValue>` rather than a bare value, because a bare value could never
 * re-evaluate. `key` and `defaultValue` may each be a ref or getter — changing either re-evaluates
 * the flag.
 */
export function useFlag<TValue extends FlagScalar>(
  key: MaybeRefOrGetter<string>,
  defaultValue: MaybeRefOrGetter<TValue>,
): ComputedRef<FlagScalarValue<TValue>> {
  const { client, revision } = resolveFlags();
  return computed<FlagScalarValue<TValue>>(() => {
    // `revision` is the dependency that re-evaluates this flag when the evaluation context moves.
    // Read through `void` rather than discarded into a binding — the read IS the subscription.
    void revision.value;
    return client.value.getValue(toValue(key), toValue(defaultValue));
  });
}

/** Reads a decoded object flag reactively, falling back when its wire shape is invalid. */
export function useObjectFlag<TValue extends JsonObject>(
  key: MaybeRefOrGetter<string>,
  defaultValue: MaybeRefOrGetter<TValue>,
  decode: FlagObjectDecoder<TValue>,
): ComputedRef<TValue> {
  const { client, revision } = resolveFlags();
  return computed(() => {
    void revision.value;
    return client.value.getObject(toValue(key), toValue(defaultValue), decode);
  });
}
