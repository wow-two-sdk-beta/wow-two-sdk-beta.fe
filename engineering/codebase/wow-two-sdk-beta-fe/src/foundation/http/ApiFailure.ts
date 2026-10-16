import { AppErrorFactory, type AppError } from '../results';

export const ApiFailureCode = {
  Http: 'http',
  Transport: 'transport',
  Cancelled: 'cancelled',
  Timeout: 'timeout',
  Protocol: 'protocol',
  Validation: 'validation',
} as const;
export type ApiFailureCode = (typeof ApiFailureCode)[keyof typeof ApiFailureCode];

/** Identifies the request behind a failure — what a report or a log line names it by. */
export interface ApiFailureRequest {
  /** The upper-case HTTP method. */
  readonly method: string;
  /** The requested URL without its query or fragment — the endpoint, never its parameters or credentials. */
  readonly url: string;
}

/** A display-safe failure with transport diagnostics kept separately. */
export interface ApiFailure extends AppError {
  readonly code: ApiFailureCode;
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  /** Unvalidated response diagnostics; numeric values follow the configured JSON codec. */
  readonly problem: Readonly<Record<string, unknown>> | null;
  /** The request that failed; absent when the client never reached the transport. */
  readonly request?: ApiFailureRequest;
}
export const ApiFailureFactory = {
  create(
    code: ApiFailureCode,
    response?: Pick<Response, 'status' | 'headers'>,
    problem: Readonly<Record<string, unknown>> | null = null,
  ): ApiFailure {
    const status = response?.status ?? 0;
    const error =
      code === 'cancelled'
        ? AppErrorFactory.cancelled()
        : code === 'timeout'
          ? AppErrorFactory.timeout()
          : code === 'validation'
            ? AppErrorFactory.validation()
            : status === 401
              ? AppErrorFactory.unauthorized()
              : status === 403
                ? AppErrorFactory.forbidden()
                : status === 404
                  ? AppErrorFactory.notFound()
                  : status === 409
                    ? AppErrorFactory.conflict()
                    : code === 'transport'
                      ? AppErrorFactory.unavailable()
                      : AppErrorFactory.unexpected();
    return { ...error, code, status, headers: Object.fromEntries(response?.headers.entries() ?? []), problem };
  },
} as const;
