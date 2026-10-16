import type { FlagProvider, FlagResolution } from './FlagProvider';
import { staticFlagProvider } from './StaticFlagProvider';
import {
  FlagErrorCode,
  FlagReason,
  type ContextAttribute,
  type EvaluationContext,
  type FlagErrorInfo,
  type FlagEvaluation,
  type FlagValue,
  type FlagScalar,
  type FlagScalarValue,
  type FlagObjectDecoder,
  type JsonObject,
} from './FlagTypes';

/*
 * The evaluator. One rule governs the whole file: EVERY EVALUATION IS TOTAL — it returns a value of
 * the type asked for and never throws, whatever the provider does. A flag read sits inside render
 * paths and hot code; a throwing flag read would take a screen down over a config typo, which is the
 * opposite of what a kill-switch is for. So every failure mode lands on the caller's `defaultValue`:
 *
 *   not configured        → reason 'default'   (no errorCode, NOT reported — normal during rollout)
 *   flag switched off     → reason 'disabled'  (no errorCode, not reported)
 *   wrong runtime type    → reason 'error'     errorCode 'type-mismatch'   → onError
 *   provider threw/failed → reason 'error'     errorCode 'provider-error'  → onError
 *
 * `onError` is therefore the ONLY channel that surfaces a fault — wire it to the feedback bus or a
 * logger. It is called outside a try/catch on purpose (as the feedback bus calls its listeners): a
 * throwing app callback is an app bug and must not be swallowed here.
 *
 * The runtime type check is not belt-and-braces over TypeScript — the provider's typed `resolve*`
 * signatures describe an untyped wire payload, so the check is the only thing that actually holds.
 * `number` additionally rejects `NaN` / `Infinity`: neither survives a JSON round-trip intact, so
 * either one means the payload is broken, not that the flag is set to a strange number.
 */

/** Defines the listener handed each evaluation fault — the reporting channel, evaluation has already fallen back. */
export type FlagErrorListener = (error: FlagErrorInfo) => void;

/** Defines the listener notified after the evaluation context changes — how the Vue seam knows to re-evaluate. */
export type FlagContextListener = (context: EvaluationContext) => void;

/** Defines the options for {@link createFlagClient}. */
export interface CreateFlagClientOptions {
  /** The flag source. Defaults to an empty {@link staticFlagProvider} — every flag returns the caller's default. */
  readonly provider?: FlagProvider;

  /** The initial evaluation context (targeting subject + attributes). */
  readonly context?: EvaluationContext;

  /** Receives every evaluation fault. A miss or a disabled flag is not a fault and never arrives here. */
  readonly onError?: FlagErrorListener;
}

/**
 * Defines the app-facing evaluation API. `get*` returns just the value — the everyday call; `evaluate*`
 * returns the full {@link FlagEvaluation} when the reason or variant matters (exposure logging,
 * debugging a rollout). Both are total: on any miss or fault the caller's `defaultValue` comes back.
 *
 * Each call takes an optional context that is merged over the client-wide one for that call only.
 */
export interface FlagClient {
  /** The flag source behind this client. */
  readonly provider: FlagProvider;

  /** Evaluates a boolean flag, returning its value. */
  getBoolean(key: string, defaultValue: boolean, context?: EvaluationContext): boolean;

  /** Evaluates a string flag, returning its value. */
  getString(key: string, defaultValue: string, context?: EvaluationContext): string;

  /** Evaluates a number flag, returning its value. */
  getNumber(key: string, defaultValue: number, context?: EvaluationContext): number;

  /** Evaluates an object flag through an explicit shape decoder; malformed values fall back. */
  getObject<TValue extends JsonObject>(
    key: string,
    defaultValue: TValue,
    decode: FlagObjectDecoder<TValue>,
    context?: EvaluationContext,
  ): TValue;

  /** Evaluates a boolean flag, returning the full outcome. */
  evaluateBoolean(key: string, defaultValue: boolean, context?: EvaluationContext): FlagEvaluation<boolean>;

  /** Evaluates a string flag, returning the full outcome. */
  evaluateString(key: string, defaultValue: string, context?: EvaluationContext): FlagEvaluation<string>;

  /** Evaluates a number flag, returning the full outcome. */
  evaluateNumber(key: string, defaultValue: number, context?: EvaluationContext): FlagEvaluation<number>;

