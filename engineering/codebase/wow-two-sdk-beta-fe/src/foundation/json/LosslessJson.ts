import { ExactNumber } from '../numbers';
import { ResultExtensions, type Result } from '../results';
import type { JsonFailure } from './models/JsonFailure';
import type { LosslessJsonValue } from './models/LosslessJsonValue';
import { JsonFailureCode } from './JsonFailureCode';
import { JsonLimits } from './JsonLimits';
import { JsonOperationError, rejectJson, rewriteJsonKeys, jsonStringLength } from './JsonText';
import { parseJson, stringifyJson } from './adapters/losslessJson/JsonAdapter';

function boundary<T>(operation: () => T, parsing = false): Result<T, JsonFailure> {
  try {
    return ResultExtensions.ok(operation());
  } catch (error) {
    if (error instanceof JsonOperationError) return ResultExtensions.fail(error.failure);
    if (parsing && error instanceof SyntaxError)
      return ResultExtensions.fail({ code: JsonFailureCode.InvalidSyntax, message: 'The JSON text is malformed.' });
    throw error;
  }
}

export interface JsonStringifyOptions {
  /** Indentation width, clamped to 0–10; defaults to compact output. */
  readonly space?: number;
  /** Sort own string keys at every object level; array order and numeric token spelling remain unchanged. */
  readonly sortKeys?: boolean;
}

