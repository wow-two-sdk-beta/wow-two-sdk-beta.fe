// Structural validators: `object`, `array`, `record`, `union`, `tuple`. These are what make the slice
// worth having — a scalar check is one line of hand-written code, but addressing a failure three levels
// down inside a payload is not.
//
// COLLECT EVERY ISSUE, NOT THE FIRST: each composite keeps walking after a member fails and concatenates
// what it finds, so one pass over a form or a config file reports all of it. Stopping at the first
// failure turns fixing a payload into a guess-and-retry loop. Each member is validated through
// `parseAt([...path, key])`, so an issue arrives already addressed — `['items', 0, 'name']`.
//
// UNION IS THE DELIBERATE EXCEPTION: it reports ONE issue naming the alternatives instead of merging
// every branch's failures. A three-branch union over a bad value otherwise emits "expected string" +
// "expected number" + "expected boolean" at the same path, which is noise at a UI — the useful fact is
// which shapes were allowed.
//
// PROTOTYPE SAFETY: output objects are written with `Object.defineProperty`, never `target[key] = value`.
// A payload carrying a `__proto__` key would otherwise hit the prototype setter — assignment mutates the
// object's prototype instead of storing data, which is a prototype-pollution primitive. `defineProperty`
// always writes a plain own data property.
//
// SCHEMA DEPTH BOUNDS THE WALK: recursion follows the SCHEMA, which is finite, not the DATA. A circular
// input is therefore safe without a depth guard — `record(string())` over a self-referencing object
// visits each value exactly once and rejects the object-valued one.

import { Validator, type Infer, type InferInput } from './Validator';
import { describeType, invalid, valid, type ValidationIssue, type ValidatorParseResult } from './ValidationOutcome';

/** A map of property name to the validator for that property. */
export type ObjectShape = Readonly<Record<string, Validator<unknown>>>;

/** Flattens an intersection into a single readable object type in editor tooltips and `.d.ts` output. */
type Prettify<T> = { [K in keyof T]: T[K] };

/** Keys whose validator admits `undefined` — these become optional properties on the output type. */
type OptionalKeys<TShape extends ObjectShape> = {
  [K in keyof TShape]-?: undefined extends Infer<TShape[K]> ? K : never;
}[keyof TShape];

/** Keys whose validator requires a value. */
type RequiredKeys<TShape extends ObjectShape> = Exclude<keyof TShape, OptionalKeys<TShape>>;

/**
 * The object type a shape validates to. A member built with `.optional()` becomes an optional PROPERTY
 * (`name?: string`), not merely `name: string | undefined`, so the output type matches what the runtime
 * actually produces — an absent optional key stays absent.
 */
export type InferObject<TShape extends ObjectShape> = Prettify<
  { [K in RequiredKeys<TShape>]: Infer<TShape[K]> } & {
    [K in OptionalKeys<TShape>]?: Infer<TShape[K]>;
  }
>;

/** The tuple type a fixed-length list of validators validates to. */
export type InferTuple<TValidators extends readonly unknown[]> = {
  -readonly [K in keyof TValidators]: Infer<TValidators[K]>;
};

/** Input object shape, preserving optional/defaulted inputs independently of output. */
export type InferObjectInput<TShape extends ObjectShape> = Prettify<
  { [K in keyof TShape as undefined extends InferInput<TShape[K]> ? never : K]: InferInput<TShape[K]> } & {
    [K in keyof TShape as undefined extends InferInput<TShape[K]> ? K : never]?: InferInput<TShape[K]>;
  }
>;
export type InferTupleInput<TValidators extends readonly unknown[]> = {
  -readonly [K in keyof TValidators]: InferInput<TValidators[K]>;
};

/** A validator for arrays of `TItem`, carrying the length refinements. */
export class ArrayValidator<TItem, TItemInput = TItem> extends Validator<TItem[], TItemInput[]> {
  /** Requires at least `limit` items. */
  min(limit: number, message?: string): this {
    return this.refine(
      (value) => value.length >= limit,
      message ?? `must have at least ${limit} item${limit === 1 ? '' : 's'}`,
      'min',
      { min: limit, unit: 'items' },
    );
  }

  /** Requires at most `limit` items. */
  max(limit: number, message?: string): this {
    return this.refine(
      (value) => value.length <= limit,
      message ?? `must have at most ${limit} item${limit === 1 ? '' : 's'}`,
      'max',
      { max: limit, unit: 'items' },
    );
  }

  /** Requires exactly `exact` items. */
  length(exact: number, message?: string): this {
    return this.refine(
      (value) => value.length === exact,
      message ?? `must have exactly ${exact} item${exact === 1 ? '' : 's'}`,
      'length',
      { length: exact, unit: 'items' },
    );
  }
}

/** Narrows to a keyed object — arrays and `null` are excluded, since neither is a record of properties. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Writes an own data property, bypassing any inherited setter (notably `__proto__`). */
function defineOwn(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
}

/**
 * Validates an object against a shape, reporting every failing property. Unknown keys are STRIPPED: the
 * output carries only declared properties, so a validated payload cannot smuggle extra fields past the
 * boundary into storage or a log.
 */