  /** Evaluates a JSON object flag, returning the full outcome. */
  evaluateObject<TValue extends JsonObject>(
    key: string,
    defaultValue: TValue,
    decode: FlagObjectDecoder<TValue>,
    context?: EvaluationContext,
  ): FlagEvaluation<TValue>;

  /** Evaluates any flag, picking the typed path from `defaultValue`'s runtime type. `useFlag` builds on it. */
  getValue<TValue extends FlagScalar>(
    key: string,
    defaultValue: TValue,
    context?: EvaluationContext,
  ): FlagScalarValue<TValue>;

  /** Evaluates any flag, picking the typed path from the runtime type of `defaultValue`, returning the full outcome. */
  evaluate<TValue extends FlagScalar>(
    key: string,
    defaultValue: TValue,
    context?: EvaluationContext,
  ): FlagEvaluation<FlagScalarValue<TValue>>;

  /** Reads the current client-wide evaluation context. */
  getContext(): EvaluationContext;

  /**
   * Merges attributes into the client-wide evaluation context — an attribute set to `undefined` is
   * removed. A merge that changes nothing is a no-op: no listener runs and the provider is not
   * re-notified, so a context literal rebuilt on every parent render costs nothing (a remote adapter
   * would otherwise refetch, and every flag consumer re-evaluate, once per parent render).
   */
  setContext(context: EvaluationContext): void;

  /** Subscribes to context changes; returns an unsubscribe. */
  subscribe(listener: FlagContextListener): () => void;
}

/** Widening preserves scalar kind while discarding only literal-level assertions. */
function widenScalar<T extends FlagScalar>(value: T): FlagScalarValue<T>;
function widenScalar(value: FlagScalar): FlagScalar {
  return value;
}

/** Reports whether two attribute values are equal — element-wise for lists, so a re-created array is not a change. */
function attributesEqual(left: ContextAttribute | undefined, right: ContextAttribute | undefined): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    const rightEntries = right as ReadonlyArray<unknown>;
    const leftEntries = left as ReadonlyArray<unknown>;
    return (
      leftEntries.length === rightEntries.length && leftEntries.every((entry, index) => entry === rightEntries[index])
    );
  }
  return left === right;
}

/** Reports whether two evaluation contexts hold the same attributes. */
function contextsEqual(left: EvaluationContext, right: EvaluationContext): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => Object.hasOwn(right, key) && attributesEqual(left[key], right[key]))
  );
}

/** Merges a patch over a context, dropping every attribute explicitly set to `undefined`. */
function mergeContext(base: EvaluationContext, patch: EvaluationContext): EvaluationContext {
  const merged: Record<string, ContextAttribute | undefined> = { ...base, ...patch };
  for (const key of Object.keys(merged)) {
    if (merged[key] === undefined) delete merged[key];
  }
  for (const key of Object.keys(merged)) {
    const value = merged[key];
    if (Array.isArray(value)) merged[key] = Object.freeze([...value]);
  }
  return Object.freeze(merged);
}

/**
 * Creates a flag client over a {@link FlagProvider} — one per app, module scope, shared by the Vue
 * seam ({@link FlagsProvider}) and any non-Vue caller (route guards, api-client wiring, sagas).
 *
 * ```ts
 * export const flags = createFlagClient({
 *   provider: staticFlagProvider({ newNav: { value: false, rules: [{ when: { plan: 'pro' }, value: true }] } }),
 *   onError: (error) => notify({ tone: NoticeTone.Warning, title: `flag ${error.key}: ${error.message}` }),
 * });
 *
 * flags.setContext({ targetingKey: user.id, plan: user.plan });
 * flags.getBoolean('newNav', false);
 * ```
 */
