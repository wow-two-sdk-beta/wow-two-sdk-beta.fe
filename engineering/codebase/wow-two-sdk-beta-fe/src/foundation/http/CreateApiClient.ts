import { isAbortError, isTimeoutError } from '../errors';
import { computeRetryDelay, shouldRetry, type RetryPolicy } from '../resilience';
import { ResultExtensions, type Result } from '../results';
import { AntiforgeryDefaults, AntiforgeryExtensions, type ApiAntiforgeryOptions } from './Antiforgery';
import { ApiError } from './ApiError';
import type { ApiJsonCodec } from './ApiJsonCodec';
import { ApiFailureFactory, type ApiFailure } from './ApiFailure';
import { wowTwoEnvelope, type ResponseEnvelope } from './Envelope';
import { awaitRequest, combineRequestSignals, type RequestScope, type RequestSnapshot } from './RequestScope';

export type ApiQueryParams = Record<string, unknown>;
export type ApiDecoder<T> = (value: unknown) => Result<T, ApiFailure>;
export interface ApiRequestInit {
  readonly query?: ApiQueryParams;
  readonly body?: unknown;
  readonly signal?: AbortSignal | null;
  readonly headers?: HeadersInit;
  readonly unwrap?: boolean;
  readonly method?: string;
  /** Overrides the client's JSON codec for this request. `null` selects native JSON. */
  readonly json?: ApiJsonCodec | null;
}
export interface ApiEmptyRequestInit extends ApiRequestInit {
  readonly response: 'empty';
}
export interface ApiTextRequestInit extends ApiRequestInit {
  readonly response: 'text';
}
export interface ApiBlobRequestInit extends ApiRequestInit {
  readonly response: 'blob';
}
export interface ApiArrayBufferRequestInit extends ApiRequestInit {
  readonly response: 'arrayBuffer';
}
export interface ApiJsonRequestInit<T> extends ApiRequestInit {
  readonly response?: 'json';
  readonly decode: ApiDecoder<T>;
}
export interface ApiClientOptions {
  readonly baseUrl?: string;
  readonly getAuthToken?: () => string | null | Promise<string | null>;
  readonly credentials?: RequestCredentials;
  readonly onUnauthorized?: (failure: ApiFailure, origin?: RequestSnapshot) => void;
  /** Explicit session lifetime; captures once before credentials, retries and response decoding. */
  readonly scope?: RequestScope;
  readonly defaultHeaders?: HeadersInit;
  readonly envelope?: ResponseEnvelope;
  readonly retry?: RetryPolicy | false;
  readonly fetch?: typeof globalThis.fetch;
  /** Overrides request/response JSON conversion, including non-success diagnostics. Native JSON is the default. */
  readonly json?: ApiJsonCodec;
  /** Echoes the readable antiforgery cookie on unsafe requests, refreshing a stale token once when a path is given. */
  readonly antiforgery?: ApiAntiforgeryOptions;
}
/** Typed payloads require a decoder; an empty response must be requested explicitly. */
export interface ApiMethod {
  (path: string, init: ApiEmptyRequestInit): Promise<Result<void, ApiFailure>>;
  (path: string, init: ApiTextRequestInit): Promise<Result<string, ApiFailure>>;
  (path: string, init: ApiBlobRequestInit): Promise<Result<Blob, ApiFailure>>;
  (path: string, init: ApiArrayBufferRequestInit): Promise<Result<ArrayBuffer, ApiFailure>>;
  <T>(path: string, init: ApiJsonRequestInit<T>): Promise<Result<T, ApiFailure>>;
  (path: string, init?: ApiRequestInit): Promise<Result<unknown, ApiFailure>>;
}
/** A decoded successful response together with immutable metadata at the integration edge. */
export interface ApiResponseValue<T> {
  readonly value: T;
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly url: string;
}
/** Detailed response overloads preserve each payload type without exposing a consumed Response body. */
export interface ApiDetailedMethod {
  (path: string, init: ApiEmptyRequestInit): Promise<Result<ApiResponseValue<void>, ApiFailure>>;
  (path: string, init: ApiTextRequestInit): Promise<Result<ApiResponseValue<string>, ApiFailure>>;
  (path: string, init: ApiBlobRequestInit): Promise<Result<ApiResponseValue<Blob>, ApiFailure>>;
  (path: string, init: ApiArrayBufferRequestInit): Promise<Result<ApiResponseValue<ArrayBuffer>, ApiFailure>>;
  <T>(path: string, init: ApiJsonRequestInit<T>): Promise<Result<ApiResponseValue<T>, ApiFailure>>;
  (path: string, init?: ApiRequestInit): Promise<Result<ApiResponseValue<unknown>, ApiFailure>>;
}
export interface ApiDetailedClient {
  readonly get: ApiDetailedMethod;
  readonly post: ApiDetailedMethod;
  readonly put: ApiDetailedMethod;
  readonly patch: ApiDetailedMethod;
  readonly delete: ApiDetailedMethod;
  readonly request: ApiDetailedMethod;
}
export interface ApiClient {
  readonly detailed: ApiDetailedClient;
  readonly get: ApiMethod;
  readonly post: ApiMethod;
  readonly put: ApiMethod;
  readonly patch: ApiMethod;
  readonly delete: ApiMethod;
  readonly request: ApiMethod;
}
interface RequestOptions extends ApiRequestInit {
  readonly response?: 'json' | 'empty' | 'text' | 'blob' | 'arrayBuffer';
  readonly decode?: ApiDecoder<unknown>;
}
function buildQueryString(query: ApiQueryParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item != null) params.append(key, String(item));
    }
  }
  return params.toString();
}
function interruption(signal?: AbortSignal | null, error?: unknown): ApiFailure | undefined {
  if (isTimeoutError(error) || (signal?.aborted && isTimeoutError(signal.reason)))
    return ApiFailureFactory.create('timeout');
  if (signal?.aborted || isAbortError(error)) return ApiFailureFactory.create('cancelled');
  return undefined;
}
/** Wakes immediately on cancellation; the request loop returns its typed outcome. */
function wait(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const finish = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener('abort', finish, { once: true });
  });
}
/** Returns expected transport/protocol failures; application decoder bugs still throw. */
export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const {
    baseUrl = '',
    getAuthToken,
    credentials,
    defaultHeaders,
    envelope = wowTwoEnvelope,
    retry = false,
    antiforgery,
  } = options;
  /** Reads the antiforgery refresh path once, so a stale token is replaced before the one retry. */
  const refreshAntiforgery = async (signal: AbortSignal): Promise<void> => {
    if (!antiforgery?.refreshPath) return;
    try {
      await awaitRequest(
        () =>
          (options.fetch ?? globalThis.fetch)(`${baseUrl}${antiforgery.refreshPath}`, {
            method: 'GET',
            cache: 'no-store',
            signal,
            ...(credentials !== undefined ? { credentials } : {}),
          }),
        signal,
      );
    } catch {
      // The retry reports the outcome; a failed refresh leaves the rejection to surface.
    }
  };
  const attemptOnce = async (
    url: string,
    init: RequestOptions,
    body: BodyInit | undefined,
    hasJsonBody: boolean,
    json: ApiJsonCodec | undefined,
    token: string | null,
  ): Promise<Result<ApiResponseValue<unknown>, ApiFailure>> => {
    const cancelled = interruption(init.signal);
    if (cancelled) return ResultExtensions.fail(cancelled);
    const headers = new Headers({
      Accept: init.response === undefined || init.response === 'json' ? 'application/json' : '*/*',
    });
    if (hasJsonBody) headers.set('Content-Type', 'application/json');
    if (defaultHeaders) new Headers(defaultHeaders).forEach((value, key) => headers.set(key, value));
    if (token != null) headers.set('Authorization', `Bearer ${token}`);
    if (antiforgery && AntiforgeryExtensions.isUnsafe(init.method)) {
      const xsrf = AntiforgeryExtensions.readToken(antiforgery.cookieName ?? AntiforgeryDefaults.cookieName);
      if (xsrf != null) headers.set(antiforgery.headerName ?? AntiforgeryDefaults.headerName, xsrf);
    }
    if (init.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    let response: Response;
    try {
      response = await awaitRequest(
        () =>
          (options.fetch ?? globalThis.fetch)(url, {
            method: init.method ?? 'GET',
            headers,
            signal: init.signal ?? null,
            ...(credentials !== undefined ? { credentials } : {}),
            ...(body !== undefined ? { body } : {}),
          }),
        init.signal,
      );
    } catch (error) {
      return ResultExtensions.fail(interruption(init.signal, error) ?? ApiFailureFactory.create('transport'));
    }
    const success = (value: unknown): Result<ApiResponseValue<unknown>, ApiFailure> =>
      ResultExtensions.ok({
        value,
        status: response.status,
        headers: Object.freeze(Object.fromEntries(response.headers)),
        url: response.url,
      });
    if (!response.ok) {
      let diagnostics: unknown;
      let diagnosticText = '';
      try {
        diagnosticText = await awaitRequest(() => response.text(), init.signal);
      } catch (error) {
        const aborted = interruption(init.signal, error);
        if (aborted) return ResultExtensions.fail(aborted);
        // Reading optional diagnostics must not hide the HTTP status.
      }
      if (diagnosticText !== '') {
        if (json) {
          const decoded = json.parse(diagnosticText);
          if (decoded.ok) diagnostics = decoded.value;
        } else {
          try {
            diagnostics = JSON.parse(diagnosticText);
          } catch {
            /* Malformed optional diagnostics do not change the HTTP failure. */
          }
        }
      }
      const aborted = interruption(init.signal);
      return ResultExtensions.fail(aborted ?? envelope.toFailure(diagnostics, response));
    }
    if (init.response === 'blob' || init.response === 'arrayBuffer') {
      try {
        const value = await awaitRequest<Blob | ArrayBuffer>(
          () => (init.response === 'blob' ? response.blob() : response.arrayBuffer()),
          init.signal,
        );
        const aborted = interruption(init.signal);
        return aborted ? ResultExtensions.fail(aborted) : success(value);
      } catch (error) {
        return ResultExtensions.fail(
          interruption(init.signal, error) ?? ApiFailureFactory.create('transport', response),
        );
      }
    }
    let text: string;
    try {
      text = await awaitRequest(() => response.text(), init.signal);
    } catch (error) {
      return ResultExtensions.fail(interruption(init.signal, error) ?? ApiFailureFactory.create('transport', response));
    }
    const aborted = interruption(init.signal);
    if (aborted) return ResultExtensions.fail(aborted);
    if (init.response === 'empty')
      return text === '' ? success(undefined) : ResultExtensions.fail(ApiFailureFactory.create('protocol', response));
    if (init.response === 'text') return success(text);
    if (text === '' || !/^application\/(?:[\w.-]+\+)?json(?:;|$)/i.test(response.headers.get('Content-Type') ?? ''))
      return ResultExtensions.fail(ApiFailureFactory.create('protocol', response));
    let parsed: unknown;
    if (json) {
      const decoded = json.parse(text);
      const interrupted = interruption(init.signal);
      if (interrupted) return ResultExtensions.fail(interrupted);
      if (!decoded.ok) return ResultExtensions.fail(ApiFailureFactory.create('protocol', response));
      parsed = decoded.value;
    } else {
      try {
        parsed = JSON.parse(text);
      } catch {
        return ResultExtensions.fail(ApiFailureFactory.create('protocol', response));
      }
    }
    const payload = init.unwrap === false ? ResultExtensions.ok(parsed) : envelope.unwrap(parsed, response);
    if (!payload.ok) return payload;
    const decoded = init.decode ? init.decode(payload.value) : payload;
    const interrupted = interruption(init.signal);
    return interrupted ? ResultExtensions.fail(interrupted) : decoded.ok ? success(decoded.value) : decoded;
  };
  /** Sends one attempt and tags its failure with the endpoint, so a report or log names it without the transport. */
  const attempt = async (
    url: string,
    init: RequestOptions,
    body: BodyInit | undefined,
    hasJsonBody: boolean,
    json: ApiJsonCodec | undefined,
    token: string | null,
  ): Promise<Result<ApiResponseValue<unknown>, ApiFailure>> => {
    const result = await attemptOnce(url, init, body, hasJsonBody, json, token);
    if (result.ok) return result;
    const request = { method: (init.method ?? 'GET').toUpperCase(), url: url.split(/[?#]/u)[0] ?? url };
    return ResultExtensions.fail({ ...result.failure, request });
  };
  const execute = async (
    path: string,
    requested: RequestOptions,
  ): Promise<Result<ApiResponseValue<unknown>, ApiFailure>> => {
    const origin = options.scope?.capture();
    const combined = combineRequestSignals(requested.signal, origin?.signal);
    const init = { ...requested, signal: combined.signal };
    try {
      const cancelled = interruption(init.signal);
      if (cancelled) return ResultExtensions.fail(cancelled);
      const query = init.query ? buildQueryString(init.query) : '';
      const url = `${baseUrl}${path}${query ? (path.includes('?') ? '&' : '?') + query : ''}`;
      const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
      const json = init.json === undefined ? options.json : (init.json ?? undefined);
      let body: BodyInit | undefined;
      if (init.body !== undefined && !isFormData && json) {
        const encoded = json.stringify(init.body);
        const interrupted = interruption(init.signal);
        if (interrupted) return ResultExtensions.fail(interrupted);
        if (!encoded.ok) return ResultExtensions.fail(ApiFailureFactory.create('validation'));
        body = encoded.value;
      } else
        body = init.body === undefined ? undefined : isFormData ? (init.body as FormData) : JSON.stringify(init.body);
      let token: string | null;
      try {
        token = getAuthToken ? await awaitRequest(getAuthToken, init.signal) : null;
      } catch (error) {
        const aborted = interruption(init.signal, error);
        if (aborted) return ResultExtensions.fail(aborted);
        throw error;
      }
      let retries = 0;
      let previousDelayMs = 0;
      let refreshedAntiforgery = false;
      for (;;) {
        const result = await attempt(url, init, body, init.body !== undefined && !isFormData, json, token);
        const aborted = interruption(init.signal);
        if (aborted) return ResultExtensions.fail(aborted);
        if (result.ok) return result;
        const failure = result.failure;
        if (
          antiforgery?.refreshPath &&
          !refreshedAntiforgery &&
          AntiforgeryExtensions.isUnsafe(init.method) &&
          (antiforgery.isRejection ?? AntiforgeryExtensions.isRejection)(failure)
        ) {
          refreshedAntiforgery = true;
          await refreshAntiforgery(init.signal);
          const interrupted = interruption(init.signal);
          if (interrupted) return ResultExtensions.fail(interrupted);
          continue;
        }
        const retryable = failure.code === 'http' || failure.code === 'transport';
        const idempotent = ['GET', 'HEAD', 'OPTIONS'].includes((init.method ?? 'GET').toUpperCase());
        if (retry !== false && retryable && idempotent && shouldRetry(retry, retries, failure.status)) {
          const attemptNumber = retries + 1;
          const delayMs = computeRetryDelay(retry, attemptNumber, previousDelayMs);
          retry.onRetry?.({ attempt: attemptNumber, error: new ApiError(failure), status: failure.status, delayMs });
          await wait(delayMs, init.signal);
          retries = attemptNumber;
          previousDelayMs = delayMs;
          continue;
        }
        if (failure.status === 401 && (!origin || origin.isCurrent())) options.onUnauthorized?.(failure, origin);
        return result;
      }
    } finally {
      combined.dispose();
    }
  };
  const detailedMethod = (verb?: string): ApiDetailedMethod => {
    const send = (path: string, init: RequestOptions = {}) => execute(path, verb ? { ...init, method: verb } : init);
    return send as ApiDetailedMethod;
  };
  const method = (verb?: string): ApiMethod => {
    function send(path: string, init: ApiEmptyRequestInit): Promise<Result<void, ApiFailure>>;
    function send(path: string, init: ApiTextRequestInit): Promise<Result<string, ApiFailure>>;
    function send(path: string, init: ApiBlobRequestInit): Promise<Result<Blob, ApiFailure>>;
    function send(path: string, init: ApiArrayBufferRequestInit): Promise<Result<ArrayBuffer, ApiFailure>>;
    function send<T>(path: string, init: ApiJsonRequestInit<T>): Promise<Result<T, ApiFailure>>;
    function send(path: string, init?: ApiRequestInit): Promise<Result<unknown, ApiFailure>>;
    function send(path: string, init: RequestOptions = {}): Promise<Result<unknown, ApiFailure>> {
      return execute(path, verb ? { ...init, method: verb } : init).then((result) =>
        result.ok ? ResultExtensions.ok(result.value.value) : result,
      );
    }
    return send;
  };
  return {
    detailed: {
      request: detailedMethod(),
      get: detailedMethod('GET'),
      post: detailedMethod('POST'),
      put: detailedMethod('PUT'),
      patch: detailedMethod('PATCH'),
      delete: detailedMethod('DELETE'),
    },
    request: method(),
    get: method('GET'),
    post: method('POST'),
    put: method('PUT'),
    patch: method('PATCH'),
    delete: method('DELETE'),
  };
}
