import type { Result } from './models/Result';

/** Builds and transforms completed operation outcomes. */
export const ResultExtensions = {
  /** Creates a success, including a void success. */
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },
  /** Creates an expected failure. */
  fail<F>(failure: F): Result<never, F> {
    return { ok: false, failure };
  },
  /** Narrows to the successful branch. */
  isOk<T, F>(result: Result<T, F>): result is { readonly ok: true; readonly value: T } {
    return result.ok;
  },
  /** Narrows to the failed branch. */
  isFail<T, F>(result: Result<T, F>): result is { readonly ok: false; readonly failure: F } {
    return !result.ok;
  },
  /** Transforms a success; mapper errors remain exceptional. */
  map<T, U, F>(result: Result<T, F>, map: (value: T) => U): Result<U, F> {
    return result.ok ? { ok: true, value: map(result.value) } : result;
  },
  /** Transforms a failure; mapper errors remain exceptional. */
  mapFailure<T, F, G>(result: Result<T, F>, map: (failure: F) => G): Result<T, G> {
    return result.ok ? result : { ok: false, failure: map(result.failure) };
  },
  /** Resolves both branches explicitly. */
  match<T, F, U>(
    result: Result<T, F>,
    branches: { readonly ok: (value: T) => U; readonly fail: (failure: F) => U },
  ): U {
    return result.ok ? branches.ok(result.value) : branches.fail(result.failure);
  },
  /** Reads a successful value or the caller's explicit fallback. */
  unwrapOr<T, F>(result: Result<T, F>, fallback: T): T {
    return result.ok ? result.value : fallback;
  },
  /** Adapts expected third-party throws; return undefined to preserve a programmer error. */
  fromThrowing<T, F>(run: () => T, toFailure: (error: unknown) => F | undefined): Result<T, F> {
    try {
      return { ok: true, value: run() };
    } catch (error) {
      const failure = toFailure(error);
      if (failure === undefined) throw error;
      return { ok: false, failure };
    }
  },
  /** Adapts expected rejections; return undefined to preserve a programmer error. */
  async fromPromise<T, F>(run: () => Promise<T>, toFailure: (error: unknown) => F | undefined): Promise<Result<T, F>> {
    try {
      return { ok: true, value: await run() };
    } catch (error) {
      const failure = toFailure(error);
      if (failure === undefined) throw error;
      return { ok: false, failure };
    }
  },
} as const;