export function object<TShape extends ObjectShape>(
  shape: TShape,
  message?: string,
): Validator<InferObject<TShape>, InferObjectInput<TShape>> {
  const entries = Object.entries(shape);

  return new Validator<InferObject<TShape>, InferObjectInput<TShape>>('object', (value, path) => {
    if (!isRecord(value)) {
      return invalid([{ path, message: message ?? `expected object, received ${describeType(value)}`, code: 'type' }]);
    }

    const output: Record<string, unknown> = {};
    const issues: ValidationIssue[] = [];

    for (const [key, validator] of entries) {
      const present = Object.hasOwn(value, key);
      const result = validator.parseAt(present ? value[key] : undefined, [...path, key]);
      if (!result.ok) {
        issues.push(...result.failure.issues);
        continue;
      }
      // An absent optional key stays absent. Writing `{ name: undefined }` would make `'name' in output`
      // true, which flips `??=` merges and deep-equality comparisons downstream.
      if (result.value === undefined && !present) continue;
      defineOwn(output, key, result.value);
    }

    return issues.length > 0 ? invalid(issues) : valid(output as InferObject<TShape>);
  });
}

/** Validates every item against `item`, reporting each failure at its own index. */
export function array<TItem, TItemInput>(
  item: Validator<TItem, TItemInput>,
  message?: string,
): ArrayValidator<TItem, TItemInput> {
  return new ArrayValidator<TItem, TItemInput>(`${item.typeName}[]`, (value, path) => {
    if (!Array.isArray(value)) {
      return invalid([{ path, message: message ?? `expected array, received ${describeType(value)}`, code: 'type' }]);
    }

    const items: ReadonlyArray<unknown> = value;
    const output: TItem[] = [];
    const issues: ValidationIssue[] = [];

    for (const [index, entry] of items.entries()) {
      const result = item.parseAt(entry, [...path, index]);
      if (result.ok) output.push(result.value);
      else issues.push(...result.failure.issues);
    }

    return issues.length > 0 ? invalid(issues) : valid(output);
  });
}

/**
 * Validates every value of an open-keyed object against `value`, reporting each failure under its key.
 * Keys are not validated — only own enumerable string keys are visited, which is what `Object.entries`
 * gives and what a JSON payload can carry.
 */
export function record<TValue, TInput>(
  value: Validator<TValue, TInput>,
  message?: string,
): Validator<Record<string, TValue>, Record<string, TInput>> {
  return new Validator<Record<string, TValue>, Record<string, TInput>>(`record<${value.typeName}>`, (input, path) => {
    if (!isRecord(input)) {
      return invalid([{ path, message: message ?? `expected object, received ${describeType(input)}`, code: 'type' }]);
    }

    const output: Record<string, TValue> = {};
    const issues: ValidationIssue[] = [];

    for (const [key, entry] of Object.entries(input)) {
      const result = value.parseAt(entry, [...path, key]);
      if (result.ok) defineOwn(output as Record<string, unknown>, key, result.value);
      else issues.push(...result.failure.issues);
    }

    return issues.length > 0 ? invalid(issues) : valid(output);
  });
}

/**
 * Accepts a value matching any one of `validators`, tried in order — the first match wins, so order
 * matters when branches overlap. A total failure reports ONE issue naming the alternatives rather than
 * every branch's issues; see the header note.
 */
export function union<const TValidators extends readonly Validator<unknown>[]>(
  validators: TValidators,
  message?: string,
): Validator<Infer<TValidators[number]>, InferInput<TValidators[number]>> {
  const label = validators.map((validator) => validator.typeName).join(' | ');

  return new Validator<Infer<TValidators[number]>, InferInput<TValidators[number]>>(
    label,
    (value, path): ValidatorParseResult<Infer<TValidators[number]>> => {
      for (const validator of validators) {
        const result = validator.parseAt(value, path);
        if (result.ok) return valid(result.value as Infer<TValidators[number]>);
      }
      return invalid([
        {
          path,
          message: message ?? `expected ${label}, received ${describeType(value)}`,
          code: 'union',
        },
      ]);
    },
  );
}

/**
 * Validates a fixed-length, positionally-typed array. A length mismatch is reported once at the tuple's
 * own path; a wrong element type is reported at that element's index.
 */
export function tuple<const TValidators extends readonly Validator<unknown>[]>(
  validators: TValidators,
  message?: string,
): Validator<InferTuple<TValidators>, InferTupleInput<TValidators>> {
  const label = `[${validators.map((validator) => validator.typeName).join(', ')}]`;

  return new Validator<InferTuple<TValidators>, InferTupleInput<TValidators>>(label, (value, path) => {
    if (!Array.isArray(value)) {
      return invalid([{ path, message: message ?? `expected array, received ${describeType(value)}`, code: 'type' }]);
    }

    const items: ReadonlyArray<unknown> = value;
    if (items.length !== validators.length) {
      return invalid([
        {
          path,
          message: `expected exactly ${validators.length} item${validators.length === 1 ? '' : 's'}, received ${items.length}`,
          code: 'length',
        },
      ]);
    }

    const output: unknown[] = [];
    const issues: ValidationIssue[] = [];

    for (const [index, validator] of validators.entries()) {
      const result = validator.parseAt(items[index], [...path, index]);
      if (result.ok) output.push(result.value);
      else issues.push(...result.failure.issues);
    }

    return issues.length > 0 ? invalid(issues) : valid(output as InferTuple<TValidators>);
  });
}
