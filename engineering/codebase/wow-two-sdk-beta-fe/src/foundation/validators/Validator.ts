// The one validator type every builder in this slice returns, and the Standard Schema bridge that makes
// it portable. A `Validator<T>` is a `typeName` plus a total parse function; the chain methods never
// mutate — each returns a NEW validator wrapping the previous one, so a validator can be shared and
// re-derived freely.
//
// STANDARD-SCHEMA-COMPATIBLE BY CONSTRUCTION: every instance exposes `['~standard']` in its constructor,
// so any validator built here drops straight into `forms-engine` (`AppFormOptions.schema`) or into any
// other Standard Schema consumer with no adapter and no wrapper. That is the point of the slice — the
// forms engine already speaks the spec, but the spec type lived above `foundation`, so nothing below it
// could produce one. `toStandardSchema` exists only for callers who prefer a bare spec object.
//
// Standard Schema carries input and output independently. Transforms preserve the original input;
// optional/default chains add undefined only where accepted. Runtime validation still accepts unknown.
//
// WHY `derive` REBUILDS `this.constructor`: refinements must preserve the SUBCLASS, or the chain collapses
// — `string().min(2)` returning a base `Validator<string>` would lose `.pattern()`. Every subclass keeps
// the base `(typeName, parseFn)` constructor signature so the same class can be rebuilt with an extra check.
//
// WHY THE PHANTOM `__output`: `Infer<V>` reads the output type back out of a validator. A phantom field
// pins `TOutput` in a plain covariant position, making the inference reliable regardless of how the type
// appears in method signatures. It is `declare`-only — it emits no runtime code and is never read.
//
// Expected validation failures use Result. Caller checks, transforms and violated invariants
// remain exceptional; explicitly adapt throwing external parsers at their boundary.

import { ExactNumber } from '../numbers';
import type { StandardSchemaV1 } from './StandardSchema';
import { invalid, valid, type PathSegmentKey, type ValidatorParseResult } from './ValidationOutcome';

/** Parses the value at a structured path. Expected failures are results; programmer errors may throw. */
export type ParseFn<TOutput> = (value: unknown, path: ReadonlyArray<PathSegmentKey>) => ValidatorParseResult<TOutput>;

/** The `vendor` reported by every validator's Standard Schema props. */
export const ValidationVendor = 'wow-two-beta';

/** Shared root path — frozen because issues hold it by reference. */
const RootPath: ReadonlyArray<PathSegmentKey> = Object.freeze([]);

/** Extracts the output type of a validator: `Infer<typeof user>` → `{ name: string }`. */
export type Infer<TValidator> = TValidator extends { readonly __output: infer TOutput } ? TOutput : never;

/** Extracts the editable input type before transforms/defaults. */
export type InferInput<TValidator> = TValidator extends { readonly __input: infer TInput } ? TInput : never;

/** Converts a slice result into the Standard Schema result shape (`{ value }` or `{ issues }`). */
export function toStandardResult<TOutput>(result: ValidatorParseResult<TOutput>): StandardSchemaV1.Result<TOutput> {
  if (result.ok) return { value: result.value };
  // Spec issues carry `message` + `path` only; `code` is ours and has no spec slot, so it is dropped
  // here rather than smuggled in — a consumer that wants codes reads `validate()` directly.
  return { issues: result.failure.issues.map((issue) => ({ message: issue.message, path: issue.path })) };
}

/**
 * A total, composable validator for one shape of value. Build one with `string()`, `object({…})`, etc.
 * rather than constructing it directly; the constructor is public only so a caller can define a
 * validator this slice does not ship.
 */
export class Validator<TOutput, TInput = TOutput> implements StandardSchemaV1<TInput, TOutput> {
  /** Phantom carrier for `Infer`. Never assigned, never read — erased at compile time. */
  declare readonly __output: TOutput;
  declare readonly __input: TInput;

  /** Human-facing name of the accepted shape, used in messages and in composite type names. */
  readonly typeName: string;

  /** Standard Schema props — lets this validator be handed to any spec consumer unchanged. */
  readonly '~standard': StandardSchemaV1.Props<TInput, TOutput>;

  /** The total parse function this validator wraps. */
  protected readonly parseFn: ParseFn<TOutput>;

  /** Wraps a parse function under a display name. Prefer the builders (`string()`, `object()`, …). */
  constructor(typeName: string, parseFn: ParseFn<TOutput>) {
    this.typeName = typeName;
    this.parseFn = parseFn;
    this['~standard'] = {
      version: 1,
      vendor: ValidationVendor,
      // Always synchronous — the spec allows a promise, this slice never needs one, and staying sync
      // means a form gets its errors in the same tick as the change that caused them.
      validate: (value: unknown) => toStandardResult(this.validate(value)),
    };
  }

  /** Validates `value` from the root. Expected validation failures are results; caller code bugs remain exceptional. */
  validate(value: unknown): ValidatorParseResult<TOutput> {
    return this.parseAt(value, RootPath);
  }

