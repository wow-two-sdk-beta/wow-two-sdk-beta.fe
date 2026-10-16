import type { FlagProvider, FlagResolution } from './FlagProvider';
import {
  FlagReason,
  type ContextAttribute,
  type EvaluationContext,
  type FlagValue,
  type JsonObject,
} from './FlagTypes';

/*
 * The in-memory provider: the test double AND the local-dev default (`createFlagClient()` with no
 * provider runs an empty one, so every flag cleanly returns the caller's default).
 *
 * A flag is either a bare value (`{ newNav: true }`) or a definition carrying variants, targeting
 * rules and the disabled gate. Rules are evaluated top-down, first match wins — deliberately no
 * rule algebra: this is a local stand-in for a real flag service's targeting, not a rules engine.
 *
 * NOT VALIDATED ON PURPOSE: the typed `resolve*` methods cast their entry rather than checking it,
 * so a map declaring `{ newNav: 'yes' }` really does hand a string to `getBoolean` — which is what
 * makes this provider a faithful double for the type-mismatch path the client guards.
 */

/**
 * Defines a targeting condition. Either an attribute map — every entry must match, an array value
 * meaning "is one of" — or a predicate for anything more involved.
 *
 * `{ plan: 'pro' }` · `{ plan: ['pro', 'team'], region: 'eu' }` · `(ctx) => ctx.seats > 50`
 */
export type StaticFlagCondition =
  | Readonly<Record<string, ContextAttribute | ReadonlyArray<ContextAttribute>>>
  | ((context: EvaluationContext) => boolean);

/** Defines one targeting rule of a static flag — the value served to contexts matching `when`. */
export interface StaticFlagRule<TValue extends FlagValue> {
  /** The condition the evaluation context must satisfy. */
  readonly when: StaticFlagCondition;

  /** The value served on a match — reported with `reason: 'targeting'`. */
  readonly value: TValue;

  /** The variant name reported on a match; falls back to the definition's `variant`. */
  readonly variant?: string;
}

/** Defines a static flag with variants, targeting, or an off switch — the long form of a map entry. */
export interface StaticFlagDefinition<TValue extends FlagValue> {
  /** The value served when no rule matches — reported with `reason: 'static'`. */
  readonly value: TValue;

  /** The variant name reported alongside `value`. */
  readonly variant?: string;

  /** Whether the flag is off; every evaluation returns the caller's default, `reason: 'disabled'`, rules skipped. */
  readonly disabled?: boolean;

  /** The targeting rules, evaluated top-down; the first match wins. */
  readonly rules?: ReadonlyArray<StaticFlagRule<TValue>>;
}

/**
 * Defines one entry of a static flag map — a bare value or a {@link StaticFlagDefinition}.
 *
 * The two are told apart by the presence of a `value` property, so an object flag whose payload
 * itself has a `value` key must use the long form (`{ value: { value: 1 } }`).
 */
export type StaticFlagEntry = boolean | string | number | JsonObject | StaticFlagDefinition<FlagValue>;

/** Defines the `key → flag` map backing a {@link staticFlagProvider}. */
export type StaticFlags = Readonly<Record<string, StaticFlagEntry>>;

/** Reports whether one attribute satisfies one expected value — expected array is "one of", actual is "contains". */
function attributeMatches(
  actual: ContextAttribute | undefined,
  expected: ContextAttribute | ReadonlyArray<ContextAttribute>,
): boolean {
  if (Array.isArray(expected)) {
    return (expected as ReadonlyArray<ContextAttribute>).some((candidate) => attributeMatches(actual, candidate));
  }
  if (Array.isArray(actual)) {
    return (actual as ReadonlyArray<string | number | boolean>).some((entry) => entry === expected);
  }
  return actual === expected;
}

/** Reports whether a context satisfies a condition — every attribute matches, or the predicate returns `true`. */
function conditionMatches(condition: StaticFlagCondition, context: EvaluationContext): boolean {
  if (typeof condition === 'function') return condition(context);
  return Object.entries(condition).every(
    ([attribute, expected]) => Object.hasOwn(context, attribute) && attributeMatches(context[attribute], expected),
  );
}

/** Reports whether a map entry is the long form — an object carrying a `value` property. */
function isDefinition(entry: StaticFlagEntry): entry is StaticFlagDefinition<FlagValue> {
  return typeof entry === 'object' && entry !== null && !Array.isArray(entry) && Object.hasOwn(entry, 'value');
}

/**
 * Creates an in-memory {@link FlagProvider} over a `key → flag` map — the test double, the
 * local-dev default, and the fallback used when a client is created without a provider.
 *
 * An entry is a bare value or a {@link StaticFlagDefinition}; a disabled one hands back the caller's default.
 */
export function staticFlagProvider(flags: StaticFlags = {}): FlagProvider {
  const resolve = (key: string, context: EvaluationContext): FlagResolution<FlagValue> | undefined => {
    const entry = Object.hasOwn(flags, key) ? flags[key] : undefined;
    if (entry === undefined) return undefined; // not configured — the client uses the caller's default

    const definition: StaticFlagDefinition<FlagValue> = isDefinition(entry) ? entry : { value: entry };
    if (definition.disabled === true) {
      return { value: definition.value, reason: FlagReason.Disabled, variant: definition.variant };
    }

    for (const rule of definition.rules ?? []) {
      if (conditionMatches(rule.when, context)) {
        return { value: rule.value, reason: FlagReason.Targeting, variant: rule.variant ?? definition.variant };
      }
    }

    return { value: definition.value, reason: FlagReason.Static, variant: definition.variant };
  };

  // Each typed method casts rather than validates — a mistyped map must reach the client's
  // runtime type check, which is the behaviour under test.
  return {
    name: 'static',
    resolveBoolean: (key, context) => resolve(key, context) as FlagResolution<boolean> | undefined,
    resolveString: (key, context) => resolve(key, context) as FlagResolution<string> | undefined,
    resolveNumber: (key, context) => resolve(key, context) as FlagResolution<number> | undefined,
    resolveObject: (key, context) => resolve(key, context) as FlagResolution<JsonObject> | undefined,
  };
}