/** Lossless numeric JSON codec with explicit unsupported-value and resource failures. */
export const LosslessJson = Object.freeze({
  parse(text: string): Result<LosslessJsonValue, JsonFailure> {
    return boundary(() => {
      if (typeof text !== 'string') rejectJson(JsonFailureCode.InvalidSyntax, 'Expected JSON text.');
      const keys = new Map<string, string>();
      const encoded = rewriteJsonKeys(text, (key, seen) => {
        if (seen.has(key)) rejectJson(JsonFailureCode.DuplicateKey, 'A JSON object contains a duplicate key.');
        seen.add(key);
        const safe = 'k' + keys.size;
        keys.set(safe, key);
        return safe;
      });
      const parsed = parseJson(encoded, (token) => {
        const value = ExactNumber.parse(token);
        if (!value.ok)
          rejectJson(
            value.failure.code === 'ResourceLimit' ? JsonFailureCode.ResourceLimit : JsonFailureCode.InvalidSyntax,
            'The JSON numeric token is invalid or exceeds its resource budget.',
          );
        return value.value;
      });
      const restore = (value: unknown): LosslessJsonValue => {
        if (
          value === null ||
          typeof value === 'string' ||
          typeof value === 'boolean' ||
          ExactNumber.isExactNumber(value)
        )
          return value;
        if (Array.isArray(value)) return value.map(restore);
        if (typeof value !== 'object' || value === null) throw new Error('JSON parser value invariant failed.');
        const restored: Record<string, LosslessJsonValue> = Object.create(null);
        for (const [key, item] of Object.entries(value)) {
          const original = keys.get(key);
          if (original === undefined) throw new Error('JSON parser key invariant failed.');
          restored[original] = restore(item);
        }
        return restored;
      };
      return restore(parsed);
    }, true);
  },
  stringify(value: unknown, options: JsonStringifyOptions = {}): Result<string, JsonFailure> {
    return boundary(() => {
      const space = options.space ?? 0;
      const indent = Number.isFinite(space) ? Math.min(10, Math.max(0, Math.trunc(space))) : 0;
      const active = new WeakSet<object>();
      const keys = new Map<string, string>();
      let tokens = 0,
        characters = 0;
      const spend = (count: number): void => {
        characters += count;
        if (characters > JsonLimits.maxCharacters || ++tokens > JsonLimits.maxTokens)
          rejectJson(JsonFailureCode.ResourceLimit, 'The JSON output resource budget was exceeded.');
      };
      const prepare = (item: unknown, depth: number): unknown => {
        if (item === null || typeof item === 'boolean') {
          spend(5);
          return item;
        }
        if (typeof item === 'string') {
          if (item.length > JsonLimits.maxCharacters)
            rejectJson(JsonFailureCode.ResourceLimit, 'The JSON string is too large.');
          spend(jsonStringLength(item, JsonLimits.maxCharacters - characters));
          return item;
        }
        if (ExactNumber.isExactNumber(item)) {
          spend(item.toString().length);
          return item;
        }
        if (typeof item === 'bigint') {
          const exact = ExactNumber.fromBigInt(item);
          if (!exact.ok) rejectJson(JsonFailureCode.ResourceLimit, 'The integer exceeds the numeric token budget.');
          return prepare(exact.value, depth);
        }
        if (typeof item === 'number') {
          const exact = ExactNumber.fromSafeInteger(item);
          if (!exact.ok)
            rejectJson(
              JsonFailureCode.UnsupportedValue,
              'Use ExactNumber for decimals and integers outside the native safe range.',
            );
          return prepare(exact.value, depth);
        }
        if (typeof item !== 'object' || item === null)
          rejectJson(JsonFailureCode.UnsupportedValue, 'The value is not supported by the JSON codec.');
        if (active.has(item))
          rejectJson(JsonFailureCode.CircularReference, 'A circular reference cannot be serialized.');
        if (depth >= JsonLimits.maxDepth) rejectJson(JsonFailureCode.ResourceLimit, 'The JSON nesting is too deep.');
        const array = Array.isArray(item);
        if (!array && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null)
          rejectJson(JsonFailureCode.UnsupportedValue, 'Encode custom instances explicitly before JSON serialization.');
        if (
          Object.getOwnPropertySymbols(item).some((symbol) => Object.getOwnPropertyDescriptor(item, symbol)?.enumerable)
        )
          rejectJson(JsonFailureCode.UnsupportedValue, 'Enumerable symbol keys cannot be serialized.');
        active.add(item);
        spend(2);
        const result: unknown[] | Record<string, unknown> = array ? [] : Object.create(null);
        if (array && item.length > JsonLimits.maxTokens)
          rejectJson(JsonFailureCode.ResourceLimit, 'The JSON array is too large.');
        const properties = array ? Array.from({ length: item.length }, (_, index) => String(index)) : Object.keys(item);
        if (array && Object.keys(item).some((key) => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= item.length))
          rejectJson(JsonFailureCode.UnsupportedValue, 'Extra array properties cannot be serialized.');
        if (!array && options.sortKeys) properties.sort();
        for (const key of properties) {
          const descriptor = Object.getOwnPropertyDescriptor(item, key);
          if (!descriptor || !('value' in descriptor))
            rejectJson(
              JsonFailureCode.UnsupportedValue,
              'Sparse arrays and accessor properties require explicit encoding.',
            );
          const safe = array ? key : 'k' + keys.size;
          if (!array) {
            if (key.length > JsonLimits.maxCharacters)
              rejectJson(JsonFailureCode.ResourceLimit, 'The JSON key is too large.');
            keys.set(safe, key);
            spend(jsonStringLength(key, JsonLimits.maxCharacters - characters - 1) + 1);
          }
          spend(1 + (indent > 0 ? (depth + 1) * indent + 2 : 0));
          (result as Record<string, unknown>)[safe] = prepare(descriptor.value, depth + 1);
        }
        active.delete(item);
        return result;
      };
      const normalized = prepare(value, 0);
      const encoded = stringifyJson(normalized, indent);
      // Restore only JSON key tokens; string values and exact numeric tokens are untouched.
      const output = rewriteJsonKeys(encoded, (key) => {
        const original = keys.get(key);
        if (original === undefined) throw new Error('JSON serializer key invariant failed.');
        return original;
      });
      if (output.length > JsonLimits.maxCharacters)
        rejectJson(JsonFailureCode.ResourceLimit, 'The JSON output is too large.');
      return output;
    });
  },
});
