import { isErrorLike, serializeError } from '../foundation/errors';
import { ApiError, type ApiFailureRequest } from '../foundation/http';
import { redactContext } from '../foundation/logger';
import type { ReportedError } from './IncidentReport';

/** The response headers a server's request id travels in, most specific first. */
const RequestIdHeaders = ['x-request-id', 'request-id', 'x-correlation-id'] as const;

/** A W3C `traceparent` / `traceresponse` value — version, 32-hex trace id, 16-hex span id, flags. */
const TraceParent = /^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/iu;

/** Reads the trace id out of a W3C trace-context value, or keeps a bare id as given. */
export function toTraceId(value: string): string {
  return TraceParent.exec(value.trim())?.[1]?.toLowerCase() ?? value.trim();
}

/** Reads a request id from response headers, whichever of the common names carries it. */
export function readRequestId(headers: Readonly<Record<string, string>>): string | undefined {
  for (const name of RequestIdHeaders) {
    const value = headers[name];
    if (value) return value;
  }
  return undefined;
}

/** Reads a trace id from response headers — `traceresponse`, then the `x-trace-id` convention. */
export function readTraceId(headers: Readonly<Record<string, string>>): string | undefined {
  const value = headers.traceresponse ?? headers['x-trace-id'];
  return value ? toTraceId(value) : undefined;
}

/** A failure as the reporter reads it — an `ApiFailure` or `AppError` shape, every member optional. */
interface FailureShape {
  readonly type: string;
  readonly message: string;
  readonly code?: unknown;
  readonly status?: unknown;
  readonly headers?: unknown;
  readonly problem?: unknown;
  readonly metadata?: unknown;
  readonly request?: unknown;
}

/** Recognizes the plain `AppError` family — a string `type` and `message` on a non-`Error` object. */
function isFailureShape(value: unknown): value is FailureShape {
  if (value === null || typeof value !== 'object' || value instanceof Error) return false;
  const { type, message } = value as { type?: unknown; message?: unknown };
  return typeof type === 'string' && typeof message === 'string';
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringMember(source: Readonly<Record<string, unknown>> | undefined, key: string): string | undefined {
  const value = source?.[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** Narrows the request an `ApiFailure` carries. */
export function failureRequest(error: unknown): ApiFailureRequest | undefined {
  const failure = error instanceof ApiError ? error.failure : error;
  if (!isFailureShape(failure) || !isRecord(failure.request)) return undefined;
  const { method, url } = failure.request;
  return typeof method === 'string' && typeof url === 'string' ? { method, url } : undefined;
}

/** Normalizes an `AppError` / `ApiFailure`, reading its ids from the problem details before the headers. */
function describeFailure(failure: FailureShape, redactKeys: ReadonlyArray<string>, stack?: string): ReportedError {
  const headers = isRecord(failure.headers) ? (failure.headers as Readonly<Record<string, string>>) : {};
  const problem = isRecord(failure.problem) ? failure.problem : undefined;
  const problemTrace = stringMember(problem, 'traceId');
  const traceId = problemTrace ? toTraceId(problemTrace) : readTraceId(headers);
  const requestId = stringMember(problem, 'requestId') ?? readRequestId(headers);
  const isApiFailure = typeof failure.status === 'number' && 'problem' in failure;
  return {
    name: isApiFailure ? 'ApiFailure' : 'AppError',
    message: failure.message,
    type: failure.type,
    ...(typeof failure.code === 'string' || typeof failure.code === 'number' ? { code: failure.code } : {}),
    ...(typeof failure.status === 'number' && failure.status > 0 ? { status: failure.status } : {}),
    ...(traceId ? { traceId } : {}),
    ...(requestId ? { requestId } : {}),
    ...(problem ? { problem: redactContext(problem, redactKeys) } : {}),
    ...(isRecord(failure.metadata) ? { metadata: redactContext(failure.metadata, redactKeys) } : {}),
    ...(stack ? { stack } : {}),
  };
}

/**
 * Normalizes whatever failed into a `ReportedError` — an `ApiError` or `ApiFailure` keeps its status, ids and
 * redacted problem details; a thrown error keeps its stack and `cause` chain. Never throws.
 */
export function describeError(error: unknown, redactKeys: ReadonlyArray<string>): ReportedError {
  try {
    if (error instanceof ApiError) return describeFailure(error.failure, redactKeys, error.stack);
    if (isFailureShape(error)) return describeFailure(error, redactKeys);
    if (isErrorLike(error)) {
      const serialized = serializeError(error);
      return {
        name: serialized.name,
        message: serialized.message,
        ...(serialized.code !== undefined ? { code: serialized.code } : {}),
        ...(serialized.stack ? { stack: serialized.stack } : {}),
        ...(serialized.cause ? { cause: serialized.cause } : {}),
      };
    }
    return { name: 'Error', message: typeof error === 'string' ? error : String(error) };
  } catch {
    return { name: 'Error', message: 'An unreadable value was thrown.' };
  }
}
