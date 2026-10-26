import { ResultExtensions } from '../results';
import type { StandardSchemaV1 } from '../validators/StandardSchema';
import { ApiFailureFactory } from './ApiFailure';
import type { ApiDecoder } from './CreateApiClient';

/** Defines the options of a decoder built from a schema. */
export interface ApiSchemaDecoderOptions {
  /**
   * Receives the issues of a payload the schema rejected — a log line's input, never display text. The decoder
   * still returns its `protocol` failure.
   */
  readonly onIssues?: (issues: ReadonlyArray<StandardSchemaV1.Issue>) => void;
}

/** @internal Whether a schema result is a promise, which a synchronous decoder cannot wait for. */
function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

/** Extends `ApiDecoder` with decoders built from validation schemas. */
export const ApiDecoderExtensions = {
  /**
   * Wraps a Standard Schema — the SDK's own validators, zod, valibot, arktype — as an endpoint decoder. A payload the
   * schema rejects is a `protocol` failure, so response diagnostics never become display text; its issues reach
   * `onIssues` only. A schema that validates asynchronously throws a `TypeError`: wire decoding is synchronous.
   * ```ts
   * client.get('/api/codes', { decode: ApiDecoderExtensions.fromSchema(CodeListSchema) });
   * ```
   */
  fromSchema<TSchema extends StandardSchemaV1>(
    schema: TSchema,
    options: ApiSchemaDecoderOptions = {},
  ): ApiDecoder<StandardSchemaV1.InferOutput<TSchema>> {
    return (value) => {
      const outcome = schema['~standard'].validate(value);
      if (isThenable(outcome)) {
        // Settle the abandoned validation quietly; the caller learns of the misuse from the throw below.
        Promise.resolve(outcome).then(undefined, () => undefined);
        throw new TypeError(
          `ApiDecoderExtensions.fromSchema needs a synchronous schema; the ${schema['~standard'].vendor} schema returned a promise.`,
        );
      }
      if (outcome.issues === undefined)
        return ResultExtensions.ok(outcome.value as StandardSchemaV1.InferOutput<TSchema>);
      options.onIssues?.(outcome.issues);
      return ResultExtensions.fail(ApiFailureFactory.create('protocol'));
    };
  },
} as const;
