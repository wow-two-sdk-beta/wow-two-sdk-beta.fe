import { ResultExtensions, type Result } from '../results';
import { ApiFailureFactory, type ApiFailure } from './ApiFailure';

const isJsonObject = (parsed: unknown): parsed is Record<string, unknown> =>
  parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);

/** Declares success-envelope decoding and non-success transport diagnostics. */
export interface ResponseEnvelope {
  readonly unwrap: (parsed: unknown, response: Response) => Result<unknown, ApiFailure>;
  readonly toFailure: (parsed: unknown, response: Response) => ApiFailure;
}

/** Requires a JSON object with its own data member. */
export const wowTwoEnvelope: ResponseEnvelope = {
  unwrap: (parsed, response) =>
    isJsonObject(parsed) && Object.hasOwn(parsed, 'data')
      ? ResultExtensions.ok(parsed['data'])
      : ResultExtensions.fail(ApiFailureFactory.create('protocol', response)),
  toFailure: (parsed, response) => ApiFailureFactory.create('http', response, isJsonObject(parsed) ? parsed : null),
};

/** Leaves un-enveloped JSON values unchanged. */
export const rawEnvelope: ResponseEnvelope = {
  unwrap: (parsed) => ResultExtensions.ok(parsed),
  toFailure: (_parsed, response) => ApiFailureFactory.create('http', response),
};