  /**
   * Validates `value` as if it sat at `path` inside a larger structure, so nested issues carry their
   * full address. Composites call this to thread the path; prefer `validate` at ordinary call sites.
   */
  parseAt(value: unknown, path: ReadonlyArray<PathSegmentKey>): ValidatorParseResult<TOutput> {
    return this.parseFn(value, path);
  }

  /** Accepts `undefined` as-is; any other value must satisfy this validator. Widens to `TOutput | undefined`. */
  optional(): Validator<TOutput | undefined, TInput | undefined> {
    return new Validator<TOutput | undefined, TInput | undefined>(`${this.typeName} | undefined`, (value, path) =>
      value === undefined ? valid(undefined) : this.parseAt(value, path),
    );
  }

  /** Accepts `null` as-is; any other value must satisfy this validator. Widens to `TOutput | null`. */
  nullable(): Validator<TOutput | null, TInput | null> {
    return new Validator<TOutput | null, TInput | null>(`${this.typeName} | null`, (value, path) =>
      value === null ? valid(null) : this.parseAt(value, path),
    );
  }

  /**
   * Substitutes a scalar or immutable ExactNumber when undefined. Mutable defaults use `defaultFactory`.
   *
   * `null` is NOT defaulted. An explicit `null` is a value the caller chose — in a JSON payload it means
   * "known to be empty", which is different from "absent" — so it keeps flowing into this validator and
   * is rejected unless the validator is also `.nullable()`. Matches zod's split.
   */
  default(fallback: Exclude<TOutput, undefined>): Validator<Exclude<TOutput, undefined>, TInput | undefined> {
    if (
      (typeof fallback === 'object' && fallback !== null && !ExactNumber.isExactNumber(fallback)) ||
      typeof fallback === 'function'
    )
      throw new TypeError('Use defaultFactory for object or function defaults.');
    return this.defaultFactory(() => fallback);
  }

  /** Produces a fresh parsed default per missing value; the factory owns mutable value isolation. */
  defaultFactory(
    create: () => Exclude<TOutput, undefined>,
  ): Validator<Exclude<TOutput, undefined>, TInput | undefined> {
    const fallback = (): Exclude<TOutput, undefined> => {
      const value = create();
      if (value === undefined) throw new TypeError('A default factory must return a defined value.');
      return value;
    };
    return new Validator<Exclude<TOutput, undefined>, TInput | undefined>(
      `${this.typeName} (default)`,
      (value, path) => {
        if (value === undefined) return valid(fallback());

        const result = this.parseAt(value, path);
        if (!result.ok) return result;

        // The inner validator can still yield `undefined` (a `.transform` that returns it), which the
        // fallback also covers — so the narrowing cast holds for every path that reaches here.
        return valid((result.value === undefined ? fallback() : result.value) as Exclude<TOutput, undefined>);
      },
    );
  }

  /**
   * Adds a custom check that runs only after this validator accepts the value, so `check` always sees a
   * fully parsed `TOutput`. Returns the same validator class, keeping type-specific methods chainable.
   * A thrown check indicates a programmer error and propagates.
   *
   * `params` carries the rule's operands onto the issue so a message catalogue can re-render it
   * (`Messages.ts`). Pass the limits the check compares against, never the value it rejected.
   */
  refine(
    check: (value: TOutput) => boolean,
    message: string,
    code = 'custom',
    params?: Readonly<Record<string, unknown>>,
  ): this {
    return this.derive((value, path) => {
      const result = this.parseAt(value, path);
      if (!result.ok) return result;

      const passed = check(result.value);
      return passed ? result : invalid([{ path, message, code, params }]);
    });
  }

  /**
   * Maps the parsed value to another shape. Runs strictly AFTER validation, so `map` receives a valid
   * `TOutput`. A thrown mapper indicates a programmer error and propagates. The result is a base
   * `Validator<TNext, TInput>` — type-specific methods do not survive a change of output type.
   */
  transform<TNext>(map: (value: TOutput) => TNext): Validator<TNext, TInput> {
    return new Validator<TNext, TInput>(this.typeName, (value, path) => {
      const result = this.parseAt(value, path);
      if (!result.ok) return result;

      return valid(map(result.value));
    });
  }

  /** Rebuilds this validator's own class around a new parse function, keeping the chain's static type. */
  protected derive(parseFn: ParseFn<TOutput>): this {
    const Ctor = this.constructor as new (typeName: string, parseFn: ParseFn<TOutput>) => this;
    return new Ctor(this.typeName, parseFn);
  }
}

/**
 * Presents a validator as a bare Standard Schema object. Every validator already implements the spec —
 * this is sugar for a call site that reads better handing over a plain `{ '~standard': … }` than the
 * whole validator (and for narrowing the surface a consumer sees).
 */
export function toStandardSchema<TOutput, TInput>(
  validator: Validator<TOutput, TInput>,
): StandardSchemaV1<TInput, TOutput> {
  return { '~standard': validator['~standard'] };
}