export function createFlagClient(options: CreateFlagClientOptions = {}): FlagClient {
  const provider = options.provider ?? staticFlagProvider();
  const onError = options.onError;
  const listeners = new Set<FlagContextListener>();
  let currentContext: EvaluationContext = mergeContext({}, options.context ?? {});

  const report = (key: string, errorCode: FlagErrorCode, message: string, cause?: unknown): void => {
    onError?.({ key, errorCode, message, cause });
  };

  /** Runs one typed evaluation end to end — the single place every failure mode is turned into a value. */
  const core = <TValue extends FlagValue>(
    key: string,
    defaultValue: TValue,
    callerContext: EvaluationContext | undefined,
    resolve: (key: string, context: EvaluationContext) => FlagResolution<FlagValue> | undefined,
    isValid: (value: FlagValue) => boolean,
    typeName: string,
  ): FlagEvaluation<TValue> => {
    if (!isValid(defaultValue)) {
      const message = `flag "${key}" requires a valid ${typeName} fallback`;
      report(key, FlagErrorCode.InvalidDefault, message);
      return {
        key,
        value: defaultValue,
        reason: FlagReason.Error,
        errorCode: FlagErrorCode.InvalidDefault,
        errorMessage: message,
      };
    }
    const context = callerContext ? mergeContext(currentContext, callerContext) : currentContext;
    let validResolution = false;
    let resolution: FlagResolution<FlagValue> | undefined;
    try {
      const resolved = resolve(key, context);
      if (resolved !== undefined) {
        if (resolved === null || typeof resolved !== 'object') throw new TypeError('Invalid provider resolution.');
        // Read provider accessors inside the same boundary as resolve itself.
        resolution = {
          value: resolved.value,
          reason: resolved.reason,
          variant: resolved.variant,
          errorCode: resolved.errorCode,
          errorMessage: resolved.errorMessage,
        };
        if (
          (resolution.reason !== undefined && !Object.values(FlagReason).includes(resolution.reason)) ||
          (resolution.errorCode !== undefined && !Object.values(FlagErrorCode).includes(resolution.errorCode)) ||
          (resolution.variant !== undefined && typeof resolution.variant !== 'string') ||
          (resolution.errorMessage !== undefined && typeof resolution.errorMessage !== 'string')
        ) {
          throw new TypeError('Invalid provider resolution metadata.');
        }
        validResolution = isValid(resolution.value);
      }
    } catch (cause) {
      const message = `provider threw while resolving "${key}"`;
      report(key, FlagErrorCode.ProviderError, message, cause);
      return {
        key,
        value: defaultValue,
        reason: FlagReason.Error,
        errorCode: FlagErrorCode.ProviderError,
        errorMessage: message,
      };
    }

    if (resolution === undefined) return { key, value: defaultValue, reason: FlagReason.Default };

    if (resolution.errorCode !== undefined) {
      const message = `provider reported "${resolution.errorCode}" for "${key}"`;
      report(key, resolution.errorCode, message, resolution.errorMessage);
      return {
        key,
        value: defaultValue,
        reason: FlagReason.Error,
        errorCode: resolution.errorCode,
        errorMessage: message,
        variant: resolution.variant,
      };
    }

    // Gated off: the flag exists but must not apply — the caller's default stands, not the stored value.
    if (resolution.reason === FlagReason.Disabled) {
      return { key, value: defaultValue, reason: FlagReason.Disabled, variant: resolution.variant };
    }

    if (!validResolution) {
      const message = `flag "${key}" resolved to ${typeof resolution.value}, expected ${typeName}`;
      report(key, FlagErrorCode.TypeMismatch, message);
      return {
        key,
        value: defaultValue,
        reason: FlagReason.Error,
        errorCode: FlagErrorCode.TypeMismatch,
        errorMessage: message,
        variant: resolution.variant,
      };
    }

    // The only cast in the evaluation path, and `isValid` is what earns it: the runtime type of the
    // resolved value has just been checked against the type `TValue` was inferred from.
    return {
      key,
      value: resolution.value as TValue,
      reason: resolution.reason ?? FlagReason.Static,
      variant: resolution.variant,
    };
  };

  const isBoolean = (value: FlagValue): boolean => typeof value === 'boolean';
  const isString = (value: FlagValue): boolean => typeof value === 'string';
  const isNumber = (value: FlagValue): boolean => typeof value === 'number' && Number.isFinite(value);
  const isJsonObject = (value: FlagValue): boolean =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  const evaluateBoolean = (key: string, defaultValue: boolean, context?: EvaluationContext): FlagEvaluation<boolean> =>
    core(key, defaultValue, context, (k, c) => provider.resolveBoolean(k, c), isBoolean, 'boolean');

  const evaluateString = (key: string, defaultValue: string, context?: EvaluationContext): FlagEvaluation<string> =>
    core(key, defaultValue, context, (k, c) => provider.resolveString(k, c), isString, 'string');

  const evaluateNumber = (key: string, defaultValue: number, context?: EvaluationContext): FlagEvaluation<number> =>
    core(key, defaultValue, context, (k, c) => provider.resolveNumber(k, c), isNumber, 'number');

  const evaluateObject = <TValue extends JsonObject>(
    key: string,
    defaultValue: TValue,
    decode: FlagObjectDecoder<TValue>,
    context?: EvaluationContext,
  ): FlagEvaluation<TValue> => {
    const evaluation = core(key, defaultValue, context, (k, c) => provider.resolveObject(k, c), isJsonObject, 'object');
    if (
      evaluation.reason === FlagReason.Default ||
      evaluation.reason === FlagReason.Disabled ||
      evaluation.reason === FlagReason.Error
    )
      return evaluation;
    let decoded: ReturnType<FlagObjectDecoder<TValue>>;
    try {
      decoded = decode(evaluation.value);
      if (decoded.ok && !isJsonObject(decoded.value)) throw new TypeError('Object flag decoder must return an object.');
    } catch (cause) {
      decoded = { ok: false, failure: cause };
    }
    if (!decoded.ok) {
      const message = `flag "${key}" failed its object decoder`;
      report(key, FlagErrorCode.TypeMismatch, message, decoded.failure);
      return {
        key,
        value: defaultValue,
        reason: FlagReason.Error,
        errorCode: FlagErrorCode.TypeMismatch,
        errorMessage: message,
      };
    }
    return { ...evaluation, value: decoded.value };
  };

  const evaluate = <TValue extends FlagScalar>(
    key: string,
    defaultValue: TValue,
    context?: EvaluationContext,
  ): FlagEvaluation<FlagScalarValue<TValue>> => {
    const fallback = widenScalar(defaultValue);
    if (typeof defaultValue === 'boolean')
      return core(key, fallback, context, (k, c) => provider.resolveBoolean(k, c), isBoolean, 'boolean');
    if (typeof defaultValue === 'string')
      return core(key, fallback, context, (k, c) => provider.resolveString(k, c), isString, 'string');
    if (typeof defaultValue === 'number' && Number.isFinite(defaultValue))
      return core(key, fallback, context, (k, c) => provider.resolveNumber(k, c), isNumber, 'number');

    const message = `flag "${key}" requires a boolean, string, or finite number fallback; use getObject with a decoder for objects`;
    report(key, FlagErrorCode.InvalidDefault, message);
    return {
      key,
      value: fallback,
      reason: FlagReason.Error,
      errorCode: FlagErrorCode.InvalidDefault,
      errorMessage: message,
    };
  };

  const notifyProvider = (context: EvaluationContext): void => {
    const fail = (cause: unknown): void =>
      report('', FlagErrorCode.ProviderError, 'provider failed handling the context change', cause);
    try {
      const hook = provider.onContextChange;
      if (hook === undefined) return;
      const pending = hook.call(provider, context);
      // a rejected refetch must not become an unhandled rejection
      if (pending !== undefined)
        void Promise.resolve(pending)
          .then(() => {
            if (currentContext === context) {
              for (const listener of [...listeners]) listener(context);
            }
          }, fail)
          .catch(fail);
    } catch (cause) {
      fail(cause);
    }
  };

  return {
    provider,

    getBoolean: (key, defaultValue, context) => evaluateBoolean(key, defaultValue, context).value,
    getString: (key, defaultValue, context) => evaluateString(key, defaultValue, context).value,
    getNumber: (key, defaultValue, context) => evaluateNumber(key, defaultValue, context).value,

    // Generic method shorthand, not an arrow: a non-generic arrow contextually typed by a generic
    // signature widens `TValue` to its constraint and the return no longer narrows back.
    getObject<TValue extends JsonObject>(
      key: string,
      defaultValue: TValue,
      decode: FlagObjectDecoder<TValue>,
      context?: EvaluationContext,
    ): TValue {
      return evaluateObject(key, defaultValue, decode, context).value;
    },

    evaluateBoolean,
    evaluateString,
    evaluateNumber,
    evaluateObject,

    getValue<TValue extends FlagScalar>(
      key: string,
      defaultValue: TValue,
      context?: EvaluationContext,
    ): FlagScalarValue<TValue> {
      return evaluate(key, defaultValue, context).value;
    },
    evaluate,

    getContext: () => currentContext,

    setContext(context: EvaluationContext): void {
      const next = mergeContext(currentContext, context);
      if (contextsEqual(currentContext, next)) return; // no-op merge — a per-render context literal costs nothing
      currentContext = next;
      try {
        notifyProvider(next);
      } finally {
        for (const listener of [...listeners]) listener(next);
      }
    },

    subscribe(listener: FlagContextListener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
