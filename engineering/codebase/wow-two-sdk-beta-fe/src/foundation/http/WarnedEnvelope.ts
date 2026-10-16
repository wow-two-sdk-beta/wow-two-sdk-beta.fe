import { ResultExtensions } from '../results';
import { ApiFailureFactory } from './ApiFailure';
import type { ApiDecoder } from './CreateApiClient';
import type { ApiWarned, ApiWarning } from './models/ApiWarning';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Reads one warning; `null` when a required member is not text. */
function toWarning(value: unknown): ApiWarning | null {
  if (!isRecord(value)) return null;
  const { property, message, code, severity } = value;
  if (typeof property !== 'string' || typeof message !== 'string' || typeof code !== 'string') return null;
  return { property, message, code, severity: typeof severity === 'string' ? severity : 'warning' };
}

/**
 * Builds a decoder for a `{ data, warnings }` success envelope — the backend SDK's `ApiResponse<T>.Ok(data, warnings)`.
 * Request it with `unwrap: false`, so the decoder sees the whole envelope; a missing `warnings` reads as none.
 * ```ts
 * client.post('/api/codes', { body, unwrap: false, decode: decodeWarned(decodeCode) });
 * ```
 */
export function decodeWarned<T>(decodeData: ApiDecoder<T>): ApiDecoder<ApiWarned<T>> {
  return (value) => {
    if (!isRecord(value) || !Object.hasOwn(value, 'data'))
      return ResultExtensions.fail(ApiFailureFactory.create('protocol'));
    const raw = value['warnings'] ?? [];
    if (!Array.isArray(raw)) return ResultExtensions.fail(ApiFailureFactory.create('protocol'));
    const warnings = raw.map(toWarning);
    if (warnings.some((warning) => warning === null))
      return ResultExtensions.fail(ApiFailureFactory.create('protocol'));
    const data = decodeData(value['data']);
    return data.ok ? ResultExtensions.ok({ data: data.value, warnings: warnings as ReadonlyArray<ApiWarning> }) : data;
  };
}
