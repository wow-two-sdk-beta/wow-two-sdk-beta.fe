import type { Result } from '../foundation/results';

/*
 * OpenFeature-SHAPED vocabulary, mirrored structurally — NO `@openfeature/*` dependency, exactly
 * like `forms-engine/StandardSchema.ts` vendors the Standard Schema spec types. An app that later
 * adopts the real OpenFeature JS SDK re-points its adapter and keeps every call site: evaluation
 * context, resolution details, reason, error code and variant all carry the spec's meaning.
 *
 * Three deliberate divergences, each in service of "every evaluation is total" (see FlagClient.ts):
 *   - reasons are lowercase house strings (`'targeting'`, not the spec's `TARGETING_MATCH`), matching
 *     the `AuthStatus` / `NoticeTone` const-object shape used everywhere else in this SDK;
 *   - a MISSING flag is `reason: 'default'`, NOT an error — an unconfigured flag is the normal state
 *     during a rollout, so it carries no `errorCode` and never reaches `onError`. Only a genuine
 *     fault (wrong wire type, throwing provider) is an error;
 *   - object flags are constrained to a JSON *object* (`JsonObject`), not the spec's whole
 *     `JsonValue` — a top-level array or scalar flag is expressed as its own typed flag instead.
 */

/** Defines a JSON scalar — the leaves of an object flag's payload. */
export type JsonPrimitive = string | number | boolean | null;

/** Defines any JSON-serialisable value inside an object flag's payload. */
export type JsonValue = JsonPrimitive | ReadonlyArray<JsonValue> | JsonObject;

/**
 * Defines the payload of an object flag — a JSON object.
 *
 * TS only grants *type aliases* an implicit index signature, so a payload typed by an `interface`
 * is not assignable here; declare the payload with `type Payload = { … }` (or extend `JsonObject`).
 */
export interface JsonObject {
  /** The payload entries — any JSON-serialisable value. */
  readonly [key: string]: JsonValue;
}

/** Defines every value a flag can evaluate to — the four supported flag types. */
export type FlagScalar = boolean | string | number;
export type FlagValue = FlagScalar | JsonObject;
/** Widens fallback literals; a provider can return any value of the selected scalar kind. */
export type FlagScalarValue<T extends FlagScalar> = T extends boolean ? boolean : T extends string ? string : number;
/** Validates an object flag's application shape; return a failure to fall back and report a type mismatch. */
export type FlagObjectDecoder<T extends JsonObject> = (value: unknown) => Result<T, unknown>;

/** Defines an attribute value on an {@link EvaluationContext} — a scalar, or a list for roles and groups. */
export type ContextAttribute = string | number | boolean | null | readonly (string | number | boolean)[];

/**
 * Defines the targeting input of an evaluation — who/what the flag is being resolved for.
 * `targetingKey` is the spec's stable subject identity (user id, tenant, device); every other
 * attribute is free-form and matched by a provider's rules.
 *
 * Set app-wide with `client.setContext(…)` (merged, see {@link FlagClient}) and override per call
 * by passing a context to any `get*` / `evaluate*`.
 */
export interface EvaluationContext {
  /** The stable identity the flag is resolved for — user id, tenant id, device id. */
  readonly targetingKey?: string;

  /** Any further targeting attribute — `plan`, `region`, `roles`, `isInternal`. */
  readonly [attribute: string]: ContextAttribute | undefined;
}

/** Defines why an evaluation produced the value it did. */
export const FlagReason = {
  /** Refers to the flag's configured value, with no rule involved. */
  Static: 'static',
  /** Refers to a value chosen by a targeting rule matching the evaluation context. */
  Targeting: 'targeting',
  /** Refers to `defaultValue` standing in for an unconfigured flag — the pre-rollout state, not a fault. */
  Default: 'default',
  /** Refers to `defaultValue` standing in after a fault, such as a wrong wire type — see `errorCode`. */
  Error: 'error',
  /** Refers to the caller's `defaultValue` standing in because the flag exists but is switched off. */
  Disabled: 'disabled',
} as const;

export type FlagReason = (typeof FlagReason)[keyof typeof FlagReason];

/** Defines what went wrong on an evaluation with `reason: 'error'`. */
export const FlagErrorCode = {
  /** Refers to a resolved value whose runtime type is not the one asked for — a `string` for `getBoolean`. */
  TypeMismatch: 'type-mismatch',
  /** Refers to a provider that threw, rejected, or reported its own failure. */
  ProviderError: 'provider-error',
  /** Refers to a `defaultValue` that is not one of the four supported flag types — reachable only from untyped JS. */
  InvalidDefault: 'invalid-default',
} as const;

export type FlagErrorCode = (typeof FlagErrorCode)[keyof typeof FlagErrorCode];

/**
 * Defines the full outcome of one evaluation. Always carries a usable `value`: on any miss,
 * mismatch, or provider fault it is the caller's `defaultValue`, and `reason` says which.
 */
export interface FlagEvaluation<TValue extends FlagValue> {
  /** The flag key evaluated. */
  readonly key: string;

  /** The resolved value, or the caller's `defaultValue` when `reason` is `default` / `error` / `disabled`. */
  readonly value: TValue;

  /** Why this value was produced. */
  readonly reason: FlagReason;

  /** The name of the matched variant, when the provider reports one — for analytics/exposure logging. */
  readonly variant?: string;

  /** What went wrong; set only when `reason` is `error`. */
  readonly errorCode?: FlagErrorCode;

  /** A human-readable description of the fault; set only when `reason` is `error`. */
  readonly errorMessage?: string;
}

/** Defines the fault handed to `createFlagClient({ onError })`; evaluation has already fallen back. */
export interface FlagErrorInfo {
  /** The flag key being evaluated when the fault occurred. */
  readonly key: string;

  /** What went wrong. */
  readonly errorCode: FlagErrorCode;

  /** A human-readable description of the fault. */
  readonly message: string;

  /** The original thrown value, when the fault came from a throwing/rejecting provider. */
  readonly cause?: unknown;
}
