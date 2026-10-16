import { ApiFailureFactory, type ApiFailure } from './ApiFailure';

/** Exception bridge for third-party APIs whose protocol requires rejection. */
export class ApiError extends Error {
  readonly failure: ApiFailure;
  readonly status: number;
  /** Unvalidated response diagnostics; numeric values follow the configured JSON codec. */
  readonly problem: Readonly<Record<string, unknown>> | null;

  constructor(failure: ApiFailure);
  constructor(status: number, problem: Readonly<Record<string, unknown>> | null);
  constructor(input: ApiFailure | number, problem: Readonly<Record<string, unknown>> | null = null) {
    const failure =
      typeof input === 'number'
        ? ApiFailureFactory.create(
            input === 0 ? 'transport' : 'http',
            { status: input, headers: new Headers() },
            problem,
          )
        : input;
    super(failure.message);
    this.name = 'ApiError';
    this.failure = failure;
    this.status = failure.status;
    this.problem = failure.problem;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
